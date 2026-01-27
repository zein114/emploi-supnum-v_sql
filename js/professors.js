// Professors Management JavaScript

// Load Professors on page load
document.addEventListener("DOMContentLoaded", () => {
  loadProfessors();

  // Search functionality
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", filterProfessors);
  }
});

// Search Filter function
function filterProfessors() {
  const searchInput = document
    .getElementById("searchInput")
    .value.toLowerCase();
  const rows = document.querySelectorAll("#professorsTable tbody tr");
  let visibleCount = 0;

  rows.forEach((row) => {
    // Check professor name (col-name)
    const nameCell = row.querySelector(".col-name");

    if (nameCell) {
      const name = nameCell.textContent.toLowerCase();

      if (name.includes(searchInput)) {
        row.style.display = "";
        visibleCount++;
      } else {
        row.style.display = "none";
      }
    }
  });

  // Handle "No results found"
  let noResultsRow = document.querySelector(".no-results-row");
  if (visibleCount === 0 && rows.length > 0) {
    if (!noResultsRow) {
      noResultsRow = document.createElement("tr");
      noResultsRow.className = "no-results-row";
      noResultsRow.innerHTML = `
        <td colspan="4" class="no-results">
          Aucun professeur ne correspond à votre recherche.
        </td>
      `;
      document
        .querySelector("#professorsTable tbody")
        .appendChild(noResultsRow);
    }
  } else if (noResultsRow) {
    noResultsRow.remove();
  }
}

// Load Professors
async function loadProfessors() {
  try {
    const tbody = document.querySelector("#professorsTable tbody");
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center" style="padding: 2rem;">Chargement des données...</td></tr>';

    const response = await fetch("../api/get_professors_info.php");
    const professors = await response.json();

    tbody.innerHTML = "";

    if (professors.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="text-center text-muted">Aucun professeur trouvé</td></tr>';
      return;
    }

    professors.forEach((prof) => {
      const tr = document.createElement("tr");
      if (prof.id != null && prof.username != null) {
        tr.innerHTML = `
                  <td class="col-id">${prof.id}</td>
                  <td class="col-name"><strong>${prof.username}</strong></td>
                  <td class="col-assignments">
                    <button onclick="openProfessorAssignmentsModal(${prof.id}, this)" class="btn btn-sm btn-secondary" style="cursor: pointer; ">
                      ${prof.assignments} attribution(s)
                    </button>
                  </td>
                  <td class="col-actions">
                    <button class="btn btn-primary btn-sm" onclick="openProfessorAddAssignmentsModal(${prof.id}, this)">
                      Ajouter des attributions
                    </button>
                  </td>
              `;
        // Added "Assignments" text and btn-secondary class for better look
        tbody.appendChild(tr);
      }
    });
  } catch (error) {
    console.error("Error loading professors:", error);
    Toast.error("Échec du chargement des professeurs.");
  }
}

// HTML Templates

const addAssignmentsFormHtml = `
    <div class="form-group">
        <input type="hidden" id="professorId">
    </div>

    <div class="form-group">
        <label class="form-label">Groupe</label>
        <input type="hidden" id="group">
        
        <div class="dropdown-container">
            <button type="button" class="dropdown-button" data-dropdown-id="groupSelect">
                <span class="dropdown-text">Sélectionner un groupe</span>
                <div class="dropdown-arrow"></div>
            </button>
            <div class="dropdown-menu" data-dropdown-menu-id="groupSelect">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>
    </div>

    <div class="form-group">
        <label class="form-label">Module</label>
        <input type="hidden" id="newModule">
        
        <div class="dropdown-container">
            <button type="button" class="dropdown-button" data-dropdown-id="moduleSelect">
                <span class="dropdown-text">Sélectionner un module</span>
                <div class="dropdown-arrow"></div>
            </button>
            <div class="dropdown-menu" data-dropdown-menu-id="moduleSelect">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>
    </div>

    <div class="form-group">
        <label class="form-label">Type d'attribution</label>
        
        <div class="dropdown-container">
            <button type="button" class="dropdown-button" data-dropdown-id="assignmentType">
                <span class="dropdown-text">Sélectionner un type d'attribution</span>
                <div class="dropdown-arrow"></div>
            </button>
            <div class="dropdown-menu">
                <div class="dropdown-item" data-value="CM">CM</div>
                <div class="dropdown-item" data-value="TP">TP</div>
                <div class="dropdown-item" data-value="TD">TD</div>
            </div>
        </div>
    </div>

    <div class="flex gap-1" style="justify-content: flex-end; margin-top: 1.5rem;">
        <button type="button" class="btn btn-secondary" onclick="Modal.cancel()">Annuler</button>
        <button type="button" class="btn btn-primary" id="submitAddAssignments">Ajouter des attributions</button>
    </div>
`;

