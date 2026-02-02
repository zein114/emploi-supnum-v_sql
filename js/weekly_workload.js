document.addEventListener("DOMContentLoaded", function () {
  // Load saved semester
  const savedSemester =
    localStorage.getItem("weekly_workload_semester") || "all";
  const semesterBtn = document.getElementById("semesterFilterBtn");
  if (semesterBtn) {
    semesterBtn.setAttribute("data-value", savedSemester);
    const text =
      savedSemester === "all"
        ? "Tous les semestres"
        : "Semestre " + savedSemester;
    const textSpan = semesterBtn.querySelector(".dropdown-text");
    if (textSpan) textSpan.textContent = text;

    // Update selected class in menu
    const menu = semesterBtn
      .closest(".dropdown-container")
      .querySelector(".dropdown-menu");
    if (menu) {
      menu.querySelectorAll(".dropdown-item").forEach((item) => {
        item.classList.toggle(
          "selected",
          item.getAttribute("data-value") === savedSemester,
        );
      });
    }
  }

  loadAllData();

  // Global Save button (main table)
  const saveBtn = document.getElementById("saveWorkloadBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveWorkloadData);
  }

  // Pre-fetch search input listener
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", filterTable);
  }

  // Semester dropdown change listener
  document.addEventListener("dropdown-change", function (e) {
    if (e.detail.dropdownId === "semesterFilter") {
      localStorage.setItem("weekly_workload_semester", e.detail.value);
      renderTable(originalData);
    }
  });
});

let originalData = [];
let availableGroups = [];

async function loadAllData() {
  const tableBody = document.getElementById("workloadTableBody");
  tableBody.innerHTML =
    '<tr><td colspan="7" class="text-center" style="padding: 2rem;">Chargement des données...</td></tr>';

  try {
    const responseWL = await fetch("../api/get_weekly_workload.php");
    const resultWL = await responseWL.json();
    if (!responseWL.ok)
      throw new Error(resultWL.error || "Échec chargement charges");
    originalData = resultWL.data;

    const responseGR = await fetch("../api/get_groups.php");
    const resultGR = await responseGR.json();
    if (!responseGR.ok)
      throw new Error(resultGR.error || "Échec chargement groupes");

    availableGroups = resultGR
      .map((g) => ({
        code: String(g.code || ""),
        name: String(g.name || ""),
        semester: String(g.semester || ""),
      }))
      .filter((g) => g.code);

    renderTable(originalData);
  } catch (error) {
    console.error("Error:", error);
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-error" style="padding: 2rem;">Erreur : ${error.message}</td></tr>`;
    if (typeof Toast !== "undefined") Toast.error(error.message);
  }
}

