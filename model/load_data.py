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
    cursor.execute("SELECT id, code, name, semester_id FROM subjects ORDER BY id")
    subjects = cursor.fetchall()
    Matieres_names = [s['name'] for s in subjects]
    Matiere_Code_Map = {str(s['code']).strip(): idx for idx, s in enumerate(subjects)}
    Matiere_Codes = [str(s['code']).strip() for s in subjects]
    J = len(subjects)
    
    # 2. Groupes (G)
    cursor.execute("SELECT * FROM `groups` ORDER BY id")
    all_groups = cursor.fetchall()
    
    groups_principale = [g for g in all_groups if g['type'] in ('principale', 'langues && ppp', 'specialite')]
    Groupes_names_principale = [g['name'] for g in groups_principale]
    Groupes_types_principale = [g['type'] for g in groups_principale]
    Group_Id_Map = {str(g['id']).strip(): idx for idx, g in enumerate(groups_principale)}
    Group_Id_To_Index = {g['id']: idx for idx, g in enumerate(groups_principale)}
    
    # Sous-Groupes (TD, Languages)
    # Note: Languages are in both to support CM (as main) and TD/TP (as sub)
    groups_td = [g for g in all_groups if g['type'] in ('TD', 'langues && ppp')]
    Sous_Groupes_names = [g['name'] for g in groups_td]
    Sous_Groupes_types = [g['type'] for g in groups_td]
    Sous_Groupes_semesters = [g['semester_id'] for g in groups_td]
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
        
        if g_type in ('langues && ppp',):
            # These groups spread across all students of the semester
            # We ONLY link them to groups of type 'principale', not other 'langues && ppp'
            parent_ids = [str(pg['id']).strip() for pg in groups_principale if pg['type'] == 'principale' and pg['semester_id'] == sem_id]
            if parent_ids:
                Sous_Group_Reference_Group[sub_id_str] = ",".join(parent_ids)
        
        # 2. Regular Parenting (for TD etc.)
        elif g['parent_group_id'] and g['parent_group_id'] in id_to_id_str:
            parent_id_str = id_to_id_str[g['parent_group_id']]
            Sous_Group_Reference_Group[sub_id_str] = parent_id_str

    # 2.5 Link Specialite groups to Principale groups of the same semester for merging
    for g in groups_principale:
        if g['type'].lower() == 'specialite':
            sp_id_str = str(g['id']).strip()
            sem_id = g['semester_id']
            # Link to all principale groups in same semester
            parent_ids = [str(pg['id']).strip() for pg in groups_principale if pg['type'] == 'principale' and pg['semester_id'] == sem_id]
            if parent_ids:
                Sous_Group_Reference_Group[sp_id_str] = ",".join(parent_ids)

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

    # 5. Affectations (Ccm, Ctp, Ctd) - MOVED UP to filter workloads
    Ccm = [[] for _ in range(I)]
    Ctp = [[] for _ in range(I)]
    Ctd = [[] for _ in range(I)]
    
    # ProCM, ProTP, ProTD lists for export
    ProCM = [{} for _ in range(J)]
    ProTP = [{} for _ in range(J)]
    ProTD = [{} for _ in range(J)]

    cursor.execute("SELECT * FROM teacher_assignments")
    assignments = cursor.fetchall()
    
    # Identifiers for quick lookup
    id_to_group = {g['id']: g for g in all_groups}
    
    # Identify which subjects are assigned to which groups (directly or indirectly)
    subj_assigned_to_group = set() # (subj_id, group_id)
    for row in assignments:
        sid_db = row['subject_id']
        gid_db = row['group_id']
        subj_assigned_to_group.add((sid_db, gid_db))
        
        # If assigned to a principal group, it also implicitly covers its subgroups (TD only)
        # We skip 'specialite' groups here as they should have their own assignments for their specific subjects
        if gid_db in Sous_Group_Id_To_Index:
            sub_id_str = str(gid_db).strip()
            parent_id_str = Sous_Group_Reference_Group.get(sub_id_str)
            if parent_id_str:
                for p_id_s in parent_id_str.split(','):
                    p_id_s = p_id_s.strip()
                    try: 
                        p_id = int(p_id_s)
                        # Ensure propagation ONLY between parent and real sub-group (TD/TP)
                        p_group = id_to_group.get(p_id)
                        if p_group and p_group['type'] in ('principale', 'langues && ppp'):
                            subj_assigned_to_group.add((sid_db, p_id))
                    except: pass
        elif gid_db in Group_Id_To_Index:
             # Propagate only to REAL children (TD type) defined via parent_group_id
             # DO NOT propagate through the the bridged Sous_Group_Reference_Group which includes specialty groups
             for sub_g in groups_td:
                 if sub_g['parent_group_id'] == gid_db:
                     subj_assigned_to_group.add((sid_db, sub_g['id']))

    # 4. Matrices des Charges (Pcm, Ptp, Ptd)
    Pcm = [[0]*GP for _ in range(J)]
    Ptp = [[0]*GT for _ in range(J)]
    Ptd = [[0]*GP for _ in range(J)]

    # Fetch workloads
    cursor.execute("SELECT * FROM course_workloads")
    workloads = cursor.fetchall()
    
    # NEW: Identify specialty subjects (those assigned specifically to a 'specialite' group)
    # This helps avoid applying their DEFAULT workload to principal groups.
    cursor.execute("""
        SELECT DISTINCT subject_id 
        FROM teacher_assignments ta 
        JOIN `groups` g ON ta.group_id = g.id 
        WHERE g.type = 'specialite'
    """)
    specialty_subject_ids = {row['subject_id'] for row in cursor.fetchall()}

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
    Son_td = [[0]*GP for _ in range(J)]
    Son_tp = [[0]*GT for _ in range(J)]
    
    # Fill default workloads first
    for j in range(J):
        subj = subjects[j]
        sid = subj['id']
        s_sem = subj['semester_id']
        
        if sid in Workload_Map and 'DEFAULT' in Workload_Map[sid]:
            d = Workload_Map[sid]['DEFAULT']
            
            # CM, TD, Online CM/TD for Principal Groups
            for g in range(GP):
                g_type = Groupes_types_principale[g].lower()
                g_id = groups_principale[g]['id']
                
                # Skip if no teacher assignment for this (subject, group)
                if (sid, g_id) not in subj_assigned_to_group:
                    continue

                # Skip default workload for specialty subjects on NON-specialty groups
                if sid in specialty_subject_ids and g_type == 'principale':
                    continue

                # Only apply if semesters match or subject has no semester assigned
                if s_sem is None or groups_principale[g]['semester_id'] == s_sem:
                    Pcm[j][g] = d.get('CM', 0)
                    Ptd[j][g] = d.get('TD', 0)
                    Pon[j][g] = d.get('ONL_CM', 0)
                    Son_td[j][g] = d.get('ONL_TD', 0)
            
            # TP, Online TP for Subgroups
            for g in range(GT):
                g_id = groups_td[g]['id']
                
                # Skip if no teacher assignment for this (subject, group)
                if (sid, g_id) not in subj_assigned_to_group:
                    continue
                    
                # Subgroups matching semester
                if s_sem is None or Sous_Groupes_semesters[g] == s_sem:
                    Ptp[j][g] = d.get('TP', 0)
                    Son_tp[j][g] = d.get('ONL_TP', 0)

    # Fill Specific and Online/Offline Workloads directly from Map
    for sid, groups_map in Workload_Map.items():
        if sid not in Subj_Id_To_Index: continue
        j = Subj_Id_To_Index[sid]
        
        for gid, charges in groups_map.items():
            if gid == 'DEFAULT': continue
            
            # 1. CM & Online CM
            cm_hrs = charges.get('CM', 0)
            onl_cm = charges.get('ONL_CM', 0)
            if cm_hrs > 0 or onl_cm > 0:
                if gid in Group_Id_To_Index:
                    g_idx = Group_Id_To_Index[gid]
                    if cm_hrs > 0: Pcm[j][g_idx] = cm_hrs
                    if onl_cm > 0: Pon[j][g_idx] = onl_cm
                    
                    # Propagation for L1 type groups (semester siblings)
                    group_name = Groupes_names_principale[g_idx]
                    if group_name.startswith('L') and len(group_name) >= 2:
                         target_sem = Semester_Of_Group.get(g_idx)
                         for other_g, sem in Semester_Of_Group.items():
                             if sem == target_sem and other_g != g_idx:
                                 other_gid = groups_principale[other_g]['id']
                                 other_charges = groups_map.get(other_gid, groups_map.get('DEFAULT', {'CM':0, 'TP':0, 'TD':0, 'ONL_CM':0, 'ONL_TD':0, 'ONL_TP':0}))
                                 if other_charges.get('CM', 0) > 0: Pcm[j][other_g] = other_charges.get('CM', 0)
                                 if other_charges.get('ONL_CM', 0) > 0: Pon[j][other_g] = other_charges.get('ONL_CM', 0)
            
            # 2. TD & Online TD
            td_hrs = charges.get('TD', 0)
            onl_td = charges.get('ONL_TD', 0)
            if td_hrs > 0 or onl_td > 0:
                target_g_idx = None
                if gid in Group_Id_To_Index:
                    target_g_idx = Group_Id_To_Index[gid]
                elif gid in Sous_Group_Id_To_Index:
                     # If assigned to sub, map to parent
                     sub_id = groups_td[Sous_Group_Id_To_Index[gid]]['id']
                     parent_id_str = Sous_Group_Reference_Group.get(str(sub_id).strip())
                     if parent_id_str:
                         for idx, pg in enumerate(groups_principale):
                             if str(pg['id']).strip() == parent_id_str:
                                 target_g_idx = idx
                                 break
                
                if target_g_idx is not None:
                    if td_hrs > 0: Ptd[j][target_g_idx] = td_hrs
                    if onl_td > 0: Son_td[j][target_g_idx] = onl_td
                    
                    # Propagation for L1
                    group_name = Groupes_names_principale[target_g_idx]
                    if group_name.startswith('L') and len(group_name) >= 2:
                         target_sem = Semester_Of_Group.get(target_g_idx)
                         for other_g, sem in Semester_Of_Group.items():
                             if sem == target_sem and other_g != target_g_idx:
                                 other_gid = groups_principale[other_g]['id']
                                 other_charges = groups_map.get(other_gid, groups_map.get('DEFAULT', {'CM':0, 'TP':0, 'TD':0, 'ONL_CM':0, 'ONL_TD':0, 'ONL_TP':0}))
                                 if other_charges.get('TD', 0) > 0: Ptd[j][other_g] = other_charges.get('TD', 0)
                                 if other_charges.get('ONL_TD', 0) > 0: Son_td[j][other_g] = other_charges.get('ONL_TD', 0)

            # 3. TP & Online TP
            tp_hrs = charges.get('TP', 0)
            onl_tp = charges.get('ONL_TP', 0)
            if tp_hrs > 0 or onl_tp > 0:
                if gid in Sous_Group_Id_To_Index:
                    g_idx = Sous_Group_Id_To_Index[gid]
                    if tp_hrs > 0: Ptp[j][g_idx] = tp_hrs
                    if onl_tp > 0: Son_tp[j][g_idx] = onl_tp
                elif gid in Group_Id_To_Index:
                     parent_g_idx = Group_Id_To_Index[gid]
                     for idx, sub_g in enumerate(groups_td):
                         if sub_g['parent_group_id'] == gid:
                             if tp_hrs > 0: Ptp[j][idx] = tp_hrs
                             if onl_tp > 0: Son_tp[j][idx] = onl_tp
                             
                     # Propagation for L1
                     group_name = Groupes_names_principale[parent_g_idx]
                     if group_name.startswith('L'):
                         target_sem = Semester_Of_Group.get(parent_g_idx)
                         for other_g_idx, sem in Semester_Of_Group.items():
                             if sem == target_sem:
                                 other_gid = groups_principale[other_g_idx]['id']
                                 for idx, sub_g in enumerate(groups_td):
                                     if sub_g['parent_group_id'] == other_gid:
                                         other_charges = groups_map.get(sub_g['id'], groups_map.get('DEFAULT', {'CM':0, 'TP':0, 'TD':0, 'ONL_CM':0, 'ONL_TD':0, 'ONL_TP':0}))
                                         if other_charges.get('TP', 0) > 0: Ptp[j][idx] = other_charges.get('TP', 0)
                                         if other_charges.get('ONL_TP', 0) > 0: Son_tp[j][idx] = other_charges.get('ONL_TP', 0)

    # 5b. Processing the assignments into the solver's structure

    
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

        # Get charges: check specific subgroup, then specific parent, then default
        w_map = Workload_Map.get(sid_db, {})
        charges = w_map.get(gid_db)
        
        if charges is None:
            # Check parent specific workload
            p_id_str = Sous_Group_Reference_Group.get(str(gid_db).strip())
            if p_id_str:
                # Support first parent if multiple
                first_p = p_id_str.split(',')[0].strip()
                try: charges = w_map.get(int(first_p))
                except: pass
        
        if charges is None:
            charges = w_map.get('DEFAULT', {'CM':0, 'TP':0, 'TD':0, 'ONL':0})
        
        # --- LOGIC REPLICATION ---
        
        if 'CM' in atype:
            if gid_db in Group_Id_To_Index:
                g = Group_Id_To_Index[gid_db]
                if (j, g) not in Ccm[i]:
                     Ccm[i].append((j, g))
                     Pcm[j][g] = charges.get('CM', 0)
                     Pon[j][g] = charges.get('ONL_CM', 0)
                     
                ProCM[j][g] = prof_name
                
                # Propagation logic for 'L1', 'L2' etc.
                group_name = Groupes_names_principale[g]
                if group_name.startswith('L') and len(group_name) >= 2:
                     target_sem = Semester_Of_Group.get(g)
                     for other_g, sem in Semester_Of_Group.items():
                         if sem == target_sem and other_g != g:
                             if (j, other_g) not in Ccm[i]:
                                 Ccm[i].append((j, other_g))
                             other_gid = groups_principale[other_g]['id']
                             other_charges = w_map.get(other_gid, w_map.get('DEFAULT', {'CM':0, 'TP':0, 'TD':0}))
                             Pcm[j][other_g] = other_charges.get('CM', 0)
                             Pon[j][other_g] = other_charges.get('ONL_CM', 0)
                             ProCM[j][other_g] = prof_name

        if 'TP' in atype:
             if gid_db in Sous_Group_Id_To_Index:
                 g = Sous_Group_Id_To_Index[gid_db]
                 if (j, g) not in Ctp[i]:
                     Ctp[i].append((j, g))
                     Ptp[j][g] = charges.get('TP', 0)
                     Son_tp[j][g] = charges.get('ONL_TP', 0)
                 ProTP[j][g] = prof_name

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
                     Ptp[j][g] = sg_charges.get('TP', 0)
                     Son_tp[j][g] = sg_charges.get('ONL_TP', 0)
                     ProTP[j][g] = prof_name

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
                                     Ptp[j][idx] = sg_charges.get('TP', 0)
                                     Son_tp[j][idx] = sg_charges.get('ONL_TP', 0)
                                     ProTP[j][idx] = prof_name

        if 'TD' in atype:
             # TD is now treated exactly like CM (Principal Group Scope)
             target_group_idx = None
             
             if gid_db in Group_Id_To_Index:
                 target_group_idx = Group_Id_To_Index[gid_db]
             elif gid_db in Sous_Group_Id_To_Index:
                 # Map sub to parent
                 sub_id = groups_td[Sous_Group_Id_To_Index[gid_db]]['id']
                 parent_id_str = Sous_Group_Reference_Group.get(str(sub_id).strip())
                 if parent_id_str:
                     for idx, pg in enumerate(groups_principale):
                         if str(pg['id']).strip() == parent_id_str:
                             target_group_idx = idx
                             break
            
             if target_group_idx is not None:
                 g = target_group_idx
                 if (j, g) not in Ctd[i]:
                     Ctd[i].append((j, g))
                     Ptd[j][g] = charges.get('TD', 0)
                     Son_td[j][g] = charges.get('ONL_TD', 0)
                     
                 ProTD[j][g] = prof_name

                 # Propagation for L1 type groups (semester siblings)
                 group_name = Groupes_names_principale[g]
                 if group_name.startswith('L') and len(group_name) >= 2:
                      target_sem = Semester_Of_Group.get(g)
                      for other_g, sem in Semester_Of_Group.items():
                          if sem == target_sem and other_g != g:
                              if (j, other_g) not in Ctd[i]:
                                  Ctd[i].append((j, other_g))
                              other_gid = groups_principale[other_g]['id']
                              other_charges = w_map.get(other_gid, w_map.get('DEFAULT', {'CM':0, 'TP':0, 'TD':0, 'ONL_CM':0, 'ONL_TD':0, 'ONL_TP':0}))
                              Ptd[j][other_g] = other_charges.get('TD', 0)
                              Son_td[j][other_g] = other_charges.get('ONL_TD', 0)
                              ProTD[j][other_g] = prof_name


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
    return J, GT, GP, K, I, Pcm, Ptp, Ptd, Ccm, Ctp, Ctd, Dik, A, Groupes_names_principale, Sous_Groupes_names, Sous_Group_Id_Map, Sous_Group_Reference_Group, Matieres_names, ProCM, ProTP, ProTD, S_CM, S_TP, Group_Id_Map, Matiere_Codes, All_Rooms, Semester_Of_Group, Pon, Son_td, Son_tp, Sous_Groupes_types, Sous_Groupes_semesters, Groupes_types_principale, specialty_subject_ids, Subj_Id_To_Index
