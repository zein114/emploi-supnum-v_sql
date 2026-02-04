<?php
/**
 * DatabaseHandler - Replaces ExcelHandler for database operations
 * Provides methods to manage professors, groups, subjects, assignments, and availability
 */

class DatabaseHandler {
    private $db;
    private $stmts = [];

    public function __construct($db) {
        $this->db = $db;
    }

    private function getStmt($sql) {
        if (!isset($this->stmts[$sql])) {
            $this->stmts[$sql] = $this->db->prepare($sql);
        }
        return $this->stmts[$sql];
    }

    // ========== PROFESSORS ==========
    
    public function getNextProfessorId() {
        $result = $this->db->query("SELECT MAX(id) as max_id FROM professors");
        $row = $result->fetch_assoc();
        return ($row['max_id'] ?? 0) + 1;
    }

    public function syncUser($userId, $username, $forceId = null) {
        $profId = $forceId ?? $this->getNextProfessorId();
        
        // Insert into professors table
        $stmt = $this->db->prepare("INSERT INTO professors (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)");
        $stmt->bind_param('is', $profId, $username);
        $stmt->execute();
        
        return [
            'success' => true,
            'id_prof' => $profId,
            'message' => "Professeur ajouté avec l'ID {$profId}"
        ];
    }

    public function removeProfessor($profId) {
        $stmt = $this->db->prepare("DELETE FROM professors WHERE id = ?");
        $stmt->bind_param('i', $profId);
        $removed = $stmt->execute();
        
        return ['success' => true, 'profs_removed' => $removed];
    }

    public function updateProfessorName($profId, $newName) {
        $stmt = $this->db->prepare("UPDATE professors SET name = ? WHERE id = ?");
        $stmt->bind_param('si', $newName, $profId);
        
        if ($stmt->execute() && $stmt->affected_rows > 0) {
            return ['success' => true, 'message' => 'Nom mis à jour'];
        }
        
        return ['success' => false, 'error' => 'Professeur introuvable'];
    }

    // ========== AVAILABILITY ==========
    
    public function initTimetables() {
        // Optimized: Use a single INSERT INTO ... SELECT query to initialize availability
        // This replaces the triple-nested loops and multiple prepare/execute calls
        $query = "
            INSERT IGNORE INTO professor_availability (professor_id, day_id, time_slot_id, is_available)
            SELECT p.id, d.id, s.id, 0
            FROM professors p
            CROSS JOIN days d
            CROSS JOIN time_slots s
            WHERE d.is_active = 1
        ";
        
        if ($this->db->query($query)) {
            $updatesMade = ($this->db->affected_rows > 0);
            return $updatesMade 
                ? ['success' => true, 'message' => 'Emplois du temps initialisés']
                : ['success' => true, 'message' => 'Aucune mise à jour nécessaire'];
        }
        
        return ['success' => false, 'error' => $this->db->error];
    }

    public function resetAvailability($profId) {
        $stmt = $this->db->prepare("UPDATE professor_availability SET is_available = 0 WHERE professor_id = ?");
        $stmt->bind_param('i', $profId);
        $stmt->execute();
        
        return ['success' => true, 'message' => 'Disponibilités réinitialisées'];
    }

