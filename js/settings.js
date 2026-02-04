document.addEventListener("DOMContentLoaded", function () {
  // Tab switching
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");

      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(tabId).classList.add("active");

      // Save active tab
      sessionStorage.setItem("settingsActiveTab", tabId);

      loadTabData(tabId);
    });
  });

  // Dropdown change listeners
  document.addEventListener("dropdown-change", function (e) {
    const { value, dropdownId } = e.detail;
    if (dropdownId === "semesterSelect") {
      document.getElementById("current_semester_input").value = value;
    } else if (dropdownId === "semesterTypeSelect") {
      document.getElementById("current_semester_type_input").value = value;
    }
  });

  // General Settings Form
  const generalForm = document.getElementById("generalSettingsForm");
  if (generalForm) {
    generalForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const formData = new FormData(generalForm);
      const data = {
        action: "update_general",
        current_semester_type: formData.get("current_semester_type"),
      };

      Modal.confirm(
        "Confirmer les changements",
        "Voulez-vous vraiment enregistrer ces paramètres système ?",
        async () => {
          const submitBtn = generalForm.querySelector('button[type="submit"]');
          await updateSettings(data, submitBtn);
        },
      );
    });
  }

  // Initial load with tab persistence
  const lastTab = sessionStorage.getItem("settingsActiveTab") || "general";
  const targetBtn = document.querySelector(`.tab-btn[data-tab="${lastTab}"]`);
  if (targetBtn) {
    targetBtn.click();
  } else {
    loadTabData("general");
  }
});

// Global variables to store dynamic settings
let availableSemesters = [];
let availableSemesterPairs = [];
let currentGlobalSemesterType = "impair";
let availableGroupTypes = ["principale", "TD", "specialite", "langues && ppp"];
let availablePrincipaleGroups = []; // Store for parent selection in add/edit group
let globalGroups = []; // Store all groups for reference
let allGroupsUnfiltered = []; // Store ALL groups (unfiltered) for semester coverage checking