function renderTable(data) {
  const tableBody = document.getElementById("workloadTableBody");
  tableBody.innerHTML = "";

  const semesterBtn = document.getElementById("semesterFilterBtn");
  const selectedSemester = semesterBtn
    ? semesterBtn.getAttribute("data-value")
    : "all";

  // Filter for General workloads (code_groupe is empty) and Semester
  const generalRows = data.filter((row) => {
    const isGeneral = !row.code_groupe || row.code_groupe === "";
    if (!isGeneral) return false;

    if (selectedSemester === "all") return true;

    // Support both numeric and 'S' prefix (e.g., '1' or 'S1')
    const rowSem = String(row.semester || "").replace(/\D/g, "");
    return rowSem === selectedSemester;
  });

  if (generalRows.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="7" class="text-center" style="padding: 2rem;">Aucun module trouvé</td></tr>';
    return;
  }

  const shownModules = new Set();
  generalRows.forEach((row) => {
    if (shownModules.has(row.code)) return;
    shownModules.add(row.code);

    // Find index in originalData
    const dataIndex = data.findIndex(
      (d) => d.code === row.code && (!d.code_groupe || d.code_groupe === ""),
    );

    const isSingleGroup = row.assigned_group_count === 1;
    const isUnassigned = row.assigned_group_count === 0;

    const tr = document.createElement("tr");
    tr.dataset.index = dataIndex;

    tr.innerHTML = `
        <td class="code-col">
          <strong>${row.code} - ${row.nom}</strong>
          ${isUnassigned ? '<span class="unassigned-note">Ce module n\'a pas encore été affecté</span>' : ""}
        </td>
        <td class="workload-col">
            <div class="input-stack">
                <input type="number" min="0" step="1" class="workload-input"
                    value="${row.cm}" data-field="cm" data-index="${dataIndex}" ${isUnassigned ? "disabled" : ""}>
                ${
                  isSingleGroup
                    ? `<input type="number" min="0" step="1" class="workload-input online-input"
                    value="${row.online_cm || 0}" data-field="online_cm" data-index="${dataIndex}" placeholder="En ligne CM">`
                    : ""
                }
            </div>
        </td>
        <td class="workload-col">
            <div class="input-stack">
                <input type="number" min="0" step="1" class="workload-input"
                    value="${row.td}" data-field="td" data-index="${dataIndex}" ${isUnassigned ? "disabled" : ""}>
                ${
                  isSingleGroup
                    ? `<input type="number" min="0" step="1" class="workload-input online-input"
                    value="${row.online_td || 0}" data-field="online_td" data-index="${dataIndex}" placeholder="En ligne TD">`
                    : ""
                }
            </div>
        </td>
        <td class="workload-col">
            <div class="input-stack">
                <input type="number" min="0" step="1" class="workload-input"
                    value="${row.tp}" data-field="tp" data-index="${dataIndex}" ${isUnassigned ? "disabled" : ""}>
                ${
                  isSingleGroup
                    ? `<input type="number" min="0" step="1" class="workload-input online-input"
                    value="${row.online_tp || 0}" data-field="online_tp" data-index="${dataIndex}" placeholder="En ligne TP">`
                    : ""
                }
            </div>
        </td>
        <td class="status-col" style="text-align: center; width: 120px;">
            <button class="btn btn-secondary btn-sm" onclick="openExcludeModal(this, '${
              row.code
            }', '${row.nom}', '${row.semester}')" style="width: 100%; ${
              isSingleGroup || isUnassigned ? "display: none;" : ""
            }">
                spécifier
            </button>
        </td>
         <td class="status-col">
            <span class="status-indicator"></span>
        </td>
    `;
    tableBody.appendChild(tr);
  });

  attachInputListeners();
  filterTable();
}

function attachInputListeners() {
  document.querySelectorAll(".workload-input").forEach((input) => {
    input.addEventListener("input", function () {
      const row = this.closest("tr");
      const index = row.dataset.index;
      const originalRow = originalData[index];
      if (!originalRow) return;

      const currentCM =
        parseFloat(row.querySelector('[data-field="cm"]').value) || 0;
      const currentTD =
        parseFloat(row.querySelector('[data-field="td"]').value) || 0;
      const currentTP =
        parseFloat(row.querySelector('[data-field="tp"]').value) || 0;

      const onlineCMInput = row.querySelector('[data-field="online_cm"]');
      const onlineTDInput = row.querySelector('[data-field="online_td"]');
      const onlineTPInput = row.querySelector('[data-field="online_tp"]');

      const currentOnlineCM = onlineCMInput
        ? parseFloat(onlineCMInput.value) || 0
        : parseFloat(originalRow.online_cm) || 0;
      const currentOnlineTD = onlineTDInput
        ? parseFloat(onlineTDInput.value) || 0
        : parseFloat(originalRow.online_td) || 0;
      const currentOnlineTP = onlineTPInput
        ? parseFloat(onlineTPInput.value) || 0
        : parseFloat(originalRow.online_tp) || 0;

      const isModified =
        currentCM !== parseFloat(originalRow.cm) ||
        currentTD !== parseFloat(originalRow.td) ||
        currentTP !== parseFloat(originalRow.tp) ||
        currentOnlineCM !== (parseFloat(originalRow.online_cm) || 0) ||
        currentOnlineTD !== (parseFloat(originalRow.online_td) || 0) ||
        currentOnlineTP !== (parseFloat(originalRow.online_tp) || 0);

      const indicator = row.querySelector(".status-indicator");
      if (isModified) {
        indicator.textContent = "Modifié";
        indicator.style.color = "var(--color-primary-blue-light)";
      } else {
        indicator.textContent = "";
      }
    });
  });
}

let initialExclusionsState = "[]";

