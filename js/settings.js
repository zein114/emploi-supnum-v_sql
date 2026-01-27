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
let availableGroupTypes = ["principale", "TD"]; // Default fallback

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

    // Always update semesters if they are returned (even if not 'general' tab, if API sends them)
    if (result.semesters) {
      availableSemesters = result.semesters;
    }

    // Update group types (if sent by API)
    if (result.group_types) {
      availableGroupTypes = result.group_types;
      // Ensure defaults are present if array is empty
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
      // Note: API needs to return current_semester_type in get_settings response
      // I should update get_settings.php if it doesn't return it yet, but it returns all settings keys.
      // Let's assume result.current_semester_type exists or default 'impair'
      const typeValue = result.current_semester_type || "impair";
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
      const code = (g.code || g.A || "").trim();
      const name = (g.name || g.B || "").trim();
      const semester = (g.semester || g.C || "").trim();
      const type = (g.type || g.D || "").trim();
      const speciality = (g.speciality || g.E || "").trim();
      const capacity = g.capacity || g.G || 0;

      const safeCodeHtml = escapeHtml(code);
      const safeNameHtml = escapeHtml(name);
      const safeSemesterHtml = escapeHtml(semester);
      const safeTypeHtml = escapeHtml(type);
      const safeSpecialityHtml = escapeHtml(speciality);

      const safeCodeJs = escapeJsArg(code);
      const safeNameJs = escapeJsArg(name);
      const safeSemesterJs = escapeJsArg(semester);
      const safeTypeJs = escapeJsArg(type);
      const safeSpecialityJs = escapeJsArg(speciality);
      const safeCapacityJs = escapeJsArg(capacity);

      return `
            <tr>
                <td class="font-semibold">${safeNameHtml}</td>
                <td><span class="badge badge-warning">${safeSemesterHtml}</span></td>
                <td>${type}</td>
                <td>${safeSpecialityHtml}</td>
                <td>${capacity}</td>
                <td>
                    <div class="settings-item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editGroup('${safeCodeJs}', '${safeCodeJs}', '${safeNameJs}', '${safeSemesterJs}', '${safeTypeJs}', '${safeSpecialityJs}', '${safeCapacityJs}')">Modifier</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteGroup('${safeCodeJs}')">Supprimer</button>
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
  // Generate semester options
  const semesterOptions = availableSemesters.length
    ? availableSemesters
        .map(
          (s) =>
            `<div class="dropdown-item" data-value="${s.name}">${s.name}</div>`,
        )
        .join("")
    : "";

  // Generate type options
  const typeOptions =
    availableGroupTypes
      .map(
        (t) =>
          `<div class="dropdown-item" data-value="${t}">${
            t.charAt(0).toUpperCase() + t.slice(1)
          }</div>`,
      )
      .join("") +
    `<div class="dropdown-item" data-value="autre">Autre...</div>`;

  const html = `
        <div class="form-group">
            <div class="mb-1">
                <label class="form-label">Code du groupe</label>
                <input type="text" id="addGroupCode" class="form-input" placeholder="ex: L1_G1" required>
            </div>
            <div class="mb-1">
                <label class="form-label">Nom</label>
                <input type="text" id="addGroupName" class="form-input" placeholder="ex: Licence 1 - G1" required>
            </div>
            <div class="mb-1">
                <label class="form-label">Semestre</label>
                <div class="dropdown-container">
                    <button type="button" class="dropdown-button" data-dropdown-id="addGroupSemester">
                        <span class="dropdown-text">Choisir...</span>
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
                        <span class="dropdown-text">Choisir...</span>
                        <div class="dropdown-arrow"></div>
                    </button>
                    <div class="dropdown-menu">
                        ${typeOptions}
                    </div>
                </div>
            </div>
            <div class="mb-1" id="addGroupCustomTypeContainer" style="display: none;">
                <label class="form-label">Type personnalisé</label>
                <input type="text" id="addGroupCustomType" class="form-input" placeholder="ex: Languages...">
            </div>
            <div class="mb-1">
                <label class="form-label">Spécialité</label>
                <input type="text" id="addGroupSpeciality" class="form-input" placeholder="ex: Informatique">
            </div>
             <div class="mb-1">
                <label class="form-label">Nombre d'étudiants</label>
                <input type="number" step="1" id="addGroupCapacity" class="form-input" placeholder="ex: 40" required>
            </div>
        </div>
    `;

  Modal.showContent("Ajouter un groupe", html, () => {
    if (window.customDropdown) {
      window.customDropdown.initContainer(document.getElementById("modalBody"));
    }

    // Handle "Autre" option selection
    const handler = function (e) {
      if (e.detail.dropdownId === "addGroupType") {
        const customContainer = document.getElementById(
          "addGroupCustomTypeContainer",
        );
        if (customContainer) {
          if (e.detail.value === "autre") {
            customContainer.style.display = "block";
            document.getElementById("addGroupCustomType").focus();
          } else {
            customContainer.style.display = "none";
            document.getElementById("addGroupCustomType").value = "";
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
      const code = document.getElementById("addGroupCode").value.trim();
      const name = document.getElementById("addGroupName").value.trim();
      const capacityInput = document.getElementById("addGroupCapacity").value;

      if (!code || !name) {
        Toast.error("Erreur", "Veuillez remplir les champs obligatoires.");
        return;
      }

      if (
        capacityInput === "" ||
        isNaN(capacityInput) ||
        parseInt(capacityInput) < 0
      ) {
        Toast.error("Erreur", "Veuillez entrer une capacité valide.");
        return;
      }

      const semBtn = document.querySelector(
        '[data-dropdown-id="addGroupSemester"]',
      );
      const typeBtn = document.querySelector(
        '[data-dropdown-id="addGroupType"]',
      );

      const semester =
        semBtn.getAttribute("data-value") ||
        semBtn.querySelector(".dropdown-text").textContent;
      if (semester === "Choisir...") {
        Toast.error("Erreur", "Veuillez choisir un semestre.");
        return;
      }

      let typeValue =
        typeBtn.getAttribute("data-value") ||
        typeBtn.querySelector(".dropdown-text").textContent;
      if (typeValue === "Choisir...") {
        Toast.error("Erreur", "Veuillez choisir un type.");
        return;
      }

      if (typeValue === "autre") {
        typeValue = document.getElementById("addGroupCustomType").value.trim();
        if (!typeValue) {
          Toast.error("Erreur", "Veuillez saisir un type personnalisé.");
          return;
        }
      }

      const success = await updateSettings(
        {
          action: "add_group",
          code: code,
          name: name,
          semester: semester,
          type: typeValue,
          speciality: document.getElementById("addGroupSpeciality").value,
          capacity: parseInt(capacityInput),
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

function editGroup(old_code, code, name, semester, type, speciality, capacity) {
  // Check if type is a custom value (not in predefined list - currently checking against availableGroupTypes)
  const isCustomType =
    !availableGroupTypes.includes(type) &&
    !["autre", "Autre..."].includes(type);
  const displayType = isCustomType
    ? "Autre..."
    : type.charAt(0).toUpperCase() + type.slice(1);
  const customTypeValue = isCustomType ? type : "";

  // Generate semester options
  const semesterOptions = availableSemesters.length
    ? availableSemesters
        .map(
          (s) =>
            `<div class="dropdown-item ${
              s.name === semester ? "selected" : ""
            }" data-value="${s.name}">${s.name}</div>`,
        )
        .join("")
    : "";

  // Generate type options
  const typeOptions =
    availableGroupTypes
      .map(
        (t) =>
          `<div class="dropdown-item ${
            t === type ? "selected" : ""
          }" data-value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</div>`,
      )
      .join("") +
    `<div class="dropdown-item ${
      isCustomType ? "selected" : ""
    }" data-value="autre">Autre...</div>`;

  const html = `
        <div class="form-group">
            <input type="hidden" id="editGroupOldCode" value="${old_code}">
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
                    <button type="button" class="dropdown-button" data-dropdown-id="editGroupType">
                        <span class="dropdown-text">${
                          isCustomType ? "Autre..." : displayType
                        }</span>
                        <div class="dropdown-arrow"></div>
                    </button>
                    <div class="dropdown-menu">
                        ${typeOptions}
                    </div>
                </div>
            </div>
            <div class="mb-1" id="editGroupCustomTypeContainer" style="display: ${
              isCustomType ? "block" : "none"
            };">
                <label class="form-label">Type personnalisé</label>
                <input type="text" id="editGroupCustomType" class="form-input" value="${customTypeValue}" placeholder="ex: Languages...">
            </div>
            <div class="mb-1">
                <label class="form-label">Spécialité</label>
                <input type="text" id="editGroupSpeciality" class="form-input" value="${speciality}">
            </div>
             <div class="mb-1">
                <label class="form-label">Nombre d'étudiants</label>
                <input type="number" step="1" id="editGroupCapacity" class="form-input" value="${capacity}" required>
            </div>
        </div>
    `;
  Modal.showContent("Modifier le groupe", html, () => {
    if (window.customDropdown) {
      window.customDropdown.initContainer(document.getElementById("modalBody"));
    }

    // Handle "Autre" option selection
    const handler = function (e) {
      if (e.detail.dropdownId === "editGroupType") {
        const customContainer = document.getElementById(
          "editGroupCustomTypeContainer",
        );
        if (customContainer) {
          if (e.detail.value === "autre") {
            customContainer.style.display = "block";
            document.getElementById("editGroupCustomType").focus();
          } else {
            customContainer.style.display = "none";
            document.getElementById("editGroupCustomType").value = "";
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
    saveBtn.textContent = "Enregistrer";
    saveBtn.onclick = async () => {
      const newName = document.getElementById("editGroupName").value.trim();
      const capacityInput = document.getElementById("editGroupCapacity").value;
      const newCapacity = parseInt(capacityInput);

      const semBtn = document.querySelector(
        '[data-dropdown-id="editGroupSemester"]',
      );
      const typeBtn = document.querySelector(
        '[data-dropdown-id="editGroupType"]',
      );

      const newSemester =
        semBtn.getAttribute("data-value") ||
        semBtn.querySelector(".dropdown-text").textContent;

      let newType =
        typeBtn.getAttribute("data-value") ||
        typeBtn.querySelector(".dropdown-text").textContent;
      if (newType === "autre" || newType === "Autre...") {
        newType = document.getElementById("editGroupCustomType").value.trim();
      }

      const newSpeciality = document.getElementById(
        "editGroupSpeciality",
      ).value;

      // Check if anything changed
      if (
        newName === name &&
        newCapacity === parseInt(capacity) &&
        newSemester === semester &&
        newType === type &&
        newSpeciality === speciality
      ) {
        Toast.warning("Attention", "Aucune modification détectée");
        return;
      }

      if (capacityInput === "" || isNaN(capacityInput) || newCapacity < 0) {
        Toast.error(
          "Erreur",
          "Veuillez entrer une capacité valide (nombre positif ou 0).",
        );
        return;
      }

      if (!newType && (newType === "autre" || newType === "Autre...")) {
        Toast.error("Erreur", "Veuillez saisir un type personnalisé.");
        return;
      }

      const success = await updateSettings(
        {
          action: "edit_group",
          old_code: document.getElementById("editGroupOldCode").value,
          code: document.getElementById("editGroupOldCode").value,
          name: newName,
          semester: newSemester,
          type: newType,
          speciality: newSpeciality,
          capacity: newCapacity,
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

function deleteGroup(code) {
  Modal.confirm(
    "Supprimer le groupe",
    `Voulez-vous vraiment supprimer le groupe avec le code "${code}" ?`,
    async () => {
      const confirmBtn = document.getElementById("modalConfirmBtn");
      await updateSettings({ action: "delete_group", code: code }, confirmBtn);
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
