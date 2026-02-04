"""
Module contenant les fonctions d'optimisation pour la génération des emplois du temps
"""
import os
import sys
from ortools.linear_solver import pywraplp
from excel_utils import  export_timetables_to_single_excel
from load_data import load_data


def execute_original_optimization(input_file='Données.xlsx', output_dir='modele/', K=35, days=None, time_slots=None):
    """
    Exécute l'algorithme d'optimisation original sur les données d'entrée
    Args:
        input_file: Fichier Excel contenant les données d'entrée
        output_dir: Répertoire de sortie
        K: Nombre total de créneaux
        days: Liste des jours
        time_slots: Liste des créneaux horaires
        
    Returns:
        bool: True si l'optimisation a réussi, False sinon
    """
    
    if days is None: days = []
    if time_slots is None: time_slots = []
    
    try:
        # PARTIE 1: IMPORTATION DES DONNÉES 
        # Def table des matiers 
        
        J, GT, GP, K, I, Pcm, Ptp, Ptd, Ccm, Ctp, Ctd, Dik, A, Groupes_Principale, Sous_Groupes, Sous_Group_Id_Map, Sous_Group_Reference_Group, Matieres, ProCM, ProTP, ProTD, S, STP, Group_Id_Map, Matiere_Codes, All_Rooms, Semester_Of_Group, Pon, Son_td, Son_tp = load_data(input_file, K, days, time_slots)
        
        # PARTIE 2: MODELE: IMPLEMENTATION ET RESOLUTION 
        solver = pywraplp.Solver.CreateSolver('CBC')
        
        # Création des variables de décision
        X = [[[solver.IntVar(0, 1, 'X'+str(g)+'_'+str(j)+'_'+str(k)) for k in range(K)]for j in range(J)] for g in range(GP)]  # CM
        Y = [[[solver.IntVar(0, 1, 'Y'+str(g)+'_'+str(j)+'_'+str(k)) for k in range(K)]for j in range(J)] for g in range(GT)]  # TP
        Z = [[[solver.IntVar(0, 1, 'Z'+str(g)+'_'+str(j)+'_'+str(k)) for k in range(K)]for j in range(J)] for g in range(GT)]  # TD
        
        # Nouvelles variables pour Online
        W = [[[solver.IntVar(0, 1, 'W'+str(g)+'_'+str(j)+'_'+str(k)) for k in range(K)]for j in range(J)] for g in range(GP)]  # CM Online
        U_TD = [[[solver.IntVar(0, 1, 'U_TD'+str(g)+'_'+str(j)+'_'+str(k)) for k in range(K)]for j in range(J)] for g in range(GT)]  # TD Online
        U_TP = [[[solver.IntVar(0, 1, 'U_TP'+str(g)+'_'+str(j)+'_'+str(k)) for k in range(K)]for j in range(J)] for g in range(GT)]  # TP Online
        

        # Contraintes1: Pour assurer que la charge de chaque matière pour chaque groupe sera dispensé complètement 
        # CM
        # CM & Online Main
        for g in range(GP):
            for j in range(J):
                solver.Add(sum(X[g][j][k] for k in range(K)) <= Pcm[j][g]) 
                solver.Add(sum(W[g][j][k] for k in range(K)) <= Pon[j][g])
        # TP et TD & Online Sub
        for g in range(GT):
            for j in range(J):  
                solver.Add(sum(Y[g][j][k] for k in range(K)) <= Ptp[j][g])
                solver.Add(sum(Z[g][j][k] for k in range(K)) <= Ptd[j][g])
                solver.Add(sum(U_TD[g][j][k] for k in range(K)) <= Son_td[j][g])
                solver.Add(sum(U_TP[g][j][k] for k in range(K)) <= Son_tp[j][g])
        
        # Contraintes 2: Un groupe ne peut avoir qu'une seule séance dans un créneau précis
        for g in range(GP):
            for k in range(K):
                solver.Add(sum(X[g][j][k] + W[g][j][k] for j in range(J)) <= 1)

        # Contraintes 2b: Un sous-groupe ne peut avoir qu'une seule séance dans un créneau précis
        for g in range(GT):
             for k in range(K):
                 solver.Add(sum(Y[g][j][k] + Z[g][j][k] + U_TD[g][j][k] + U_TP[g][j][k] for j in range(J)) <= 1)

        # Contraintes 3: Disponibilité du local : le nombre de séances en parallèles ne doit pas dépasser le nombre de salles
        for k in range(K):
            solver.Add(
                sum(X[g][j][k] for j in range(J) for g in range(GP)) +
                sum(Y[g][j][k] + Z[g][j][k] for j in range(J) for g in range(GT))
                <= S
            )

        # Contraintes 4: Disponibilité du local : le nombre de séances de TP en parallèles ne doit pas dépasser le nombre de salles de TP
        for k in range(K):
            solver.Add(sum(Y[g][j][k] for j in range(J) for g in range(GT)) <= STP) 
        
        # Contraintes 5: Quand un groupe principal a cours, aucun de ses sous-groupes ne peut avoir cours.
        # Mais les sous-groupes ENTRE EUX peuvent avoir cours simultanément (si pas de constraint 5 strict).
        # Cartographie des Groupes Principaux vers les Sous-Groupes
        GP_to_SG = {g: [] for g in range(GP)} 
        for sg_id, gp_refs in Sous_Group_Reference_Group.items():
            # Support multiple parent groups (comma separated)
            refs = [r.strip() for r in str(gp_refs).split(',')]
            for gp_id in refs:
                if gp_id in Group_Id_Map:
                    g = Group_Id_Map[gp_id]
                    sg = Sous_Group_Id_Map[sg_id]
                    GP_to_SG[g].append(sg)

        # Reverse mapping: Sub-group (GT index) -> Principal group (GP index)
        GT_to_GP_Map = {}
        for id_str, gt_idx in Sous_Group_Id_Map.items():
            if id_str in Group_Id_Map:
                GT_to_GP_Map[gt_idx] = Group_Id_Map[id_str]

        for g in range(GP):
            for k in range(K):
                # Variable binaire: Est-ce que le groupe principal 'g' a cours au créneau 'k' ?
                main_active = sum(X[g][j][k] + W[g][j][k] for j in range(J))
                
                # Pour chaque sous-groupe associé
                for sg in GP_to_SG[g]:
                    # Variable binaire: Est-ce que le sous-groupe 'sg' a cours au créneau 'k' ?
                    # Include TP/TD and also its CM classes if it's a dual-type group (like Languages)
                    sub_active_vars = [Y[sg][j][k] + Z[sg][j][k] + U_TD[sg][j][k] + U_TP[sg][j][k] for j in range(J)]
                    
                    if sg in GT_to_GP_Map:
                        sg_gp_idx = GT_to_GP_Map[sg]
                        sub_active_vars += [X[sg_gp_idx][j][k] + W[sg_gp_idx][j][k] for j in range(J)]
                    
                    sub_active = sum(sub_active_vars)
                    
                    # Exclusion mutuelle : Soit le parent, soit le sous-groupe, soit aucun. Pas les deux.
                    solver.Add(main_active + sub_active <= 1)

        # Contraintes 6 : La disponibilité de l'enseignant doit être respectée
        for i in range(I):
            for k in range(K):
                if k < len(Dik[i]):
                    try:
                        s = int(Dik[i][k])
                    except:
                        # Si s n'est pas un nombre, supposer que l'enseignant n'est pas disponible
                        s = 0
                    solver.Add(
                        sum(X[h[1]][h[0]][k] + W[h[1]][h[0]][k] for h in Ccm[i]) + 
                        sum(Y[h[1]][h[0]][k] + U_TP[h[1]][h[0]][k] for h in Ctp[i]) + 
                        sum(Z[h[1]][h[0]][k] + U_TD[h[1]][h[0]][k] for h in Ctd[i]) <= s)

        
        # Contraintes 7 : La charge d'une matière doit être dispensée par le prof associé  
        for i in range(I):
            for h in Ccm[i]:
                g = h[1]
                j = h[0]
                solver.Add(sum(X[g][j][k] + W[g][j][k] for k in range(K)) <= Pcm[j][g] + Pon[j][g]) 
                
        for i in range(I):
            for h in Ctp[i]:
                g = h[1]
                j = h[0]
                solver.Add(sum(Y[g][j][k] + U_TP[g][j][k] for k in range(K)) <= Ptp[j][g] + Son_tp[j][g])
        
        for i in range(I):
            for h in Ctd[i]:
                g = h[1]
                j = h[0]
                solver.Add(sum(Z[g][j][k] + U_TD[g][j][k] for k in range(K)) <= Ptd[j][g] + Son_td[j][g]) 



        # Contraintes 8 : Respecter les jours et créneaux désactivés (Global)
        # Si un jour ou un créneau est inactif, aucune séance ne peut y être placée.
        num_slots_per_day = len(time_slots) if time_slots else 5
        for d_idx, day_info in enumerate(days):
             is_day_active = 1
             if isinstance(day_info, dict):
                 is_day_active = day_info.get('is_active', 1)
             
             for s_idx, slot_info in enumerate(time_slots):
                 is_slot_active = 1
                 if isinstance(slot_info, dict):
                     is_slot_active = slot_info.get('is_active', 1)
                 
                 # Si le jour ou le créneau est inactif
                 if is_day_active == 0 or is_slot_active == 0:
                     k_idx = d_idx * num_slots_per_day + s_idx
                     if k_idx < K:
                         # Forcer toutes les variables à 0 pour ce créneau k
                         # CM & CM Online
                         for g in range(GP):
                             for j in range(J):
                                 solver.Add(X[g][j][k_idx] == 0)
                                 solver.Add(W[g][j][k_idx] == 0)
                         # TP/TD & TD/TP Online
                         for g in range(GT):
                             for j in range(J):
                                 solver.Add(Y[g][j][k_idx] == 0)
                                 solver.Add(Z[g][j][k_idx] == 0)
                                 solver.Add(U_TD[g][j][k_idx] == 0)
                                 solver.Add(U_TP[g][j][k_idx] == 0)




        # Fonction objectif :
        # Maximisation de la charge totale effectuée
        objectif = solver.Objective()

        # CM & Online Main
        for g in range(GP):
            for j in range(J):
                for k in range(K):
                    objectif.SetCoefficient(X[g][j][k],1)
                    objectif.SetCoefficient(W[g][j][k],1)

        # TP, TD & Online Sub
        for g in range(GT):
            for j in range(J):
                for k in range(K):
                    objectif.SetCoefficient(Y[g][j][k],1)
                    objectif.SetCoefficient(Z[g][j][k],1)
                    objectif.SetCoefficient(U_TD[g][j][k],1)
                    objectif.SetCoefficient(U_TP[g][j][k],1)

        # PARTIE 2.5: PRÉFÉRENCES (SOFT CONSTRAINTS)
        # Favoriser la cohérence des types de sessions pour les sous-groupes d'un même parent
        # On préfère avoir TD1 + TD2 ou TP1 + TP2 au même créneau plutôt qu'un mélange (ex: TD1 + TP2)
        for g_idx, sgs in GP_to_SG.items():
            if len(sgs) > 1:
                for k in range(K):
                    # Bonus si TOUS les sous-groupes du parent g_idx font du TD au créneau k
                    all_td_aligned = solver.BoolVar(f'all_td_aligned_g{g_idx}_k{k}')
                    for sg_idx in sgs:
                        # all_td_aligned <= sum(Z[sg_idx][j][k] for j in range(J))
                        # Cela force all_td_aligned à 0 si l'un des sous-groupes n'a pas de TD
                        solver.Add(all_td_aligned <= sum(Z[sg_idx][j][k] for j in range(J)))
                    objectif.SetCoefficient(all_td_aligned, 0.1) # Petit bonus pour encourager l'alignement
                    
                    # Bonus si TOUS les sous-groupes du parent g_idx font du TP au créneau k
                    all_tp_aligned = solver.BoolVar(f'all_tp_aligned_g{g_idx}_k{k}')
                    for sg_idx in sgs:
                         solver.Add(all_tp_aligned <= sum(Y[sg_idx][j][k] for j in range(J)))
                    objectif.SetCoefficient(all_tp_aligned, 0.1)

        objectif.SetMaximization()
        # Résolution du problème
        status = solver.Solve()
        
        if status == pywraplp.Solver.OPTIMAL:
            print('Solution optimale trouvée !')
            
            # PARTIE 3 : EXPORTATION DES RÉSULTATS 
            solver_results = (X, Y, Z, W, U_TD, U_TP)
            
            # Inverser la correspondance pour l'exportation (Index -> Id)
            Sous_Group_Index_To_Id = {v: k for k, v in Sous_Group_Id_Map.items()}
            
            # Track unscheduled classes
            unscheduled_classes = []
            
            # Check CM classes
            for g in range(GP):
                for j in range(J):
                    scheduled = sum(X[g][j][k].solution_value() for k in range(K))
                    required = Pcm[j][g]
                    if required > 0 and scheduled < required:
                        # Find group id
                        group_id = None
                        for gid, idx in Group_Id_Map.items():
                            if idx == g:
                                group_id = gid
                                break
                        
                        prof = ProCM[j][0] if ProCM[j] else "Non assigné"
                        unscheduled_classes.append({
                            'group': Groupes_Principale[g],
                            'group_id': group_id,
                            'subject': Matieres[j],
                            'subject_code': Matiere_Codes[j],
                            'type': 'CM',
                            'professor': prof,
                            'required_sessions': int(required),
                            'scheduled_sessions': int(scheduled),
                            'missing_sessions': int(required - scheduled)
                        })

                    # Check Online Main
                    scheduled_onl = sum(W[g][j][k].solution_value() for k in range(K))
                    required_onl = Pon[j][g]
                    if required_onl > 0 and scheduled_onl < required_onl:
                         group_id = None
                         for gid, idx in Group_Id_Map.items():
                            if idx == g:
                                group_id = gid
                                break
                         unscheduled_classes.append({
                            'group': Groupes_Principale[g],
                            'group_id': group_id,
                            'subject': Matieres[j],
                            'subject_code': Matiere_Codes[j],
                            'type': 'CM Online',
                            'professor': ProCM[j][0] if ProCM[j] else "En ligne",
                            'required_sessions': int(required_onl),
                            'scheduled_sessions': int(scheduled_onl),
                            'missing_sessions': int(required_onl - scheduled_onl)
                         })
            
            # Check TP classes
            for g in range(GT):
                for j in range(J):
                    scheduled = sum(Y[g][j][k].solution_value() for k in range(K))
                    required = Ptp[j][g]
                    if required > 0 and scheduled < required:
                        prof = ProTP[j][0] if ProTP[j] else "Non assigné"
                        unscheduled_classes.append({
                            'group': Sous_Groupes[g],
                            'group_id': Sous_Group_Index_To_Id.get(g, ''),
                            'subject': Matieres[j],
                            'subject_code': Matiere_Codes[j],
                            'type': 'TP',
                            'professor': prof,
                            'required_sessions': int(required),
                            'scheduled_sessions': int(scheduled),
                            'missing_sessions': int(required - scheduled)
                        })
            
            # Check TD classes
            for g in range(GT):
                for j in range(J):
                    scheduled = sum(Z[g][j][k].solution_value() for k in range(K))
                    required = Ptd[j][g]
                    if required > 0 and scheduled < required:
                        prof = ProTD[j][0] if ProTD[j] else "Non assigné"
                        unscheduled_classes.append({
                            'group': Sous_Groupes[g],
                            'group_id': Sous_Group_Index_To_Id.get(g, ''),
                            'subject': Matieres[j],
                            'subject_code': Matiere_Codes[j],
                            'type': 'TD',
                            'professor': prof,
                            'required_sessions': int(required),
                            'scheduled_sessions': int(scheduled),
                            'missing_sessions': int(required - scheduled)
                        })
                    
                    # Check Online TD
                    scheduled_onl_td = sum(U_TD[g][j][k].solution_value() for k in range(K))
                    required_onl_td = Son_td[j][g]
                    if required_onl_td > 0 and scheduled_onl_td < required_onl_td:
                         unscheduled_classes.append({
                             'group': Sous_Groupes[g],
                             'group_id': Sous_Group_Index_To_Id.get(g, ''),
                             'subject': Matieres[j],
                             'subject_code': Matiere_Codes[j],
                             'type': 'TD Online',
                             'professor': ProTD[j][0] if ProTD[j] else "En ligne",
                             'required_sessions': int(required_onl_td),
                             'scheduled_sessions': int(scheduled_onl_td),
                             'missing_sessions': int(required_onl_td - scheduled_onl_td)
                         })
                    
                    # Check Online TP
                    scheduled_onl_tp = sum(U_TP[g][j][k].solution_value() for k in range(K))
                    required_onl_tp = Son_tp[j][g]
                    if required_onl_tp > 0 and scheduled_onl_tp < required_onl_tp:
                         unscheduled_classes.append({
                             'group': Sous_Groupes[g],
                             'group_id': Sous_Group_Index_To_Id.get(g, ''),
                             'subject': Matieres[j],
                             'subject_code': Matiere_Codes[j],
                             'type': 'TP Online',
                             'professor': ProTP[j][0] if ProTP[j] else "En ligne",
                             'required_sessions': int(required_onl_tp),
                             'scheduled_sessions': int(scheduled_onl_tp),
                             'missing_sessions': int(required_onl_tp - scheduled_onl_tp)
                         })
            
            # Save unscheduled classes to JSON file
            import json
            unscheduled_file = os.path.join(output_dir, 'unscheduled_classes.json')
            with open(unscheduled_file, 'w', encoding='utf-8') as f:
                json.dump(unscheduled_classes, f, ensure_ascii=False, indent=2)
            
            print(f"Unscheduled classes: {len(unscheduled_classes)}")
            if unscheduled_classes:
                print("Warning: Some classes could not be scheduled!")
            
            export_timetables_to_single_excel(solver_results, Groupes_Principale, Sous_Groupes, Sous_Group_Id_Map, Sous_Group_Reference_Group, Group_Id_Map, Matieres, ProCM, ProTP, ProTD, J, GP, GT, Matiere_Codes, All_Rooms, output_dir, days, time_slots)
            # Affichage des vars de décision (pour débogage)
            Xv = []  
            Yv = []  
            Zv = []       
            # CM
            for g in range(GP):
                for j in range(J):
                    for k in range(K):
                        if X[g][j][k].solution_value() != 0:
                                Xv.append('X' + '_' + str(g) + '_' + str(j) + '_' + str(k))

            # TP et TD
            for g in range(GT):
                for j in range(J):
                    for k in range(K):
                        if Y[g][j][k].solution_value() != 0:
                            Yv.append('Y' + '_' + str(g) + '_' + str(j) + '_' + str(k))
                        if Z[g][j][k].solution_value() != 0:
                            Zv.append('Z' + '_' + str(g) + '_' + str(j) + '_' + str(k))
            
            print(f"Variables X actives : {len(Xv)}")
            print(f"Variables Y actives : {len(Yv)}")
            print(f"Variables Z actives : {len(Zv)}")

            return True
        elif  status == pywraplp.Solver.FEASIBLE:
            print('Une solution faisable mais pas optimale a été trouvée')
        else:
            print('Aucune solution faisable trouvée.')
            return False
    
    except Exception as e:
        import traceback
        print(f"Erreur lors de l'optimisation: {e}")
        traceback.print_exc()
        return False