function openExcludeModal(btn, code, name, semester) {
  if (typeof Spinner !== "undefined") Spinner.show(btn);

  const title = "Gérer les exclusions";
  const html = `
    <div class="mb-4">
        <label class="form-label" style="font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem; display: block;">Module</label>
        <div class="modal-subject-info">${code} - ${name} (${semester})</div>
        <input type="hidden" id="modalModuleCode" value="${code}">
        <input type="hidden" id="modalModuleSemester" value="${semester}">
    </div>

    <div id="exclusionsList" style="margin-top: 1.5rem;">
        <!-- Exclusions rows will be added here -->
    </div>

    <div class="add-another-btn-wrapper">
        <button type="button" id="addAnotherGroupBtn" class="btn btn-secondary" style="width: 100%;">
            + Ajouter un autre groupe
        </button>
    </div>

    <div class="modal-footer-actions">
        <button type="button" id="saveExclusionsBtn" class="btn btn-primary">Enregistrer les exclusions</button>
    </div>
  `;

  if (typeof Modal !== "undefined") {
    Modal.showContent(title, html, () => {
      const container = document.getElementById("exclusionsList");
      const exclusions = originalData.filter(
        (d) => d.code === code && d.code_groupe,
      );

      // Find subject info to get assigned group codes
      const subjectInfo = originalData.find((d) => d.code === code);
      const assignedGroupCodes = subjectInfo
        ? subjectInfo.assigned_group_codes
        : "";

      if (exclusions.length === 0) {
        container.innerHTML =
          '<p class="text-secondary text-center" style="padding: 1rem;">Aucune exclusion pour ce module.</p>';
      } else {
        exclusions.forEach((ex) => addExclusionRow(ex, assignedGroupCodes));
      }

      // Store initial state for change detection
      initialExclusionsState = JSON.stringify(
        exclusions.map((ex) => ({
          code_groupe: String(ex.code_groupe || ""),
          cm: parseFloat(ex.cm || 0),
          td: parseFloat(ex.td || 0),
          tp: parseFloat(ex.tp || 0),
          online_cm: parseFloat(ex.online_cm || 0),
          online_td: parseFloat(ex.online_td || 0),
          online_tp: parseFloat(ex.online_tp || 0),
        })),
      );

      // Re-attach modal specific listeners
      const addBtn = document.getElementById("addAnotherGroupBtn");
      const saveBtn = document.getElementById("saveExclusionsBtn");

      if (addBtn)
        addBtn.onclick = () => addExclusionRow(null, assignedGroupCodes);
      if (saveBtn) saveBtn.onclick = saveExclusions;

      if (typeof Spinner !== "undefined") Spinner.hide(btn);
    });
  } else {
    console.error("Global Modal system not found");
  }
}