const viewAssignmentsHtml = `
    <div id="viewAssignmentsList" class="assignment-grid" style="max-height: 400px; overflow-y: auto;">
        <!-- Filled by JS -->
    </div>
    <div class="flex gap-1" style="justify-content: flex-end; margin-top: 1rem;">
        <button type="button" class="btn btn-secondary" onclick="Modal.cancel()">Fermer</button>
    </div>
`;

// Modal functions

async function openProfessorAddAssignmentsModal(professorId, btn) {
  Modal.showContent(
    "Ajouter des attributions au professeur",
    addAssignmentsFormHtml,
    async () => {
      // Init Dropdowns
      if (window.customDropdown) {
        window.customDropdown.initContainer(
          document.getElementById("modalBody")
        );
      }

      document.getElementById("professorId").value = professorId;
      document
        .getElementById("submitAddAssignments")
        .addEventListener("click", submitAddAssignments);

      // Fetch Groups
      try {
        const response = await fetch(
          "../api/get_all_groups_with_excel_file.php"
        );
        const groups = await response.json();

        const groupBtn = document.querySelector(
          '[data-dropdown-id="groupSelect"]'
        );
        const groupText = groupBtn.querySelector(".dropdown-text");

        if (groups.length === 0) {
          groupText.textContent = "Aucun groupe disponible";
          groupBtn.disabled = true;
        } else {
          let html = "";
          groups.forEach((group) => {
            html += `<div class="dropdown-item" data-value="${group[0]}">${
              group[1] + " - S" + group[2]
            }</div>`;
          });
          window.customDropdown.updateMenu("groupSelect", html);
          groupText.textContent = "Sélectionner un groupe";
          groupBtn.disabled = false;
        }
      } catch (error) {
        console.error("Error loading groups:", error);
        Toast.error("Échec du chargement des groupes.");
      }

      // Fetch Modules
      try {
        const response = await fetch("../api/get_all_modules.php");
        const modules = await response.json();

        const moduleBtn = document.querySelector(
          '[data-dropdown-id="moduleSelect"]'
        );
        const moduleText = moduleBtn.querySelector(".dropdown-text");

        if (modules.length === 0) {
          moduleText.textContent = "Aucun module disponible";
          moduleBtn.disabled = true;
        } else {
          let html = "";
          modules.forEach((module) => {
            html += `<div class="dropdown-item" data-value="${module[0]}">${
              module[0] +
              " - " +
              module[1] +
              " - " +
              module[2] +
              " - S" +
              module[3]
            }</div>`;
          });
          window.customDropdown.updateMenu("moduleSelect", html);
          moduleText.textContent = "Sélectionner un module";
          moduleBtn.disabled = false;
        }
      } catch (error) {
        console.error("Error loading modules:", error);
        Toast.error("Échec du chargement des modules.");
      }
    }
  );
}

function closeProfessorAddAssignmentsModal() {
  Modal.close();
}