    public function getAvailability($profId) {
        // Get days and time slots
        $daysResult = $this->db->query("SELECT id, name FROM days ORDER BY order_index, id");
        $slotsResult = $this->db->query("SELECT id FROM time_slots ORDER BY id");
        
        $days = [];
        while ($row = $daysResult->fetch_assoc()) {
            $days[] = $row;
        }
        
        $numSlots = $slotsResult->num_rows;
        $totalSlots = count($days) * $numSlots;
        $availability = array_fill(0, $totalSlots, 0);
        
        // Fetch availability data
        $sql = "
            SELECT day_id, time_slot_id, is_available 
            FROM professor_availability 
            WHERE professor_id = ?
        ";
        $stmt = $this->getStmt($sql);
        $stmt->bind_param('i', $profId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        // Build day and slot index maps
        $dayIndexMap = [];
        foreach ($days as $idx => $day) {
            $dayIndexMap[$day['id']] = $idx;
        }
        
        $slotsResult->data_seek(0);
        $slotIndexMap = [];
        $slotIdx = 0;
        while ($slot = $slotsResult->fetch_assoc()) {
            $slotIndexMap[$slot['id']] = $slotIdx++;
        }
        
        while ($row = $result->fetch_assoc()) {
            if (isset($dayIndexMap[$row['day_id']]) && isset($slotIndexMap[$row['time_slot_id']])) {
                $linearIndex = $dayIndexMap[$row['day_id']] * $numSlots + $slotIndexMap[$row['time_slot_id']];
                $availability[$linearIndex] = $row['is_available'] ? 1 : 0;
            }
        }
        
        return $availability;
    }

    public function toggleAvailability($profId, $slotIndex) {
        // Get days and slots
        $daysResult = $this->db->query("SELECT id FROM days ORDER BY order_index, id");
        $slotsResult = $this->db->query("SELECT id FROM time_slots ORDER BY id");
        
        $days = [];
        while ($day = $daysResult->fetch_assoc()) {
            $days[] = $day['id'];
        }
        
        $slots = [];
        while ($slot = $slotsResult->fetch_assoc()) {
            $slots[] = $slot['id'];
        }
        
        $numSlots = count($slots);
        $dayIdx = floor($slotIndex / $numSlots);
        $slotIdxInDay = $slotIndex % $numSlots;
        
        if (!isset($days[$dayIdx]) || !isset($slots[$slotIdxInDay])) {
            throw new Exception("Indice de créneau invalide");
        }
        
        $dayId = $days[$dayIdx];
        $slotId = $slots[$slotIdxInDay];
        
        // Toggle availability
        $stmt = $this->db->prepare("
            INSERT INTO professor_availability (professor_id, day_id, time_slot_id, is_available)
            VALUES (?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE is_available = NOT is_available
        ");
        $stmt->bind_param('iii', $profId, $dayId, $slotId);
        $stmt->execute();
        
        // Get the new status
        $stmt = $this->db->prepare("
            SELECT is_available FROM professor_availability 
            WHERE professor_id = ? AND day_id = ? AND time_slot_id = ?
        ");
        $stmt->bind_param('iii', $profId, $dayId, $slotId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        return ['success' => true, 'new_status' => $row['is_available'] ?? 0];
    }

    // ========== GROUPS ==========
    
    public function getGroups() {
        $result = $this->db->query("
            SELECT g.id, g.name, s.name as semester, g.type
            FROM `groups` g
            LEFT JOIN semesters s ON g.semester_id = s.id
            WHERE g.type IN ('principale', 'langues && ppp', 'specialite')
            ORDER BY g.id
        ");
        
        $groups = [];
        while ($row = $result->fetch_assoc()) {
            $groups[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'semester' => $row['semester'] ?? '',
                'type' => $row['type']
            ];
        }
        
        return $groups;
    }

    // ========== CLASSROOMS ==========
    
    public function getRooms() {
        $result = $this->db->query("SELECT name, capacity, type FROM classrooms ORDER BY id");
        
        $rooms = [];
        while ($row = $result->fetch_assoc()) {
            $rooms[] = [
                'name' => $row['name'],
                'capacity' => $row['capacity'],
                'type' => $row['type']
            ];
        }
        
        return $rooms;
    }

    // ========== SUBJECTS ==========
    
    public function getSubjects() {
        $result = $this->db->query("SELECT id, code, name FROM subjects ORDER BY id");
        
        $subjects = [];
        while ($row = $result->fetch_assoc()) {
            $subjects[] = [
                'id' => $row['id'],
                'code' => $row['code'],
                'name' => $row['name']
            ];
        }
        
        return $subjects;
    }

    // ========== ASSIGNMENTS ==========
    
    public function getAssignments($professorId = null) {
        if ($professorId) {
            $stmt = $this->db->prepare("
                SELECT ta.*, s.code as subject_code, s.name as subject_name, 
                       g.id as group_id, g.name as group_name
                FROM teacher_assignments ta
                JOIN subjects s ON ta.subject_id = s.id
                JOIN `groups` g ON ta.group_id = g.id
                WHERE ta.professor_id = ?
                ORDER BY ta.id
            ");
            $stmt->bind_param('i', $professorId);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $this->db->query("
                SELECT ta.*, s.code as subject_code, s.name as subject_name, 
                       g.id as group_id, g.name as group_name,
                       p.name as professor_name
                FROM teacher_assignments ta
                JOIN subjects s ON ta.subject_id = s.id
                JOIN `groups` g ON ta.group_id = g.id
                JOIN professors p ON ta.professor_id = p.id
                ORDER BY ta.id
            ");
        }
        
        $assignments = [];
        while ($row = $result->fetch_assoc()) {
            $assignments[] = $row;
        }
        
        return $assignments;
    }

    public function addAssignment($professorId, $subjectCode, $groupId, $type) {
        // Get subject_id from code
        $stmt = $this->db->prepare("SELECT id FROM subjects WHERE code = ?");
        $stmt->bind_param('s', $subjectCode);
        $stmt->execute();
        $subjectId = $stmt->get_result()->fetch_assoc()['id'] ?? null;
        
        // Group ID is already passed, but we should verify it exists
        $stmt = $this->db->prepare("SELECT id FROM `groups` WHERE id = ?");
        $stmt->bind_param('i', $groupId);
        $stmt->execute();
        $groupExists = $stmt->get_result()->fetch_assoc();
        
        if (!$subjectId || !$groupExists) {
            return ['success' => false, 'error' => 'Matière ou groupe introuvable'];
        }
        
        $stmt = $this->db->prepare("
            INSERT INTO teacher_assignments (professor_id, subject_id, group_id, type)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->bind_param('iiis', $professorId, $subjectId, $groupId, $type);
        
        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Affectation ajoutée'];
        }
        
        return ['success' => false, 'error' => 'Échec de l\'ajout'];
    }

    public function deleteAssignment($assignmentId) {
        $stmt = $this->db->prepare("DELETE FROM teacher_assignments WHERE id = ?");
        $stmt->bind_param('i', $assignmentId);
        
        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Affectation supprimée'];
        }
        
        return ['success' => false, 'error' => 'Échec de la suppression'];
    }

    // ========== WORKLOADS ==========
    
    public function getWorkloads() {
        $result = $this->db->query("
            SELECT cw.*, s.code as subject_code, s.name as subject_name,
                   g.id as group_id, g.name as group_name
            FROM course_workloads cw
            JOIN subjects s ON cw.subject_id = s.id
            LEFT JOIN `groups` g ON cw.group_id = g.id
            ORDER BY s.code, g.id
        ");
        
        $workloads = [];
        while ($row = $result->fetch_assoc()) {
            $workloads[] = $row;
        }
        
        return $workloads;
    }

    public function updateWorkload($subjectCode, $groupId, $cm, $td, $tp) {
        // Get subject_id
        $sqlSubject = "SELECT id FROM subjects WHERE code = ?";
        $stmt = $this->getStmt($sqlSubject);
        $stmt->bind_param('s', $subjectCode);
        $stmt->execute();
        $subjectId = $stmt->get_result()->fetch_assoc()['id'] ?? null;
        
        if (!$subjectId) {
            return ['success' => false, 'error' => 'Matière introuvable'];
        }
        
        // Verify group exists if provided
        if ($groupId) {
            $sqlGroup = "SELECT id FROM `groups` WHERE id = ?";
            $stmt = $this->getStmt($sqlGroup);
            $stmt->bind_param('i', $groupId);
            $stmt->execute();
            if (!$stmt->get_result()->fetch_assoc()) {
                return ['success' => false, 'error' => 'Groupe introuvable'];
            }
        }
        
        // Insert or update
        $sqlUpsert = "
            INSERT INTO course_workloads (subject_id, group_id, cm_hours, td_hours, tp_hours)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                cm_hours = VALUES(cm_hours),
                td_hours = VALUES(td_hours),
                tp_hours = VALUES(tp_hours)
        ";
        $stmt = $this->getStmt($sqlUpsert);
        $stmt->bind_param('iiiii', $subjectId, $groupId, $cm, $td, $tp);
        
        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Charge mise à jour'];
        }
        
        return ['success' => false, 'error' => 'Échec de la mise à jour'];
    }

    // ========== PROFESSORS INFO ==========
    
    public function getProfessors() {
        $result = $this->db->query("SELECT id, name FROM professors ORDER BY id");
        
        $professors = [];
        while ($row = $result->fetch_assoc()) {
            $professors[] = [
                'id' => $row['id'],
                'name' => $row['name']
            ];
        }
        
        return $professors;
    }
}