function addExclusionRow(data = null, assignedGroupCodes = "") {
  const container = document.getElementById("exclusionsList");

  // Remove "no exclusions" text if present
  const emptyMsg = container.querySelector("p");
  if (emptyMsg) emptyMsg.remove();

  const rowId = "dropdown-" + Math.random().toString(36).substr(2, 9);
  const div = document.createElement("div");
  div.className = "exclusion-item";
  div.id = `ex-row-${rowId}`;

  const moduleSemester = document.getElementById("modalModuleSemester").value;
  const assignedCodesArray = assignedGroupCodes
    ? assignedGroupCodes.split(",")
    : [];

  const filteredGroups = availableGroups.filter((g) => {
    const semMatch = String(g.semester) === String(moduleSemester);
    const assignedMatch =
      assignedCodesArray.length > 0
        ? assignedCodesArray.includes(String(g.code))
        : true;
    return semMatch && assignedMatch;
  });
  const sortedGroups = [...filteredGroups].sort((a, b) =>
    String(a.code).localeCompare(String(b.code), undefined, { numeric: true }),
  );

  let menuOptions = "";
  let selectedGroupName = "Sélectionner un groupe";
  let selectedGroupValue = "";

  sortedGroups.forEach((g) => {
    const isSelected = data && String(data.code_groupe) === String(g.code);
    if (isSelected) {
      selectedGroupName = g.name;
      selectedGroupValue = g.code;
    }
    menuOptions += `<div class="dropdown-item ${
      isSelected ? "selected" : ""
    }" data-value="${g.code}">${g.name}</div>`;
  });

  div.innerHTML = `
        <div class="exclusion-header" style="margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
             <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="display:block; margin-bottom:4px; font-weight:600;">Choix du Groupe</label>
                <div class="dropdown-container" style="width: 100%;">
                    <button type="button" class="dropdown-button" data-dropdown-id="${rowId}" data-value="${selectedGroupValue}" style="width: 100%; text-align: left; justify-content: space-between;">
                        <span class="dropdown-text">${selectedGroupName}</span>
                        <div class="dropdown-arrow"></div>
                    </button>
                    <div class="dropdown-menu">
                        ${menuOptions}
                    </div>
                </div>
            </div>
            <button type="button" class="remove-exclusion" onclick="this.closest('.exclusion-item').remove()" style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 1.5rem; color: #666; cursor: pointer;">
                &times;
            </button>
        </div>

        <div class="exclusion-inputs-grid" style="display: flex; flex-direction: column; gap: 10px;">
            <!-- Présentiel Row -->
            <div class="hours-row" style="display: flex; align-items: center; gap: 10px;">
                <div class="row-label" style="width: 80px; font-weight: 500; font-size: 0.9rem; color: var(--text-primary);">Présentiel</div>
                <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.75rem; color: var(--text-secondary);">CM</label>
                        <input type="number" step="1" class="form-input ex-cm" value="${data ? data.cm : 0}" style="width: 100%;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.75rem; color: var(--text-secondary);">TD</label>
                        <input type="number" step="1" class="form-input ex-td" value="${data ? data.td : 0}" style="width: 100%;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.75rem; color: var(--text-secondary);">TP</label>
                        <input type="number" step="1" class="form-input ex-tp" value="${data ? data.tp : 0}" style="width: 100%;">
                    </div>
                </div>
            </div>

            <!-- En ligne Row -->
            <div class="hours-row" style="display: flex; align-items: center; gap: 10px;">
                <div class="row-label" style="width: 80px; font-weight: 500; font-size: 0.9rem;">En ligne</div>
                <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.75rem; color: var(--text-secondary);">CM</label>
                        <input type="number" step="1" class="form-input ex-online-cm" value="${data ? data.online_cm : 0}" style="width: 100%;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.75rem; color: var(--text-secondary);">TD</label>
                        <input type="number" step="1" class="form-input ex-online-td" value="${data ? data.online_td : 0}" style="width: 100%;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.75rem; color: var(--text-secondary);">TP</label>
                        <input type="number" step="1" class="form-input ex-online-tp" value="${data ? data.online_tp : 0}" style="width: 100%;">
                    </div>
                </div>
            </div>
        </div>
    `;
  container.appendChild(div);

  // Initialize the new dropdown
  if (window.customDropdown) {
    window.customDropdown.initContainer(div);
  }
}

async function saveExclusions() {
  const saveBtn = document.getElementById("saveExclusionsBtn");
  const codeInput = document.getElementById("modalModuleCode");
  if (!codeInput) return;
  const code = codeInput.value;
  const container = document.getElementById("exclusionsList");
  const rows = container.querySelectorAll(".exclusion-item");

  const updates = [];
  const usedGroups = new Set();
  let hasEmpty = false;

  rows.forEach((row) => {
    const dropdownBtn = row.querySelector(".dropdown-button");
    const groupCode = dropdownBtn
      ? dropdownBtn.getAttribute("data-value")
      : null;

    if (!groupCode || groupCode === "") {
      hasEmpty = true;
      return;
    }
    if (usedGroups.has(groupCode)) {
      Toast.error(`Le groupe ${groupCode} est sélectionné plusieurs fois.`);
      return;
    }
    usedGroups.add(groupCode);

    updates.push({
      code: code,
      code_groupe: groupCode,
      cm: parseFloat(row.querySelector(".ex-cm").value) || 0,
      td: parseFloat(row.querySelector(".ex-td").value) || 0,
      tp: parseFloat(row.querySelector(".ex-tp").value) || 0,
      cm: parseFloat(row.querySelector(".ex-cm").value) || 0,
      td: parseFloat(row.querySelector(".ex-td").value) || 0,
      tp: parseFloat(row.querySelector(".ex-tp").value) || 0,
      online_cm: parseFloat(row.querySelector(".ex-online-cm").value) || 0,
      online_td: parseFloat(row.querySelector(".ex-online-td").value) || 0,
      online_tp: parseFloat(row.querySelector(".ex-online-tp").value) || 0,
    });
  });

  if (hasEmpty) {
    Toast.error(
      "Veuillez sélectionner un groupe pour chaque ligne d'exclusion.",
    );
    return;
  }

  // Change detection
  const currentState = JSON.stringify(
    updates.map((u) => ({
      code_groupe: String(u.code_groupe),
      cm: parseFloat(u.cm),
      td: parseFloat(u.td),
      tp: parseFloat(u.tp),
      cm: parseFloat(u.cm),
      td: parseFloat(u.td),
      tp: parseFloat(u.tp),
      online_cm: parseFloat(u.online_cm),
      online_td: parseFloat(u.online_td),
      online_tp: parseFloat(u.online_tp),
    })),
  );

  if (currentState === initialExclusionsState) {
    Toast.warning("Attention", "Aucune modification à enregistrer.");
    return;
  }

  if (typeof Spinner !== "undefined") Spinner.show(saveBtn);
  if (typeof Modal !== "undefined" && Modal.setLocked) Modal.setLocked(true);

  try {
    const payload = {
      action: "save_exclusions",
      module_code: code,
      updates: updates,
    };

    const response = await fetch("../api/update_weekly_workload.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Échec de l'enregistrement");

    if (typeof Toast !== "undefined")
      Toast.success(result.message || "Exclusions enregistrées");

    // Close modal using global Modal system
    if (typeof Modal !== "undefined") Modal.close();

    loadAllData(); // Refresh to update originalData and UI
  } catch (error) {
    console.error("Error:", error);
    if (typeof Toast !== "undefined") Toast.error(error.message);
  } finally {
    if (typeof Spinner !== "undefined") Spinner.hide(saveBtn);
    if (typeof Modal !== "undefined" && Modal.setLocked) Modal.setLocked(false);
  }
}