def run_optimization_process(input_file, output_dir):
    """
    Exécute le processus complet d'optimisation
    
    Args:
        input_file: Nom du fichier Excel d'entrée (sans le chemin)
        
    Returns:
        bool: True si le processus a réussi, False sinon
    """
    try:
        import json
        
        # Load configuration
        config_path = os.path.join(os.path.dirname(__file__), 'generation_config.json')
        days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
        time_slots = ['08:00-9:30', '9:45-11:15', '11:30-13:00', '15:00-16:30', '17:00-18:30']
        
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    days = config.get('days', days)
                    time_slots = config.get('time_slots', time_slots)
                    
                    # Normalisation des slots par défaut si besoin (pour l'affichage si chaîne simple)
                    # Mais on laisse tel quel pour le support dict
                print("Configuration chargée avec succès.")
            except Exception as e:
                print(f"Erreur lors de la lecture de la configuration : {e}")
        else:
             print("Fichier de configuration non trouvé, utilisation des valeurs par défaut.")
             
        K = len(days) * len(time_slots)
        print(f"K calculé = {K} (Jours={len(days)}, Créneaux={len(time_slots)})")

        # 1. Créer les modèles Excel
        print("Création des modèles Excel...")
        
        # 2. Exécuter l'optimisation
        print("Exécution de l'optimisation...")
        if not execute_original_optimization(input_file, output_dir, K, days, time_slots):
            print("Échec de l'optimisation.")
            return False
        
        print("Processus d'optimisation terminé avec succès.")
        return True
    
    except Exception as e:
        import traceback
        print(f"Erreur lors du processus d'optimisation: {e}")
        traceback.print_exc()
        return False
    
if __name__ == "__main__":
    # Récupérer le répertoire du script pour plus de robustesse
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Exemple d'exécution
    if len(sys.argv) > 1:
        output_dir = sys.argv[1]
    else:
        output_dir = "modele/"
        
    input_filename = 'Données_final.xlsx'
    
    # Vérification si lancé depuis un autre répertoire
    print(f"Répertoire de travail actuel : {os.getcwd()}")
    print(f"Répertoire du script : {script_dir}")
    
    if not run_optimization_process(input_filename, output_dir):
        sys.exit(1)