// Open view assignments modal
async function openProfessorAssignmentsModal(prof_id, btn) {
  if (typeof Spinner !== "undefined" && btn) Spinner.show(btn);
  try {
    const response = await fetch(
      `../api/get_professor_assignments.php?prof_id=${prof_id}`
    );
    const assignments = await response.json();

    // Show modal
    Modal.showContent("Attributions du professeur", viewAssignmentsHtml, () => {
      const listContainer = document.getElementById("viewAssignmentsList");
      listContainer.innerHTML = "";

      if (assignments.length === 0) {
        listContainer.innerHTML =
          '<div class="text-center text-muted col-span-full" style="padding: 2rem; grid-column: 1 / -1;">Aucune attribution trouvée</div>';
        return;
      }

      assignments.forEach((assignment) => {
        // assignment structure:
        // [module_name, prof_id, assignment_type, group_name, row_index, module_id, group_id]
        if (assignment[1] == prof_id) {
          const card = document.createElement("div");
          card.className = "assignment-card";

          let badgeClass = "badge-primary";
          if (assignment[2] === "TP") badgeClass = "badge-success";
          if (assignment[2] === "TD") badgeClass = "badge-warning";

          const rowIndex = assignment[4];
          const moduleId = assignment[5];
          const groupId = assignment[6];

          card.innerHTML = `
              <div class="assignment-header">
                  <span class="assignment-module">${assignment[0]}</span>
                  <span class="badge ${badgeClass}">${assignment[2]}</span>
              </div>
              <div class="assignment-group">
                  Groupe : <strong style="color: var(--color-primary-blue-light);">${assignment[3]}</strong>
              </div>
              <div class="assignment-actions" style="margin-top: 0.75rem; display: flex; justify-content: flex-end;">
                  <button type="button" class="btn btn-danger btn-sm assignment-remove-btn">Supprimer</button>
              </div>
          `;
          listContainer.appendChild(card);

          const removeBtn = card.querySelector(".assignment-remove-btn");
          if (removeBtn && rowIndex && moduleId && groupId) {
            removeBtn.addEventListener("click", async () => {
              const assignmentType = assignment[2];

              // Start spinner and lock modal while processing
              if (typeof Spinner !== "undefined") Spinner.show(removeBtn);
              if (window.Modal && typeof Modal.setLocked === "function") {
                Modal.setLocked(true);
              }
              removeBtn.disabled = true;

              try {
                const response = await fetch(
                  "../api/delete_professor_assignment.php",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      row_index: rowIndex,
                      module_id: moduleId,
                      prof_id: prof_id,
                      group_id: groupId,
                      assignment_type: assignmentType,
                    }),
                  }
                );

                const result = await response.json();

                if (result.success) {
                  card.remove();
                  if (!listContainer.querySelector(".assignment-card")) {
                    listContainer.innerHTML =
                      '<div class="text-center text-muted col-span-full" style="padding: 2rem; grid-column: 1 / -1;">Aucune attribution trouvée</div>';
                  }
                  loadProfessors();
                  Toast.success("Succès", "Attribution supprimée avec succès.");

                  // Close modal automatically on success
                  if (window.Modal && typeof Modal.close === "function") {
                    Modal.close();
                  }
                } else {
                  Toast.error(result.error || "Échec de la suppression de l'attribution.");
                  removeBtn.disabled = false;
                }
              } catch (error) {
                console.error("Error removing assignment:", error);
                Toast.error("Échec de la suppression de l'attribution.");
                removeBtn.disabled = false;
              } finally {
                if (typeof Spinner !== "undefined") Spinner.hide(removeBtn);
                if (window.Modal && typeof Modal.setLocked === "function") {
                  Modal.setLocked(false);
                }
              }
            });
          }
        }
      });
    });
  } catch (error) {
    console.error("Error loading professor assignments:", error);
    Toast.error("Échec du chargement des attributions du professeur.");
  } finally {
    if (typeof Spinner !== "undefined" && btn) Spinner.hide(btn);
  }
}

// Logic implementations

async function submitAddAssignments() {
  const professorId = document.getElementById("professorId").value;
  const groupBtn = document.querySelector('[data-dropdown-id="groupSelect"]');
  const moduleBtn = document.querySelector('[data-dropdown-id="moduleSelect"]');
  const assignmentTypeBtn = document.querySelector(
    '[data-dropdown-id="assignmentType"]'
  );

  const groupId = groupBtn ? groupBtn.getAttribute("data-value") : null;
  const moduleId = moduleBtn ? moduleBtn.getAttribute("data-value") : null;
  const assignmentType = assignmentTypeBtn
    ? assignmentTypeBtn.getAttribute("data-value")
    : null;

  const submitBtn = document.getElementById("submitAddAssignments");

  if (!professorId || !groupId || !moduleId || !assignmentType) {
    Toast.warning("Veuillez remplir tous les champs.");
    return;
  }

  if (typeof Spinner !== "undefined") Spinner.show(submitBtn);
  if (window.Modal && typeof Modal.setLocked === "function") {
    Modal.setLocked(true);
  }

  try {
    const response = await fetch("../api/add_professor_assignments.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prof_id: professorId,
        group_id: groupId,
        module_id: moduleId,
        assignment_type: assignmentType,
      }),
    });

    const result = await response.json();

    if (result.success) {
      closeProfessorAddAssignmentsModal();
      loadProfessors();
      Toast.success("Succès", "Attributions du professeur ajoutées avec succès.");
    } else {
      Toast.error(
        result.error || "Échec de l'ajout des attributions du professeur."
      );
    }
  } catch (error) {
    console.error("Error adding professor assignments:", error);
    Toast.error("Échec de l'ajout des attributions du professeur.");
  } finally {
    if (typeof Spinner !== "undefined") Spinner.hide(submitBtn);
    if (window.Modal && typeof Modal.setLocked === "function") {
      Modal.setLocked(false);
    }
  }
}