async function saveWorkloadData() {
  const saveBtn = document.getElementById("saveWorkloadBtn");
  if (typeof Spinner !== "undefined") Spinner.show(saveBtn);

  const updates = [];
  const rows = document.querySelectorAll("#workloadTableBody tr");

  rows.forEach((row) => {
    const indicator = row.querySelector(".status-indicator");
    if (indicator && indicator.textContent === "Modifié") {
      const index = row.dataset.index;
      const dataRow = originalData[index];

      const cmInput = row.querySelector('input[data-field="cm"]');
      const tdInput = row.querySelector('input[data-field="td"]');
      const tpInput = row.querySelector('input[data-field="tp"]');
      const onlCmInput = row.querySelector('input[data-field="online_cm"]');
      const onlTdInput = row.querySelector('input[data-field="online_td"]');
      const onlTpInput = row.querySelector('input[data-field="online_tp"]');

      updates.push({
        code: dataRow.code,
        code_groupe: "",
        semester: dataRow.semester,
        cm: cmInput ? parseFloat(cmInput.value) || 0 : dataRow.cm,
        td: tdInput ? parseFloat(tdInput.value) || 0 : dataRow.td,
        tp: tpInput ? parseFloat(tpInput.value) || 0 : dataRow.tp,
        online_cm: onlCmInput
          ? parseFloat(onlCmInput.value) || 0
          : dataRow.online_cm,
        online_td: onlTdInput
          ? parseFloat(onlTdInput.value) || 0
          : dataRow.online_td,
        online_tp: onlTpInput
          ? parseFloat(onlTpInput.value) || 0
          : dataRow.online_tp,
      });
    }
  });

  if (updates.length === 0) {
    if (typeof Toast !== "undefined")
      Toast.warning("Attention", "Aucune modification à enregistrer.");
    if (typeof Spinner !== "undefined") Spinner.hide(saveBtn);
    return;
  }

  try {
    const response = await fetch("../api/update_weekly_workload.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Échec de l'enregistrement");

    if (typeof Toast !== "undefined")
      Toast.success(result.message || "Mise à jour réussie");
    loadAllData();
  } catch (error) {
    console.error("Error:", error);
    if (typeof Toast !== "undefined") Toast.error(error.message);
  } finally {
    if (typeof Spinner !== "undefined") Spinner.hide(saveBtn);
  }
}

function filterTable() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;
  const query = searchInput.value.toLowerCase();
  const rows = document.querySelectorAll("#workloadTableBody tr");

  rows.forEach((row) => {
    const text = row.querySelector(".code-col").textContent.toLowerCase();
    row.style.display = text.includes(query) ? "" : "none";
  });
}