async function loadTabData(tabId) {
  if (tabId === "classrooms") {
    document.getElementById("classroomsTableBody").innerHTML =
      '<tr><td colspan="4" class="text-center p-3">Chargement des salles...</td></tr>';
  } else if (tabId === "groups") {
    document.getElementById("groupsTableBody").innerHTML =
      '<tr><td colspan="6" class="text-center p-3">Chargement des groupes...</td></tr>';
  }

  try {
    const response = await fetch(
      `../api/get_settings.php?tab=${tabId}&t=${Date.now()}`,
    );
    const result = await response.json();

    // Always update semesters if they are returned
    if (result.semesters) {
      availableSemesters = result.semesters;
    }
    if (result.semester_pairs) {
      availableSemesterPairs = result.semester_pairs;
    }
    if (result.current_semester_type) {
      currentGlobalSemesterType = result.current_semester_type;
    }

    // Update group types (if sent by API)
    if (result.group_types) {
      availableGroupTypes = result.group_types;
      if (availableGroupTypes.length === 0)
        availableGroupTypes = ["principale", "TD"];
    }

    if (tabId === "general") {
      // Render semesters list
      if (result.semesters) {
        renderSemesters(result.semesters);
        // Update semester dropdown with available semesters
        updateSemesterDropdown(result.semesters);
      }

      // Update Semester Type UI
      const typeValue = currentGlobalSemesterType;
      const typeText =
        typeValue === "impair"
          ? "Impair (S1, S3, S5...)"
          : "Pair (S2, S4, S6...)";
      updateDropdownUI("semesterTypeSelect", typeValue, typeText);

      const typeInput = document.getElementById("current_semester_type_input");
      if (typeInput) typeInput.value = typeValue;
    } else if (tabId === "days-times") {
      renderDays(result.days);
      renderTimeSlots(result.time_slots);
    } else if (tabId === "classrooms") {
      renderClassrooms(result.classrooms);
    } else if (tabId === "groups") {
      // Store principal groups for dropdowns
      if (result.groups) {
        globalGroups = result.groups;
        availablePrincipaleGroups = result.groups.filter(
          (g) => g.type === "principale",
        );
      }
      // Store unfiltered groups for semester coverage checking
      if (result.all_groups) {
        allGroupsUnfiltered = result.all_groups;
      }
      renderGroups(result.groups);
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

function updateDropdownUI(dropdownId, value, text) {
  const btn = document.querySelector(`[data-dropdown-id="${dropdownId}"]`);
  if (btn) {
    btn.querySelector(".dropdown-text").textContent = text;
    btn.setAttribute("data-value", value);

    // Highlight selected item in menu
    const menu = btn
      .closest(".dropdown-container")
      .querySelector(".dropdown-menu");
    menu.querySelectorAll(".dropdown-item").forEach((item) => {
      if (item.getAttribute("data-value") === value) {
        item.classList.add("selected");
      } else {
        item.classList.remove("selected");
      }
    });
  }
}

// Rendering Functions
function renderDays(days) {
  const list = document.getElementById("daysList");
  list.innerHTML = days
    .map(
      (day) => `
        <div class="settings-item">
            <div class="flex items-center gap-1">
                <span class="font-semibold">${day.name}</span>
                <span class="badge ${
                  day.is_active == 1 ? "badge-success" : "badge-danger"
                }" style="font-size: 0.75rem; padding: 2px 8px;">
                    ${day.is_active == 1 ? "Actif" : "Inactif"}
                </span>
            </div>
            <div class="settings-item-actions">
                <button class="btn btn-sm ${
                  day.is_active == 1 ? "btn-danger" : "btn-success"
                }" onclick="toggleDayStatus(this, ${day.id}, ${day.is_active})">
                    ${day.is_active == 1 ? "Désactiver" : "Activer"}
                </button>
            </div>
        </div>
    `,
    )
    .join("");
}

async function toggleDayStatus(btn, id, currentStatus) {
  const newStatus = currentStatus == 1 ? 0 : 1;
  await updateSettings(
    {
      action: "toggle_day_status",
      id: id,
      is_active: newStatus,
    },
    btn,
  );
}

function renderTimeSlots(slots) {
  const list = document.getElementById("timeSlotsList");
  list.innerHTML = slots
    .map(
      (slot) => `
        <div class="settings-item">
            <div class="flex items-center gap-1">
                <span class="font-semibold">${slot.time_range}</span>
                <span class="badge ${
                  slot.is_active == 1 ? "badge-success" : "badge-danger"
                }" style="font-size: 0.75rem; padding: 2px 8px;">
                    ${slot.is_active == 1 ? "Actif" : "Inactif"}
                </span>
            </div>
            <div class="settings-item-actions">
                <button class="btn btn-sm btn-secondary" onclick="editTimeSlot(${
                  slot.id
                }, '${slot.time_range}')">Modifier</button>
                <button class="btn btn-sm ${
                  slot.is_active == 1 ? "btn-danger" : "btn-success"
                }" onclick="toggleTimeSlotStatus(this, ${slot.id}, ${
                  slot.is_active
                })">
                    ${slot.is_active == 1 ? "Désactiver" : "Activer"}
                </button>
            </div>
        </div>
    `,
    )
    .join("");
}

async function toggleTimeSlotStatus(btn, id, currentStatus) {
  const newStatus = currentStatus == 1 ? 0 : 1;
  await updateSettings(
    {
      action: "toggle_timeslot_status",
      id: id,
      is_active: newStatus,
    },
    btn,
  );
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJsArg(text) {
  if (!text) return "";
  return text
    .toString()
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;");
}

function renderClassrooms(classrooms) {
  const body = document.getElementById("classroomsTableBody");
  body.innerHTML = classrooms
    .map((c) => {
      const name = (c.A || c.Salle || "").trim();
      const capacity = c.B || c.Capacite || 0;
      const type = (c.C || c.Type || "").trim();

      const safeNameHtml = escapeHtml(name);
      const safeTypeHtml = escapeHtml(type);

      const safeNameJs = escapeJsArg(name);
      const safeTypeJs = escapeJsArg(type);
      const safeCapacityJs = escapeJsArg(capacity);

      return `
            <tr>
                <td class="font-semibold">${safeNameHtml}</td>
                <td>${capacity} places</td>
                <td><span class="badge ${
                  type === "CM" ? "badge-primary" : "badge-success"
                }">${safeTypeHtml}</span></td>
                <td>
                    <div class="settings-item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editClassroom('${safeNameJs}', '${safeCapacityJs}', '${safeTypeJs}')">Modifier</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteClassroom('${safeNameJs}')">Supprimer</button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}

function renderGroups(groups) {
  const body = document.getElementById("groupsTableBody");
  body.innerHTML = groups
    .map((g) => {
      const name = (g.name || g.B || "").trim();
      const semester = (g.semester || g.C || "").trim();
      const type = (g.type || g.D || "").trim();

      const safeNameHtml = escapeHtml(name);
      const safeSemesterHtml = escapeHtml(semester);
      const speciality = (g.speciality || "").trim();
      const safeSpecialityHtml = escapeHtml(speciality);

      const safeNameJs = escapeJsArg(name);
      const safeSemesterJs = escapeJsArg(semester);
      const safeTypeJs = escapeJsArg(type);
      const parentId = g.reference || g.parent_group_id || "";

      return `
            <tr>
                <td class="font-semibold">${safeNameHtml}</td>
                <td><span class="badge badge-warning">${safeSemesterHtml}</span></td>
                <td><span class="badge badge-primary">${type}</span></td>
                <td>${safeSpecialityHtml}</td>
                <td>${g.capacity || 0} étudiants</td>
                <td>
                    <div class="settings-item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editGroup(${g.id}, '${safeNameJs}', '${safeSemesterJs}', '${safeTypeJs}', '${parentId}', ${g.capacity || 0})">Modifier</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteGroup(${g.id})">Supprimer</button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}

async function updateSettings(data, btn = null) {
  if (btn && typeof Spinner !== "undefined") Spinner.show(btn);
  if (typeof Modal !== "undefined" && Modal.setLocked) Modal.setLocked(true);

  try {
    const response = await fetch("../api/update_settings.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      Toast.success("Succès", result.message || "Paramètres mis à jour");
      loadTabData(
        document.querySelector(".tab-btn.active").getAttribute("data-tab"),
      );
      return true;
    } else {
      Toast.error("Erreur", result.error || "Erreur lors de la mise à jour");
      return false;
    }
  } catch (error) {
    Toast.error("Erreur", "Erreur réseau");
    return false;
  } finally {
    if (btn && typeof Spinner !== "undefined") Spinner.hide(btn);
    if (typeof Modal !== "undefined" && Modal.setLocked) Modal.setLocked(false);
  }
}

// Classroom functions
function addClassroom() {
  const html = `
        <div class="form-group">
            <div class="mb-1">
                <label class="form-label">Nom de la salle</label>
                <input type="text" id="addClassroomName" class="form-input" placeholder="ex: Salle 101" required>
            </div>
            <div class="mb-1">
                <label class="form-label">Capacité</label>
                <input type="number" step="1" id="addClassroomCapacity" class="form-input" placeholder="ex: 30" required>
            </div>
            <div class="mb-1">
                <label class="form-label">Type</label>
                <div class="dropdown-container">
                    <button type="button" class="dropdown-button" data-dropdown-id="addClassroomType">
                        <span class="dropdown-text">CM</span>
                        <div class="dropdown-arrow"></div>
                    </button>
                    <div class="dropdown-menu">
                        <div class="dropdown-item selected" data-value="CM">CM</div>
                        <div class="dropdown-item" data-value="TP">TP</div>
                    </div>
                </div>
            </div>
        </div>
    `;

  Modal.showContent("Ajouter une salle", html, () => {
    if (window.customDropdown) {
      window.customDropdown.initContainer(document.getElementById("modalBody"));
    }

    const menu = document.getElementById("modalBody");
    const actions = document.createElement("div");
    actions.className = "grid grid-2 gap-2 mt-3";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-secondary w-100";
    cancelBtn.id = "modalCancelBtn";
    cancelBtn.textContent = "Annuler";
    cancelBtn.onclick = () => Modal.close();

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-primary w-100";
    saveBtn.id = "modalConfirmBtn";
    saveBtn.textContent = "Ajouter";
    saveBtn.onclick = async () => {
      const name = document.getElementById("addClassroomName").value.trim();
      const capacityInput = document.getElementById(
        "addClassroomCapacity",
      ).value;

      if (!name) {
        Toast.error("Erreur", "Veuillez entrer un nom de salle.");
        return;
      }
      if (
        !capacityInput ||
        isNaN(capacityInput) ||
        parseInt(capacityInput) <= 0
      ) {
        Toast.error(
          "Erreur",
          "Veuillez entrer une capacité valide (nombre positif).",
        );
        return;
      }

      const typeBtn = document.querySelector(
        '[data-dropdown-id="addClassroomType"]',
      );
      const success = await updateSettings(
        {
          action: "add_classroom",
          name: name,
          capacity: parseInt(capacityInput),
          type:
            typeBtn.getAttribute("data-value") ||
            typeBtn.querySelector(".dropdown-text").textContent,
        },
        saveBtn,
      );
      if (success) Modal.close();
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    menu.appendChild(actions);
  });
}

function editClassroom(name, capacity, type) {
  const html = `
        <div class="form-group">
            <input type="hidden" id="editClassroomOldName" value="${name}">
            <div class="mb-1">
                <label class="form-label">Nom de la salle</label>
                <input type="text" id="editClassroomName" class="form-input" value="${name}" required>
            </div>
            <div class="mb-1">
                <label class="form-label">Capacité</label>
                <input type="number" step="1" id="editClassroomCapacity" class="form-input" value="${capacity}" required>
            </div>
            <div class="mb-1">
                <label class="form-label">Type</label>
                <div class="dropdown-container">
                    <button type="button" class="dropdown-button" data-dropdown-id="editClassroomType">
                        <span class="dropdown-text">${type}</span>
                        <div class="dropdown-arrow"></div>
                    </button>
                    <div class="dropdown-menu">
                        <div class="dropdown-item ${
                          type === "CM" ? "selected" : ""
                        }" data-value="CM">CM</div>
                        <div class="dropdown-item ${
                          type === "TP" ? "selected" : ""
                        }" data-value="TP">TP</div>
                    </div>
                </div>
            </div>
        </div>
    `;

  Modal.showContent("Modifier la salle", html, () => {
    if (window.customDropdown) {
      window.customDropdown.initContainer(document.getElementById("modalBody"));
    }

    const menu = document.getElementById("modalBody");
    const actions = document.createElement("div");
    actions.className = "grid grid-2 gap-2 mt-3";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-secondary w-100";
    cancelBtn.id = "modalCancelBtn";
    cancelBtn.textContent = "Annuler";
    cancelBtn.onclick = () => Modal.close();

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-primary w-100";
    saveBtn.id = "modalConfirmBtn";
    saveBtn.textContent = "Enregistrer";
    saveBtn.onclick = async () => {
      const newName = document.getElementById("editClassroomName").value.trim();
      const capacityInput = document.getElementById(
        "editClassroomCapacity",
      ).value;
      const newCapacity = parseInt(capacityInput);
      const typeBtn = document.querySelector(
        '[data-dropdown-id="editClassroomType"]',
      );
      const newType =
        typeBtn.getAttribute("data-value") ||
        typeBtn.querySelector(".dropdown-text").textContent;

      if (
        newName === name &&
        newCapacity === parseInt(capacity) &&
        newType === type
      ) {
        Toast.warning("Attention", "Aucune modification détectée");
        return;
      }

      if (!capacityInput || isNaN(capacityInput) || newCapacity <= 0) {
        Toast.error(
          "Erreur",
          "Veuillez entrer une capacité valide (nombre positif).",
        );
        return;
      }

      const success = await updateSettings(
        {
          action: "edit_classroom",
          old_name: document.getElementById("editClassroomOldName").value,
          name: newName,
          capacity: newCapacity,
          type: newType,
        },
        saveBtn,
      );
      if (success) Modal.close();
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    menu.appendChild(actions);
  });
}

function deleteClassroom(name) {
  Modal.confirm(
    "Supprimer la salle",
    `Voulez-vous vraiment supprimer la salle "${name}" ?`,
    async () => {
      const confirmBtn = document.getElementById("modalConfirmBtn");
      await updateSettings(
        { action: "delete_classroom", name: name },
        confirmBtn,
      );
    },
    null,
    { isDelete: true, confirmText: "Supprimer" },
  );
}

// Group functions

function addGroup() {
  // Generate semester options from PAIRS
  const semesterOptions = availableSemesterPairs.length
    ? availableSemesterPairs
        .map(
          (p) =>
            `<div class="dropdown-item" data-value="${p.pair_id}" data-odd="${p.odd_semester.name}" data-even="${p.even_semester.name}">${p.display}</div>`,
        )
        .join("")
    : "";

  // Generate type options
  const typeOptions = availableGroupTypes
    .map(
      (t) =>
        `<div class="dropdown-item" data-value="${t}">${
          t.charAt(0).toUpperCase() + t.slice(1)
        }</div>`,
    )
    .join("");

  // Generate Parent Group options
  const parentOptions = availablePrincipaleGroups.length
    ? availablePrincipaleGroups
        .map(
          (g) =>
            `<div class="dropdown-item" data-value="${g.id}">${g.name} (${g.semester})</div>`,
        )
        .join("")
    : "";

  const html = `
        <div class="form-group">
            <div class="mb-1">
                <label class="form-label">Nom</label>
                <input type="text" id="addGroupName" class="form-input" placeholder="ex: Licence 1 - G1" required>
            </div>
            <div class="mb-1">
                <label class="form-label">Semestre (Année)</label>
                <div class="dropdown-container">
                    <button type="button" class="dropdown-button" data-dropdown-id="addGroupSemester">
                        <span class="dropdown-text">Choisir</span>
                        <div class="dropdown-arrow"></div>
                    </button>
                    <div class="dropdown-menu">
                        ${semesterOptions}
                    </div>
                </div>
            </div>
            <div class="mb-1">
                <label class="form-label">Type</label>
                <div class="dropdown-container">
                    <button type="button" class="dropdown-button" data-dropdown-id="addGroupType">
                        <span class="dropdown-text">Choisir</span>
                        <div class="dropdown-arrow"></div>
                    </button>
                    <div class="dropdown-menu">
                        ${typeOptions}
                    </div>
                </div>
            </div>
            <!-- Parent Group Dropdown (Always shown, disabled for Principale/Languages) -->
             <div class="mb-1" id="addGroupParentContainer">
                <label class="form-label">Groupe Parent</label>
                <div class="dropdown-container">
                    <button type="button" class="dropdown-button" data-dropdown-id="addGroupParent" disabled>
                        <span class="dropdown-text">Choisir un parent</span>
                        <div class="dropdown-arrow"></div>
                    </button>
                    <div class="dropdown-menu">
                         ${parentOptions}
                    </div>
                </div>
            </div>
            
             <!-- Specialite Semester Coverage (Disabled by default) -->
            <div class="mb-1" id="addGroupSemesterCoverageContainer">
                <label class="form-label">Couverture Semestrielle</label>
                <div class="radio-group animated-radios disabled-radios" id="addGroupSemesterCoverage">
                    <label class="radio-label">
                        <input type="radio" name="semesterCoverage" value="odd" checked disabled>
                        <span>Semestre Impair</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="semesterCoverage" value="even" disabled>
                        <span>Semestre Pair</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="semesterCoverage" value="both" disabled>
                        <span>Les deux semestres</span>
                    </label>
                    <div class="glider"></div>
                </div>
            </div>

            <div class="mb-1">
                <label class="form-label">Nombre d'étudiants</label>
                <input type="number" id="addGroupCapacity" class="form-input" placeholder="ex: 30" min="1" required>
            </div>
        </div>
    `;

  Modal.showContent("Ajouter un groupe", html, () => {
    if (window.customDropdown) {
      window.customDropdown.initContainer(document.getElementById("modalBody"));
    }

    // Handle "Autre" option selection & Parent visibility
    const handler = function (e) {
      if (e.detail.dropdownId === "addGroupType") {
        const parentBtn = document.querySelector(
          '[data-dropdown-id="addGroupParent"]',
        );
        const typeValue = e.detail.value;
        const coverageDiv = document.getElementById("addGroupSemesterCoverage");
        const coverageInputs = coverageDiv.querySelectorAll("input");

        // Specialite Logic: Enable radios only for Specialite
        if (typeValue === "specialite") {
          coverageDiv.classList.remove("disabled-radios");
          coverageInputs.forEach((i) => (i.disabled = false));
        } else {
          coverageDiv.classList.add("disabled-radios");
          coverageInputs.forEach((i) => (i.disabled = true));
        }

        // Parent Group Visibility Logic
        if (parentBtn) {
          // Disable for everything except "TD"
          const parentsToDisable = [
            "principale",
            "langues && ppp",
            "specialite",
          ];
          if (parentsToDisable.includes(typeValue)) {
            parentBtn.disabled = true;
            parentBtn.setAttribute("data-value", "");
            parentBtn.querySelector(".dropdown-text").textContent =
              "Choisir un parent";

            // Clear selected item in menu
            const menu = parentBtn
              .closest(".dropdown-container")
              .querySelector(".dropdown-menu");
            menu
              .querySelectorAll(".dropdown-item")
              .forEach((i) => i.classList.remove("selected"));
          } else {
            parentBtn.disabled = false;
          }
        }
      } else if (e.detail.dropdownId === "addGroupSemester") {
        // Update Radio Labels and Parent Filter
        const pairId = parseInt(e.detail.value);
        const pair = availableSemesterPairs.find((p) => p.pair_id === pairId);

        if (pair) {
          // Update Parent filtering based on current GLOBAL semester
          const parentBtn = document.querySelector(
            '[data-dropdown-id="addGroupParent"]',
          );
          if (parentBtn && !parentBtn.disabled) {
            let targetSemName =
              currentGlobalSemesterType === "impair"
                ? pair.odd_semester.name
                : pair.even_semester.name;

            const filteredParents = availablePrincipaleGroups.filter(
              (g) => g.semester === targetSemName,
            );

            const itemsHtml = filteredParents
              .map(
                (g) =>
                  `<div class="dropdown-item" data-value="${g.id}">${g.name} (${g.semester})</div>`,
              )
              .join("");

            parentBtn.setAttribute("data-value", "");
            parentBtn.querySelector(".dropdown-text").textContent =
              "Choisir un parent";
            if (window.customDropdown) {
              window.customDropdown.updateMenu("addGroupParent", itemsHtml);
            }
          }
        }
      }
    };
    document.addEventListener("dropdown-change", handler);

    const menu = document.getElementById("modalBody");
    const actions = document.createElement("div");
    actions.className = "grid grid-2 gap-2 mt-3";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-secondary w-100";
    cancelBtn.id = "modalCancelBtn";
    cancelBtn.textContent = "Annuler";
    cancelBtn.onclick = () => {
      document.removeEventListener("dropdown-change", handler);
      Modal.close();
    };

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-primary w-100";
    saveBtn.id = "modalConfirmBtn";
    saveBtn.textContent = "Ajouter";
    saveBtn.onclick = async () => {
      const name = document.getElementById("addGroupName").value.trim();

      if (!name) {
        Toast.error("Erreur", "Veuillez remplir les champs obligatoires.");
        return;
      }

      const typeBtn = document.querySelector(
        '[data-dropdown-id="addGroupType"]',
      );
      const parentBtn = document.querySelector(
        '[data-dropdown-id="addGroupParent"]',
      );

      let typeValue =
        typeBtn.getAttribute("data-value") ||
        typeBtn.querySelector(".dropdown-text").textContent;
      if (typeValue === "Choisir") {
        Toast.error("Erreur", "Veuillez choisir un type.");
        return;
      }

      const parentId = parentBtn ? parentBtn.getAttribute("data-value") : null;

      // Validate: if type is TD, parent must be selected
      if (typeValue.toLowerCase() === "td" && !parentId) {
        Toast.error(
          "Erreur",
          "Pour un groupe de type TD, vous devez sélectionner un groupe parent.",
        );
        return;
      }

      const capacityInput = document.getElementById("addGroupCapacity");
      const capacity = capacityInput ? parseInt(capacityInput.value) : 0;
      if (!capacity || isNaN(capacity) || capacity <= 0) {
        Toast.error(
          "Erreur",
          "Veuillez entrer un nombre d'étudiants valide (nombre positif).",
        );
        return;
      }

      // 1. Resolve Semester Pair
      const semBtn = document.querySelector(
        '[data-dropdown-id="addGroupSemester"]',
      );
      const pairId = parseInt(semBtn.getAttribute("data-value"));
      const pair = availableSemesterPairs.find((p) => p.pair_id === pairId);

      if (!pair) {
        Toast.error("Erreur", "Veuillez choisir un semestre (année).");
        return;
      }

      let finalSemesterName = "";
      let createNext = false;

      // 2. Logic to pick correct semester
      if (typeValue === "specialite") {
        const coverage = document.querySelector(
          'input[name="semesterCoverage"]:checked',
        ).value;
        if (coverage === "odd") {
          finalSemesterName = pair.odd_semester.name;
        } else if (coverage === "even") {
          finalSemesterName = pair.even_semester.name;
        } else if (coverage === "both") {
          finalSemesterName = pair.odd_semester.name;
          createNext = true;
        }
      } else {
        // Standard Group: Follow Global Setting
        if (currentGlobalSemesterType === "impair") {
          finalSemesterName = pair.odd_semester.name;
        } else {
          finalSemesterName = pair.even_semester.name;
        }
      }

      const success = await updateSettings(
        {
          action: "add_group",
          name: name,
          semester: finalSemesterName,
          /* type: typeValue,  <-- already defined above */

          type: typeValue,
          parent_group_id: parentId,
          capacity: capacity,
          create_next_semester: createNext,
        },
        saveBtn,
      );
      if (success) {
        document.removeEventListener("dropdown-change", handler);
        Modal.close();
      }
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    menu.appendChild(actions);
  });
}

function editGroup(id, name, semester, type, parentId, capacity) {
  // Added parentId
  // Check if type is a custom value
  const displayType = type.charAt(0).toUpperCase() + type.slice(1);

  // Generate semester options
  const semesterOptions = availableSemesters.length
    ? availableSemesters
        .map(
          (s) =>
            `<div class="dropdown-item ${s.name === semester ? "selected" : ""}" data-value="${s.name}">${s.name}</div>`,
        )
        .join("")
    : "";

  // Generate type options
  const typeOptions = availableGroupTypes
    .map(
      (t) =>
        `<div class="dropdown-item ${t === type ? "selected" : ""}" data-value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</div>`,
    )
    .join("");

  // Generate Parent Group options (filtered by current semester)
  // Find Parent Name for display if needed, but dropdown handles render
  const parentOptions = availablePrincipaleGroups.length
    ? availablePrincipaleGroups
        .filter((g) => g.semester === semester)
        .map(
          (g) =>
            `<div class="dropdown-item ${g.id == parentId ? "selected" : ""}" data-value="${g.id}">${g.name} (${g.semester})</div>`,
        )
        .join("")
    : "";

  // Resolve Parent Name for initial button text
  let parentName = "Choisir un parent";
  if (parentId) {
    const found = availablePrincipaleGroups.find((g) => g.id == parentId);
    if (found) parentName = `${found.name} (${found.semester})`;
  }

  // Check if parent should be disabled (Only enabled for TD)
  const parentsToDisable = ["principale", "langues && ppp", "specialite"];
  const isParentDisabled = parentsToDisable.includes(type.toLowerCase());

  const html = `
        <div class="form-group">
            <input type="hidden" id="editGroupId" value="${id}">
            <div class="mb-1">
                <label class="form-label">Nom</label>
                <input type="text" id="editGroupName" class="form-input" value="${name}" required>
            </div>
            <div class="mb-1">
                <label class="form-label">Semestre</label>
                <div class="dropdown-container">
                    <button type="button" class="dropdown-button" data-dropdown-id="editGroupSemester">
                        <span class="dropdown-text">${semester}</span>
                        <div class="dropdown-arrow"></div>
                    </button>
                    <div class="dropdown-menu">
                        ${semesterOptions}
                    </div>
                </div>
            </div>
            <div class="mb-1">
                <label class="form-label">Type</label>
                <div class="dropdown-container">
                    <button type="button" class="dropdown-button" data-dropdown-id="editGroupType" data-value="${type}">
                        <span class="dropdown-text">${displayType}</span>
                        <div class="dropdown-arrow"></div>
                    </button>
                    <div class="dropdown-menu">
                        ${typeOptions}
                    </div>
            </div>
            <!-- Parent Dropdown (Always shown, disabled for Principale/Languages) -->
            <div class="mb-1" id="editGroupParentContainer">
                <label class="form-label">Groupe Parent</label>
                <div class="dropdown-container">
                    <button type="button" class="dropdown-button" data-dropdown-id="editGroupParent" data-value="${parentId || ""}" ${isParentDisabled ? "disabled" : ""}>
                        <span class="dropdown-text">${parentName}</span>
                        <div class="dropdown-arrow"></div>
                    </button>
                    <div class="dropdown-menu">
                         ${parentOptions}
                    </div>
                </div>
            </div>
            <div class="mb-1">
                <label class="form-label">Nombre d'étudiants</label>
                <input type="number" id="editGroupCapacity" class="form-input" placeholder="ex: 30" min="1" value="${capacity || 0}" required>
            </div>
            
            <div class="mb-1" id="editGroupSemesterCoverageContainer">
                <label class="form-label">Couverture Semestrielle</label>
                <div class="radio-group animated-radios ${type === "specialite" ? "" : "disabled-radios"}" id="editGroupSemesterCoverage">
                    <label class="radio-label">
                        <input type="radio" name="editSemesterCoverage" value="odd" ${type === "specialite" ? "" : "disabled"}>
                        <span>Semestre Impair</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="editSemesterCoverage" value="even" ${type === "specialite" ? "" : "disabled"}>
                        <span>Semestre Pair</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="editSemesterCoverage" value="both" ${type === "specialite" ? "" : "disabled"}>
                        <span>Les deux semestres</span>
                    </label>
                    <div class="glider"></div>
                </div>
            </div>
        </div>
    `;
  Modal.showContent("Modifier le groupe", html, () => {
    if (window.customDropdown) {
      window.customDropdown.initContainer(document.getElementById("modalBody"));
    }

    // Initial Radio Setup for Edit
    const coverageContainer = document.getElementById(
      "editGroupSemesterCoverage",
    );
    if (coverageContainer) coverageContainer.classList.add("no-transition");

    const initialPair = availableSemesterPairs.find(
      (p) =>
        p.odd_semester.name === semester || p.even_semester.name === semester,
    );
    if (initialPair) {
      const radios = document.getElementsByName("editSemesterCoverage");

      if (type.toLowerCase() === "specialite") {
        const otherSemName =
          semester === initialPair.odd_semester.name
            ? initialPair.even_semester.name
            : initialPair.odd_semester.name;

        const targetParentId = parentId ? parseInt(parentId) : null;
        const hasBoth = allGroupsUnfiltered.some((g) => {
          const gParentId = g.parent_group_id
            ? parseInt(g.parent_group_id)
            : null;
          return (
            g.name === name &&
            g.type === "specialite" &&
            g.semester === otherSemName &&
            gParentId === targetParentId
          );
        });

        if (hasBoth) radios[2].checked = true;
        else if (semester === initialPair.odd_semester.name)
          radios[0].checked = true;
        else radios[1].checked = true;
      } else {
        // Standard pre-selection based on current semester
        if (semester === initialPair.odd_semester.name)
          radios[0].checked = true;
        else radios[1].checked = true;
      }
    }

    // Remove no-transition after a short delay to allow static initial render
    setTimeout(() => {
      if (coverageContainer)
        coverageContainer.classList.remove("no-transition");
    }, 100);

    // Handle "Autre" option selection & Parent visibility
    const handler = function (e) {
      if (e.detail.dropdownId === "editGroupType") {
        const parentBtn = document.querySelector(
          '[data-dropdown-id="editGroupParent"]',
        );
        const typeValue = e.detail.value;
        const coverageDiv = document.getElementById(
          "editGroupSemesterCoverage",
        );
        const coverageInputs = coverageDiv.querySelectorAll("input");

        // Specialite Logic: Enable radios only for Specialite
        if (typeValue === "specialite") {
          coverageDiv.classList.remove("disabled-radios");
          coverageInputs.forEach((i) => (i.disabled = false));
        } else {
          coverageDiv.classList.add("disabled-radios");
          coverageInputs.forEach((i) => (i.disabled = true));
        }

        // Parent Visibility
        if (parentBtn) {
          const parentsToDisable = [
            "principale",
            "langues && ppp",
            "specialite",
          ];
          if (parentsToDisable.includes(typeValue)) {
            parentBtn.disabled = true;
            parentBtn.setAttribute("data-value", "");
            parentBtn.querySelector(".dropdown-text").textContent =
              "Choisir un parent";
            const menu = parentBtn
              .closest(".dropdown-container")
              .querySelector(".dropdown-menu");
            menu
              .querySelectorAll(".dropdown-item")
              .forEach((i) => i.classList.remove("selected"));
          } else {
            parentBtn.disabled = false;
          }
        }
      } else if (e.detail.dropdownId === "editGroupSemester") {
        // Parent filtering logic would go here if needed in edit mode
      }
    };
    document.addEventListener("dropdown-change", handler);

    const menu = document.getElementById("modalBody");
    const actions = document.createElement("div");
    actions.className = "grid grid-2 gap-2 mt-3";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-secondary w-100";
    cancelBtn.id = "modalCancelBtn";
    cancelBtn.textContent = "Annuler";
    cancelBtn.onclick = () => {
      document.removeEventListener("dropdown-change", handler);
      Modal.close();
    };

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-primary w-100";
    saveBtn.id = "modalConfirmBtn";
    saveBtn.textContent = "Enregistrer";
    saveBtn.onclick = async () => {
      const newName = document.getElementById("editGroupName").value.trim();

      const semBtn = document.querySelector(
        '[data-dropdown-id="editGroupSemester"]',
      );
      const typeBtn = document.querySelector(
        '[data-dropdown-id="editGroupType"]',
      );
      const parentBtn = document.querySelector(
        '[data-dropdown-id="editGroupParent"]',
      );

      let newType =
        typeBtn.getAttribute("data-value") ||
        typeBtn.querySelector(".dropdown-text").textContent;

      const newParentId = parentBtn
        ? parentBtn.getAttribute("data-value")
        : null;

      // 1. Resolve Semester for Edit
      let finalNewSemester = "";
      const currentSemValue =
        semBtn.getAttribute("data-value") ||
        semBtn.querySelector(".dropdown-text").textContent;
      const currentPair = availableSemesterPairs.find(
        (p) =>
          p.odd_semester.name === currentSemValue ||
          p.even_semester.name === currentSemValue,
      );

      let coverageValue = null;
      if (newType.toLowerCase() === "specialite" && currentPair) {
        const selectedRadio = document.querySelector(
          'input[name="editSemesterCoverage"]:checked',
        );
        coverageValue = selectedRadio ? selectedRadio.value : null;

        console.log("Specialite coverage detection:", {
          newType,
          selectedRadio,
          coverageValue,
          currentPair,
        });

        if (coverageValue === "odd")
          finalNewSemester = currentPair.odd_semester.name;
        else if (coverageValue === "even")
          finalNewSemester = currentPair.even_semester.name;
        else finalNewSemester = currentPair.odd_semester.name;
      } else {
        finalNewSemester = currentSemValue;
      }

      // Validate: if type is TD, parent must be selected
      if (newType.toLowerCase() === "td" && !newParentId) {
        Toast.error(
          "Erreur",
          "Pour un groupe de type TD, vous devez sélectionner un groupe parent.",
        );
        return;
      }

      const capacityInput = document.getElementById("editGroupCapacity");
      const newCapacity = capacityInput ? parseInt(capacityInput.value) : 0;
      if (!newCapacity || isNaN(newCapacity) || newCapacity <= 0) {
        Toast.error(
          "Erreur",
          "Veuillez entrer un nombre d'étudiants valide (nombre positif).",
        );
        return;
      }

      // For specialite groups, also check if coverage changed
      let coverageChanged = false;
      if (
        newType.toLowerCase() === "specialite" &&
        coverageValue &&
        currentPair
      ) {
        // Determine the original coverage based on the ORIGINAL semester (not currentPair)
        // Find the pair that contains the original semester
        const originalPair = availableSemesterPairs.find(
          (p) =>
            p.odd_semester.name === semester ||
            p.even_semester.name === semester,
        );

        if (originalPair) {
          const otherSem =
            semester === originalPair.odd_semester.name
              ? originalPair.even_semester.name
              : originalPair.odd_semester.name;
          const targetParentId = parentId ? parseInt(parentId) : null;
          const hadBoth = allGroupsUnfiltered.some((g) => {
            const gParentId = g.parent_group_id
              ? parseInt(g.parent_group_id)
              : null;
            return (
              g.name === name &&
              g.type === "specialite" &&
              g.semester === otherSem &&
              gParentId === targetParentId
            );
          });

          const originalCoverage = hadBoth
            ? "both"
            : semester === originalPair.odd_semester.name
              ? "odd"
              : "even";
          coverageChanged = coverageValue !== originalCoverage;

          console.log("Coverage check:", {
            originalCoverage,
            newCoverage: coverageValue,
            coverageChanged,
            hadBoth,
            semester,
            otherSem,
          });
        }
      }

      // Check if anything changed
      const basicChanges =
        newName !== name ||
        finalNewSemester !== semester ||
        newType !== type ||
        newParentId != parentId ||
        newCapacity !== (capacity || 0);

      if (!basicChanges && !coverageChanged) {
        Toast.warning("Attention", "Aucune modification détectée");
        return;
      }

      console.log("Submitting edit_group:", {
        action: "edit_group",
        id: document.getElementById("editGroupId").value,
        name: newName,
        semester: finalNewSemester,
        type: newType,
        parent_group_id: newParentId,
        capacity: newCapacity,
        coverage: coverageValue,
      });

      const success = await updateSettings(
        {
          action: "edit_group",
          id: document.getElementById("editGroupId").value,
          name: newName,
          semester: finalNewSemester,
          type: newType,
          parent_group_id: newParentId,
          capacity: newCapacity,
          coverage: coverageValue,
        },
        saveBtn,
      );
      if (success) {
        document.removeEventListener("dropdown-change", handler);
        Modal.close();
      }
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    menu.appendChild(actions);
  });
}

function deleteGroup(id) {
  Modal.confirm(
    "Supprimer le groupe",
    `Voulez-vous vraiment supprimer ce groupe ?`,
    async () => {
      const confirmBtn = document.getElementById("modalConfirmBtn");
      await updateSettings({ action: "delete_group", id: id }, confirmBtn);
    },
    null,
    { isDelete: true, confirmText: "Supprimer" },
  );
}

// TimeSlot management

function editTimeSlot(id, range) {
  const times = range.split("-");
  const startParts = times[0].split(":");
  const endParts = times.length > 1 ? times[1].split(":") : ["", ""];

  const html = `
        <div class="form-group">
            <label class="form-label">Créneau horaire</label>
            <div class="smart-time-input">
                <input type="text" maxlength="2" id="startHH" value="${
                  startParts[0] || "08"
                }" placeholder="HH">
                <span>:</span>
                <input type="text" maxlength="2" id="startMM" value="${
                  startParts[1] || "00"
                }" placeholder="MM">
                <span class="mx-1">-</span>
                <input type="text" maxlength="2" id="endHH" value="${
                  endParts[0] || "10"
                }" placeholder="HH">
                <span>:</span>
                <input type="text" maxlength="2" id="endMM" value="${
                  endParts[1] || "00"
                }" placeholder="MM">
            </div>
        </div>
    `;
  Modal.showContent("Modifier le créneau", html, () => {
    const menu = document.getElementById("modalBody");
    const actions = document.createElement("div");
    actions.className = "grid grid-2 gap-2 mt-3";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-secondary w-100";
    cancelBtn.id = "modalCancelBtn";
    cancelBtn.textContent = "Annuler";
    cancelBtn.onclick = () => Modal.close();

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-primary w-100";
    saveBtn.id = "modalConfirmBtn";
    saveBtn.textContent = "Enregistrer";
    saveBtn.onclick = async () => {
      const startHH = document.getElementById("startHH").value.padStart(2, "0");
      const startMM = document.getElementById("startMM").value.padStart(2, "0");
      const endHH = document.getElementById("endHH").value.padStart(2, "0");
      const endMM = document.getElementById("endMM").value.padStart(2, "0");

      const newRange = `${startHH}:${startMM}-${endHH}:${endMM}`;

      if (newRange === range) {
        Toast.warning("Attention", "Aucune modification détectée");
        return;
      }

      const success = await updateSettings(
        { action: "edit_timeslot", id, range: newRange },
        saveBtn,
      );
      if (success) Modal.close();
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    menu.appendChild(actions);

    // Auto-focus move logic
    const inputs = menu.querySelectorAll(".smart-time-input input");
    inputs.forEach((input, index) => {
      input.addEventListener("input", (e) => {
        if (input.value.length === 2 && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      });
      input.addEventListener("keypress", (e) => {
        if (!/[0-9]/.test(e.key)) e.preventDefault();
      });
    });
  });
}

function deleteTimeSlot(id) {
  Modal.confirm(
    "Supprimer le crÃ©neau",
    "Voulez-vous vraiment supprimer ce crÃ©neau horaire ?",
    async () => {
      await updateSettings({ action: "delete_timeslot", id });
    },
    null,
    { isDelete: true, confirmText: "Supprimer" },
  );
}

// Semester management functions
function renderSemesters(semesters) {
  const list = document.getElementById("semestersList");
  if (!list) return;

  list.innerHTML = semesters
    .map((sem) => {
      const safeName = escapeHtml(sem.name);
      const safeDisplay = escapeHtml(sem.display_name);
      const safeNameJs = escapeJsArg(sem.name);
      const safeDisplayJs = escapeJsArg(sem.display_name);

      return `
            <div class="settings-item">
                <div>
                    <span class="font-semibold">${safeName}</span>
                    <span class="text-muted ml-1">(${safeDisplay})</span>
                </div>
                <div class="settings-item-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editSemester(${sem.id}, '${safeNameJs}', '${safeDisplayJs}')">Modifier</button>
                </div>
            </div>
        `;
    })
    .join("");
}

function updateSemesterDropdown(semesters) {
  const menu = document.getElementById("semesterDropdownMenu");
  if (!menu || !semesters || semesters.length === 0) return;

  // Filter semesters into Odd and Even based on their number
  const odds = semesters
    .filter((s) => {
      const match = s.name.match(/\d+/);
      return match && parseInt(match[0]) % 2 !== 0;
    })
    .map((s) => s.name);

  const evens = semesters
    .filter((s) => {
      const match = s.name.match(/\d+/);
      return match && parseInt(match[0]) % 2 === 0;
    })
    .map((s) => s.name);

  // Generate display text
  const oddText = odds.length > 0 ? odds.join(", ") : "S1, S3, S5...";
  const evenText = evens.length > 0 ? evens.join(", ") : "S2, S4, S6...";

  const newHtml = `
        <div class="dropdown-item" data-value="Odd">Impair (${oddText})</div>
        <div class="dropdown-item" data-value="Even">Pair (${evenText})</div>
    `;

  // Use the custom dropdown instance to update menu and re-attach listeners
  if (window.customDropdown) {
    window.customDropdown.updateMenu("semesterSelect", newHtml);
  } else {
    menu.innerHTML = newHtml;
  }
}

function editSemester(id, name, displayName) {
  const html = `
        <div class="form-group">
            <div class="mb-1">
                <label class="form-label">Code du semestre</label>
                <input type="text" id="editSemesterName" class="form-input" value="${name}" required>
            </div>
            <div class="mb-1">
                <label class="form-label">Nom d'affichage</label>
                <input type="text" id="editSemesterDisplay" class="form-input" value="${displayName}" required>
            </div>
        </div>
    `;
  Modal.showContent("Modifier le semestre", html, () => {
    const menu = document.getElementById("modalBody");
    const actions = document.createElement("div");
    actions.className = "grid grid-2 gap-2 mt-3";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-secondary w-100";
    cancelBtn.id = "modalCancelBtn";
    cancelBtn.textContent = "Annuler";
    cancelBtn.onclick = () => Modal.close();

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-primary w-100";
    saveBtn.id = "modalConfirmBtn";
    saveBtn.textContent = "Enregistrer";
    saveBtn.onclick = async () => {
      const newName = document.getElementById("editSemesterName").value.trim();
      const newDisplayName = document
        .getElementById("editSemesterDisplay")
        .value.trim();

      if (!newName || !newDisplayName) {
        Toast.error("Erreur", "Veuillez remplir tous les champs.");
        return;
      }

      if (newName === name && newDisplayName === displayName) {
        Toast.warning("Attention", "Aucune modification détectée");
        return;
      }

      const success = await updateSettings(
        {
          action: "edit_semester",
          id,
          name: newName,
          display_name: newDisplayName,
        },
        saveBtn,
      );
      if (success) Modal.close();
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    menu.appendChild(actions);
  });
}
