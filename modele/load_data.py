import mysql.connector
import os
import sys

# Constants for DB connection (Duplicate of config but simple)
DB_CONFIG = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': '',
    'database': 'emploi_du_temps'
}

def load_data(input_file=None, K=35, days_info=None, time_slots_info=None):
    """
    Charge les données depuis la Base de Données.
    L'argument 'input_file' est conservé pour la rétrocompatibilité mais ignoré.
    """
    print(f"Chargement des données depuis la base de données (K={K})...")

    conn = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
    except Exception as e:
        print(f"Erreur de connexion BDD: {e}")
        raise e

    # 1. Modules (J)
    cursor.execute("SELECT id, code, name FROM subjects ORDER BY id")
    subjects = cursor.fetchall()
    Matieres_names = [s['name'] for s in subjects]
    Matiere_Code_Map = {str(s['code']).strip(): idx for idx, s in enumerate(subjects)}
    Matiere_Codes = [str(s['code']).strip() for s in subjects]
    J = len(subjects)
    
    # 2. Groupes (G)
    cursor.execute("SELECT * FROM `groups` ORDER BY id")
    all_groups = cursor.fetchall()
    
    groups_principale = [g for g in all_groups if g['type'] in ('principale', 'langues && ppp')]
    Groupes_names_principale = [g['name'] for g in groups_principale]
    Group_Id_Map = {str(g['id']).strip(): idx for idx, g in enumerate(groups_principale)}
    Group_Id_To_Index = {g['id']: idx for idx, g in enumerate(groups_principale)}
    
    # Sous-Groupes (TD, Specialite, Languages)
    # Note: Languages are in both to support CM (as main) and TD/TP (as sub)
    groups_td = [g for g in all_groups if g['type'] in ('TD', 'specialite', 'langues && ppp')]
    Sous_Groupes_names = [g['name'] for g in groups_td]
    Sous_Group_Id_Map = {str(g['id']).strip(): idx for idx, g in enumerate(groups_td)}
    Sous_Group_Id_To_Index = {g['id']: idx for idx, g in enumerate(groups_td)}
    
    # Référence Parent
    Sous_Group_Reference_Group = {} # SubId -> ParentId
    # Build a lookup for parent IDs
    id_to_id_str = {g['id']: str(g['id']).strip() for g in all_groups}

    for g in groups_td:
        sub_id_str = str(g['id']).strip()
        sem_id = g['semester_id']
        g_type = g['type']
        
        if g_type in ('specialite', 'langues && ppp'):
            # These groups spread across all students of the semester
            # We ONLY link them to groups of type 'principale', not other 'langues && ppp'
            parent_ids = [str(pg['id']).strip() for pg in groups_principale if pg['type'] == 'principale' and pg['semester_id'] == sem_id]
            if parent_ids:
                Sous_Group_Reference_Group[sub_id_str] = ",".join(parent_ids)
        
        # 2. Regular Parenting (for TD etc.)
        elif g['parent_group_id'] and g['parent_group_id'] in id_to_id_str:
            parent_id_str = id_to_id_str[g['parent_group_id']]
            Sous_Group_Reference_Group[sub_id_str] = parent_id_str

    GP = len(groups_principale)
    GT = len(groups_td)

    # Semester Mapping
    Semester_Of_Group = {}
    cursor.execute("SELECT id, name FROM semesters")
    semesters = {s['id']: s['name'] for s in cursor.fetchall()} # 1->'S1'
    
    for idx, g in enumerate(groups_principale):
        sem_id = g['semester_id']
        sem_val = 0
        if sem_id and sem_id in semesters:
            sem_name = semesters[sem_id]
            # Extract number from 'S1'
            if sem_name.startswith('S'):
                try: sem_val = int(sem_name[1:])
                except: sem_val = 0
        Semester_Of_Group[idx] = sem_val

    # 3. Professeurs (I)
    cursor.execute("SELECT id, name FROM professors ORDER BY id") # Order by id is critical if previously relied on order
    # Note: If ids are [1, 5, 10], index should map 0, 1, 2.
    profs = cursor.fetchall()
    Profs_names = [p['name'] for p in profs]
    Prof_Code_Map = {str(p['id']): idx for idx, p in enumerate(profs)}
    Prof_Id_To_Index = {p['id']: idx for idx, p in enumerate(profs)}
    I = len(profs)

    # 4. Matrices des Charges (Pcm, Ptp, Ptd)
    Pcm = [[0]*GP for _ in range(J)]
    Ptp = [[0]*GT for _ in range(J)]
    Ptd = [[0]*GT for _ in range(J)]

    # Fetch workloads
    cursor.execute("SELECT * FROM course_workloads")
    workloads = cursor.fetchall()

    # Pre-process workloads into a lookup: subject_id -> {group_id -> {cm, tp, td}}
    # handle group_id=None as 'DEFAULT'
    Workload_Map = {} 
    
    # Map Subject IDs to Matrix Indices
    Subj_Id_To_Index = {s['id']: idx for idx, s in enumerate(subjects)}

    for w in workloads:
        sid = w['subject_id']
        gid = w['group_id']
        if sid not in Workload_Map: Workload_Map[sid] = {}
        key = gid if gid else 'DEFAULT'
        Workload_Map[sid][key] = {
            'CM': w['cm_hours'], 
            'TP': w['tp_hours'], 
            'TD': w['td_hours'], 
            'ONL_CM': w.get('cm_online', 0),
            'ONL_TD': w.get('td_online', 0),
            'ONL_TP': w.get('tp_online', 0)
        }

    # Initialize Pon (Online Main), Son_td (Online TD), Son_tp (Online TP)
    Pon = [[0]*GP for _ in range(J)]
    Son_td = [[0]*GT for _ in range(J)]
    Son_tp = [[0]*GT for _ in range(J)]
    
    # Fill Online Workloads directly from Map
    for sid, groups_map in Workload_Map.items():
        if sid not in Subj_Id_To_Index: continue
        j = Subj_Id_To_Index[sid]
        
        for gid, charges in groups_map.items():
            if gid == 'DEFAULT': continue
            
            # 1. Online CM -> Pon
            onl_cm = charges.get('ONL_CM', 0)
            if onl_cm > 0:
                if gid in Group_Id_To_Index:
                    Pon[j][Group_Id_To_Index[gid]] = onl_cm
            
            # 2. Online TD -> Son_td
            onl_td = charges.get('ONL_TD', 0)
            if onl_td > 0:
                if gid in Sous_Group_Id_To_Index:
                    Son_td[j][Sous_Group_Id_To_Index[gid]] = onl_td
                elif gid in Group_Id_To_Index:
                     for idx, sub_g in enumerate(groups_td):
                         if sub_g['parent_group_id'] == gid:
                             Son_td[j][idx] = onl_td

            # 3. Online TP -> Son_tp
            onl_tp = charges.get('ONL_TP', 0)
            if onl_tp > 0:
                if gid in Sous_Group_Id_To_Index:
                    Son_tp[j][Sous_Group_Id_To_Index[gid]] = onl_tp
                elif gid in Group_Id_To_Index:
                     for idx, sub_g in enumerate(groups_td):
                         if sub_g['parent_group_id'] == gid:
                             Son_tp[j][idx] = onl_tp

    # 5. Affectations (Ccm, Ctp, Ctd)
    Ccm = [[] for _ in range(I)]
    Ctp = [[] for _ in range(I)]
    Ctd = [[] for _ in range(I)]
    
    # ProCM, ProTP, ProTD lists for export
    ProCM = [[] for _ in range(J)]
    ProTP = [[] for _ in range(J)]
    ProTD = [[] for _ in range(J)]

    cursor.execute("SELECT * FROM teacher_assignments")
    assignments = cursor.fetchall()
    
    for row in assignments:
        pid_db = row['professor_id']
        sid_db = row['subject_id']
        gid_db = row['group_id']
        atype = str(row['type']).upper().strip()
        
        if pid_db not in Prof_Id_To_Index or sid_db not in Subj_Id_To_Index:
            continue
            
        i = Prof_Id_To_Index[pid_db]
        j = Subj_Id_To_Index[sid_db]
        prof_name = Profs_names[i]

        # Get charges
        w_map = Workload_Map.get(sid_db, {})
        charges = w_map.get(gid_db, w_map.get('DEFAULT', {'CM':0, 'TP':0, 'TD':0, 'ONL':0}))
        
        # --- LOGIC REPLICATION ---
        
        if 'CM' in atype:
            if gid_db in Group_Id_To_Index:
                g = Group_Id_To_Index[gid_db]
                if (j, g) not in Ccm[i]:
                     Ccm[i].append((j, g))
                     Pcm[j][g] = charges['CM']
                     
                if prof_name not in ProCM[j]: ProCM[j].append(prof_name)
                
                # OPTIONAL: Propagation logic for 'L1', 'L2' etc.
                group_name = Groupes_names_principale[g]
                if group_name.startswith('L') and len(group_name) >= 2:
                     target_sem = Semester_Of_Group.get(g)
                     # Apply to other groups in same semester
                     for other_g, sem in Semester_Of_Group.items():
                         if sem == target_sem and other_g != g:
                             if (j, other_g) not in Ccm[i]:
                                 Ccm[i].append((j, other_g))
                             # load other group charge
                             other_gid = groups_principale[other_g]['id']
                             other_charges = w_map.get(other_gid, w_map.get('DEFAULT', {'CM':0, 'TP':0, 'TD':0}))
                             Pcm[j][other_g] = other_charges['CM']

        if 'TP' in atype:
             if gid_db in Sous_Group_Id_To_Index:
                 g = Sous_Group_Id_To_Index[gid_db]
                 if (j, g) not in Ctp[i]:
                     Ctp[i].append((j, g))
                     Ptp[j][g] = charges['TP']
                 if prof_name not in ProTP[j]: ProTP[j].append(prof_name)

             elif gid_db in Group_Id_To_Index:
                 parent_g_idx = Group_Id_To_Index[gid_db]
                 target_sub_indices = []
                 for idx, sub_g in enumerate(groups_td):
                     if sub_g['parent_group_id'] == gid_db:
                         target_sub_indices.append(idx)
                 
                 for g in target_sub_indices:
                     if (j, g) not in Ctp[i]:
                         Ctp[i].append((j, g))
                     sub_gid = groups_td[g]['id']
                     sg_charges = w_map.get(sub_gid, charges)
                     Ptp[j][g] = sg_charges['TP']
                     if prof_name not in ProTP[j]: ProTP[j].append(prof_name)

                 group_name = Groupes_names_principale[parent_g_idx]
                 if group_name.startswith('L'):
                     target_sem = Semester_Of_Group.get(parent_g_idx)
                     for other_g_idx, sem in Semester_Of_Group.items():
                         if sem == target_sem:
                             other_gid = groups_principale[other_g_idx]['id']
                             for idx, sub_g in enumerate(groups_td):
                                 if sub_g['parent_group_id'] == other_gid:
                                     if (j, idx) not in Ctp[i]:
                                         Ctp[i].append((j, idx))
                                     sg_charges = w_map.get(sub_g['id'], charges)
                                     Ptp[j][idx] = sg_charges['TP']
                                     if prof_name not in ProTP[j]: ProTP[j].append(prof_name)

        if 'TD' in atype:
             if gid_db in Sous_Group_Id_To_Index:
                 g = Sous_Group_Id_To_Index[gid_db]
                 if (j, g) not in Ctd[i]:
                     Ctd[i].append((j, g))
                     Ptd[j][g] = charges['TD']
                 if prof_name not in ProTD[j]: ProTD[j].append(prof_name)

             elif gid_db in Group_Id_To_Index:
                 parent_g_idx = Group_Id_To_Index[gid_db]
                 target_sub_indices = []
                 for idx, sub_g in enumerate(groups_td):
                     if sub_g['parent_group_id'] == gid_db:
                         target_sub_indices.append(idx)
                         
                 for g in target_sub_indices:
                     if (j, g) not in Ctd[i]:
                         Ctd[i].append((j, g))
                     sub_gid = groups_td[g]['id']
                     sg_charges = w_map.get(sub_gid, charges)
                     Ptd[j][g] = sg_charges['TD']
                     if prof_name not in ProTD[j]: ProTD[j].append(prof_name)
                     
                 group_name = Groupes_names_principale[parent_g_idx]
                 if group_name.startswith('L'):
                     target_sem = Semester_Of_Group.get(parent_g_idx)
                     for other_g_idx, sem in Semester_Of_Group.items():
                         if sem == target_sem:
                             other_gid = groups_principale[other_g_idx]['id']
                             for idx, sub_g in enumerate(groups_td):
                                 if sub_g['parent_group_id'] == other_gid:
                                     if (j, idx) not in Ctd[i]:
                                         Ctd[i].append((j, idx))
                                     sg_charges = w_map.get(sub_g['id'], charges)
                                     Ptd[j][idx] = sg_charges['TD']
                                     if prof_name not in ProTD[j]: ProTD[j].append(prof_name)


    # 6. Disponibilités (Dik)
    Dik = [[0]*K for _ in range(I)]
    cursor.execute("SELECT * FROM professor_availability")
    avails = cursor.fetchall()
    
    cursor.execute("SELECT * FROM days ORDER BY order_index")
    db_days = cursor.fetchall()
    cursor.execute("SELECT * FROM time_slots ORDER BY id")
    db_slots = cursor.fetchall()
    
    Day_Id_Map = {d['id']: idx for idx, d in enumerate(db_days)}
    Slot_Id_Map = {s['id']: idx for idx, s in enumerate(db_slots)}
    num_slots = len(db_slots)
    
    for row in avails:
        pid = row['professor_id']
        did = row['day_id']
        sid = row['time_slot_id']
        is_av = row['is_available']
        
        if pid in Prof_Id_To_Index and did in Day_Id_Map and sid in Slot_Id_Map:
            i = Prof_Id_To_Index[pid]
            d_idx = Day_Id_Map[did]
            s_idx = Slot_Id_Map[sid]
            
            day_active = 1
            if days_info and d_idx < len(days_info):
                d_inf = days_info[d_idx]
                if isinstance(d_inf, dict) and d_inf.get('is_active', 1) == 0: day_active = 0
            
            slot_active = 1
            if time_slots_info and s_idx < len(time_slots_info):
                s_inf = time_slots_info[s_idx]
                if isinstance(s_inf, dict) and s_inf.get('is_active', 1) == 0: slot_active = 0
                
            k = d_idx * num_slots + s_idx
            if k < K:
                val = 1 if is_av else 0
                if not day_active or not slot_active: val = 0
                Dik[i][k] = val

    # 7. Salles
    cursor.execute("SELECT * FROM classrooms")
    db_rooms = cursor.fetchall()
    S_CM = len([r for r in db_rooms if 'CM' in str(r['type']).upper()])
    S_TP = len([r for r in db_rooms if 'TP' in str(r['type']).upper()])
    All_Rooms = [{'Salle': r['name'], 'Capacite': r['capacity'], 'Type': r['type']} for r in db_rooms]
    A = []
    
    conn.close()
    print("Données chargées depuis BDD avec succès.")
    return J, GT, GP, K, I, Pcm, Ptp, Ptd, Ccm, Ctp, Ctd, Dik, A, Groupes_names_principale, Sous_Groupes_names, Sous_Group_Id_Map, Sous_Group_Reference_Group, Matieres_names, ProCM, ProTP, ProTD, S_CM, S_TP, Group_Id_Map, Matiere_Codes, All_Rooms, Semester_Of_Group, Pon, Son_td, Son_tp
