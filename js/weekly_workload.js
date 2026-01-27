document.addEventListener("DOMContentLoaded", function () {
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

  // Filter for General workloads (code_groupe is empty)
  const generalRows = data.filter(
    (row) => !row.code_groupe || row.code_groupe === "",
  );

  if (generalRows.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="7" class="text-center" style="padding: 2rem;">Aucun module trouvé</td></tr>';
    return;
  }

  // Use a map to ensure we only show one row per module code in the main table
  const shownModules = new Set();

  generalRows.forEach((row) => {
    if (shownModules.has(row.code)) return;
    shownModules.add(row.code);

    // Find index in originalData
    const dataIndex = data.findIndex(
      (d) => d.code === row.code && (!d.code_groupe || d.code_groupe === ""),
    );

    const tr = document.createElement("tr");
    tr.dataset.index = dataIndex;

    tr.innerHTML = `
        <td class="code-col"><strong>${row.code} - ${row.nom}</strong></td>
        <td class="workload-col">
            <input type="number" min="0" step="1" class="workload-input"
                value="${row.cm}" data-field="cm" data-index="${dataIndex}">
        </td>
        <td class="workload-col">
            <input type="number" min="0" step="1" class="workload-input"
                value="${row.td}" data-field="td" data-index="${dataIndex}">
        </td>
        <td class="workload-col">
            <input type="number" min="0" step="1" class="workload-input"
                value="${row.tp}" data-field="tp" data-index="${dataIndex}">
        </td>
        <td class="status-col" style="text-align: center; width: 120px;">
            <button class="btn btn-secondary btn-sm" onclick="openExcludeModal(this, '${row.code}', '${row.nom}', '${row.semester}')" style="width: 100%;">
                Exclure
            </button>
        </td>
         <td class="status-col">
            <span class="status-indicator"></span>
        </td>
    `;
    tableBody.appendChild(tr);
  });

  attachInputListeners();
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

      const isModified =
        currentCM !== parseFloat(originalRow.cm) ||
        currentTD !== parseFloat(originalRow.td) ||
        currentTP !== parseFloat(originalRow.tp);

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

      if (exclusions.length === 0) {
        container.innerHTML =
          '<p class="text-secondary text-center" style="padding: 1rem;">Aucune exclusion pour ce module.</p>';
      } else {
        exclusions.forEach((ex) => addExclusionRow(ex));
      }

      // Store initial state for change detection
      initialExclusionsState = JSON.stringify(
        exclusions.map((ex) => ({
          code_groupe: String(ex.code_groupe || ""),
          cm: parseFloat(ex.cm || 0),
          td: parseFloat(ex.td || 0),
          tp: parseFloat(ex.tp || 0),
        })),
      );

      // Re-attach modal specific listeners
      const addBtn = document.getElementById("addAnotherGroupBtn");
      const saveBtn = document.getElementById("saveExclusionsBtn");

      if (addBtn) addBtn.onclick = () => addExclusionRow();
      if (saveBtn) saveBtn.onclick = saveExclusions;

      if (typeof Spinner !== "undefined") Spinner.hide(btn);
    });
  } else {
    console.error("Global Modal system not found");
  }
}

function addExclusionRow(data = null) {
  const container = document.getElementById("exclusionsList");

  // Remove "no exclusions" text if present
  const emptyMsg = container.querySelector("p");
  if (emptyMsg) emptyMsg.remove();

  const rowId = "dropdown-" + Math.random().toString(36).substr(2, 9);
  const div = document.createElement("div");
  div.className = "exclusion-item";
  div.id = `ex-row-${rowId}`;

  const moduleSemester = document.getElementById("modalModuleSemester").value;
  const filteredGroups = availableGroups.filter(
    (g) => String(g.semester) === String(moduleSemester),
  );
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
        <div class="exclusion-top-row">
            <div class="form-group">
                <label class="form-label">CM</label>
                <input type="number" step="1" class="form-input ex-cm" value="${
                  data ? data.cm : 0
                }">
            </div>
            <div class="form-group">
                <label class="form-label">TD</label>
                <input type="number" step="1" class="form-input ex-td" value="${
                  data ? data.td : 0
                }">
            </div>
            <div class="form-group">
                <label class="form-label">TP</label>
                <input type="number" step="1" class="form-input ex-tp" value="${
                  data ? data.tp : 0
                }">
            </div>
            <div class="remove-action">
                <button type="button" class="remove-exclusion" onclick="this.closest('.exclusion-item').remove()">
                    &times;
                </button>
            </div>
        </div>
        <div class="exclusion-bottom-row">
            <div class="form-group">
                <label class="form-label">Groupe</label>
                <div class="dropdown-container">
                    <button type="button" class="dropdown-button" data-dropdown-id="${rowId}" data-value="${selectedGroupValue}">
                        <span class="dropdown-text">${selectedGroupName}</span>
                        <div class="dropdown-arrow"></div>
                    </button>
                    <div class="dropdown-menu">
                        ${menuOptions}
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

      updates.push({
        code: dataRow.code,
        code_groupe: "",
        semester: dataRow.semester,
        cm: parseFloat(row.querySelector('input[data-field="cm"]').value) || 0,
        td: parseFloat(row.querySelector('input[data-field="td"]').value) || 0,
        tp: parseFloat(row.querySelector('input[data-field="tp"]').value) || 0,
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
