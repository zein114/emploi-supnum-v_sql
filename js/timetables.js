// Timetables Management JavaScript

// Listen for admin timetable dropdown changes
document.addEventListener("dropdown-change", async (e) => {
  const { dropdownId, value, text } = e.detail;

  if (dropdownId === "adminSemesterSelect") {
    // Save selection
    if (value) {
      sessionStorage.setItem("admin_saved_semester", value);
    } else {
      sessionStorage.removeItem("admin_saved_semester");
      sessionStorage.removeItem("admin_saved_group_id");
      sessionStorage.removeItem("admin_saved_group_name");
    }

    const groupBtn = document.querySelector(
      '[data-dropdown-id="adminGroupSelect"]',
    );
    const groupText = groupBtn.querySelector(".dropdown-text");

    groupBtn.disabled = true;
    groupText.textContent = "Chargement...";

    if (!value) {
      groupText.textContent = "Sélectionnez d'abord un semestre";
      window.customDropdown.updateMenu("adminGroupSelect", "");
      updateAdminSubmitButtonState();
      return;
    }

    try {
      const response = await fetch(
        `../api/get_groups.php?semester=${encodeURIComponent(value)}`,
      );
      const groups = await response.json();

      if (groups.length === 0) {
        groupText.textContent = "Aucun groupe disponible";
        window.customDropdown.updateMenu("adminGroupSelect", "");
        groupBtn.disabled = true;
      } else {
        let html = "";
        groups.forEach((group) => {
          html += `<div class="dropdown-item" data-value="${group.code}">${group.name}</div>`;
        });
        window.customDropdown.updateMenu("adminGroupSelect", html);
        groupText.textContent = "Sélectionner un groupe";
        groupBtn.disabled = false;
      }
    } catch (error) {
      console.error("Error loading groups:", error);
      groupText.textContent = "Erreur lors du chargement des groupes";
      window.customDropdown.updateMenu("adminGroupSelect", "");
      groupBtn.disabled = true;
    }
  } else if (dropdownId === "adminGroupSelect") {
    if (value) {
      sessionStorage.setItem("admin_saved_group_id", value);
      sessionStorage.setItem("admin_saved_group_name", text);
    } else {
      sessionStorage.removeItem("admin_saved_group_id");
      sessionStorage.removeItem("admin_saved_group_name");
    }
  }

  updateAdminSubmitButtonState();
});

function updateAdminSubmitButtonState() {
  const adminTimetableForm = document.getElementById("adminTimetableForm");
  if (!adminTimetableForm) return;

  const semBtn = document.querySelector(
    '[data-dropdown-id="adminSemesterSelect"]',
  );
  const groupBtn = document.querySelector(
    '[data-dropdown-id="adminGroupSelect"]',
  );
  const submitBtn = adminTimetableForm.querySelector('button[type="submit"]');

  const semValue = semBtn ? semBtn.getAttribute("data-value") : null;
  const groupValue = groupBtn ? groupBtn.getAttribute("data-value") : null;

  if (submitBtn) {
    submitBtn.disabled = !(semValue && groupValue);
  }
}

// Handle admin timetable form submission
document.addEventListener("DOMContentLoaded", async () => {
  // Load Semesters
  try {
    const response = await fetch("../api/get_semesters.php?all=true");
    const semesters = await response.json();

    const semesterMenu = document.getElementById("adminSemesterOptionsMenu");
    if (semesterMenu) {
      let html = "";
      semesters.forEach((sem) => {
        html += `<div class="dropdown-item" data-value="${sem.name}">${sem.name}</div>`;
      });
      window.customDropdown.updateMenu("adminSemesterSelect", html);
    }
  } catch (e) {
    console.error("Error loading semesters", e);
  }

  // Load Archives
  let allArchives = [];
  try {
    const response = await fetch("../api/get_archives.php");
    allArchives = await response.json();

    const archiveItemsContainer = document.getElementById(
      "archiveDropdownItems",
    );
    if (archiveItemsContainer) {
      const sourceBtn = document.querySelector(
        '[data-dropdown-id="adminSourceSelect"]',
      );
      const currentValue = sourceBtn
        ? sourceBtn.getAttribute("data-value")
        : "live";

      let html = `<div class="dropdown-item ${currentValue === "live" ? "selected" : ""}" data-value="live">Emploi du temps actuel</div>`;

      allArchives.forEach((archive) => {
        const isSelected = currentValue === archive.filename ? "selected" : "";
        html += `<div class="dropdown-item ${isSelected}" data-value="${archive.filename}" data-search-date="${archive.searchDate}" data-display-date="${archive.date}">${archive.displayName}</div>`;
      });
      archiveItemsContainer.innerHTML = html;

      // Re-attach event listeners for new items
      const sourceMenu = document.getElementById("adminSourceOptionsMenu");
      if (sourceBtn && sourceMenu) {
        archiveItemsContainer
          .querySelectorAll(".dropdown-item")
          .forEach((item) => {
            item.addEventListener("click", (e) => {
              e.stopPropagation();
              window.customDropdown.selectItem(sourceBtn, sourceMenu, item);
            });
          });
      }
    }
  } catch (e) {
    console.error("Error loading archives", e);
  }

  // Setup archive search functionality
  const archiveSearchInput = document.getElementById("archiveSearchInput");
  if (archiveSearchInput) {
    archiveSearchInput.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent dropdown from closing
    });

    archiveSearchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      const archiveItemsContainer = document.getElementById(
        "archiveDropdownItems",
      );
      const items = archiveItemsContainer.querySelectorAll(".dropdown-item");

      items.forEach((item) => {
        const value = item.getAttribute("data-value");
        if (value === "live") {
          item.style.display = ""; // Always show "current" option
          return;
        }

        const searchDate = item.getAttribute("data-search-date") || "";
        const displayDate = item.getAttribute("data-display-date") || "";
        const filename = item.textContent.toLowerCase();

        // Helper to strip leading zeros from date parts for flexible matching
        const stripLeadingZeros = (str) => {
          return str.replace(/\/0+(?=\d)/g, "/").replace(/^0+(?=\d)/, "");
        };

        // Normalize search term: remove extra slashes/spaces and leading zeros
        const normalizedSearch = stripLeadingZeros(
          searchTerm.replace(/\s+/g, "").replace(/\/+/g, "/"),
        );

        // Normalize dates for comparison: remove leading zeros
        const normalizedSearchDate = stripLeadingZeros(
          searchDate.toLowerCase().replace(/\s+/g, "").replace(/\/+/g, "/"),
        );
        const normalizedDisplayDate = stripLeadingZeros(
          displayDate.toLowerCase().replace(/\s+/g, "").replace(/\/+/g, "/"),
        );

        // Check if search matches any part of the dates or filename
        const matches =
          normalizedSearchDate.includes(normalizedSearch) ||
          normalizedDisplayDate.includes(normalizedSearch) ||
          filename.includes(searchTerm);

        item.style.display = matches ? "" : "none";
      });
    });
  }

  const adminTimetableForm = document.getElementById("adminTimetableForm");
  const submitBtn = adminTimetableForm
    ? adminTimetableForm.querySelector('button[type="submit"]')
    : null;

  if (submitBtn) submitBtn.disabled = true;

  // Restore from sessionStorage
  const savedSemester = sessionStorage.getItem("admin_saved_semester");
  const savedGroupId = sessionStorage.getItem("admin_saved_group_id");

  if (savedSemester) {
    const semBtn = document.querySelector(
      '[data-dropdown-id="adminSemesterSelect"]',
    );
    // Since menu is IDs: adminSemesterOptionsMenu
    const semMenu = document.getElementById("adminSemesterOptionsMenu");

    // We assume fetch is fast enough or use mutation observer if not...
    // But unlike index.js, here we are inside async DOMContentLoaded after await fetch?
    // Actually await fetch is inside DOMContentLoaded so it runs sequentially if we await it.
    // Yes, added async to DOMContentLoaded.

    const semItem = semMenu.querySelector(
      `.dropdown-item[data-value="${savedSemester}"]`,
    );

    if (semBtn && semMenu && semItem) {
      window.customDropdown.selectItem(semBtn, semMenu, semItem);

      // Wait for groups to load then restore group
      if (savedGroupId) {
        const groupMenu = document.getElementById("adminGroupOptionsMenu");
        const observer = new MutationObserver((mutations, obs) => {
          const groupItem = groupMenu.querySelector(
            `.dropdown-item[data-value="${savedGroupId}"]`,
          );
          if (groupItem) {
            const groupBtn = document.querySelector(
              '[data-dropdown-id="adminGroupSelect"]',
            );
            window.customDropdown.selectItem(groupBtn, groupMenu, groupItem);
            obs.disconnect();
          }
        });

        observer.observe(groupMenu, {
          childList: true,
        });
      }
    }
  }

  if (adminTimetableForm) {
    adminTimetableForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const sourceBtn = document.querySelector(
        '[data-dropdown-id="adminSourceSelect"]',
      );
      const semBtn = document.querySelector(
        '[data-dropdown-id="adminSemesterSelect"]',
      );
      const groupBtn = document.querySelector(
        '[data-dropdown-id="adminGroupSelect"]',
      );

      const sourceValue = sourceBtn
        ? sourceBtn.getAttribute("data-value")
        : "live";
      const semValue = semBtn ? semBtn.getAttribute("data-value") : null;
      const groupValue = groupBtn ? groupBtn.getAttribute("data-value") : null;

      if (!semValue || !groupValue) return;

      const submitBtn = adminTimetableForm.querySelector(
        'button[type="submit"]',
      );

      const semText = semBtn.querySelector(".dropdown-text").textContent;
      const groupText = groupBtn.querySelector(".dropdown-text").textContent;

      if (
        semText === "Sélectionner un semestre" ||
        groupText === "Sélectionner un groupe" ||
        groupText === "Sélectionnez d'abord un semestre"
      ) {
        if (typeof Toast !== "undefined")
          Toast.warning("Veuillez sélectionner un semestre et un groupe");
        return;
      }

      if (typeof Spinner !== "undefined") Spinner.show(submitBtn);

      const sheetName = groupText;
      const container = document.getElementById("timetableContainer");

      try {
        const archiveParam = sourceValue !== "live" ? sourceValue : null;
        await renderTimetable(sheetName, archiveParam);
        if (container) container.style.display = "block";
      } catch (error) {
        console.error("Error loading Time Tables:", error);
      } finally {
        if (typeof Spinner !== "undefined") Spinner.hide(submitBtn);
      }
    });
  }

  // Handle export button
  const exportBtn = document.getElementById("exportExcelBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const sourceBtn = document.querySelector(
        '[data-dropdown-id="adminSourceSelect"]',
      );
      const sourceValue = sourceBtn
        ? sourceBtn.getAttribute("data-value")
        : "live";

      let downloadUrl = "";
      if (sourceValue === "live") {
        downloadUrl = "../modele/Tous_les_Emplois_du_Temps.xlsx";
      } else {
        downloadUrl = "../modele/archives_timetables/" + sourceValue;
      }

      // Create a temporary link to trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download =
        sourceValue === "live" ? "Tous_les_Emplois_du_Temps.xlsx" : sourceValue;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
});

async function renderTimetable(sheetName, archive = null) {
  const timetableGrid = document.getElementById("timetableGrid");
  if (!timetableGrid) return;

  try {
    // 1. Fetch live days to check Sunday status
    const daysResponse = await fetch("../api/get_days.php");
    const liveDays = await daysResponse.json();
    const sundayLive = liveDays.find((d) => d.name === "Dimanche");

    // If archive, assume Sunday might be active/present. If live, check DB.
    // For archives, we generally want to show the full grid structure standardly used.
    let isSundayActiveLive = archive
      ? true
      : sundayLive
        ? sundayLive.is_active == 1
        : false;

    // 2. Fetch generation config for grid structure
    const configResponse = await fetch("../api/get_generation_config.php");
    let config = await configResponse.json();

    // Fallback if no config
    if (!config || config.error) {
      config = {
        days: [
          { name: "Lundi", is_active: 1 },
          { name: "Mardi", is_active: 1 },
          { name: "Mercredi", is_active: 1 },
          { name: "Jeudi", is_active: 1 },
          { name: "Vendredi", is_active: 1 },
          { name: "Samedi", is_active: 1 },
          { name: "Dimanche", is_active: 0 },
        ],
        time_slots: [
          { time_range: "08:00-09:30", is_active: 1 },
          { time_range: "09:45-11:15", is_active: 1 },
          { time_range: "11:30-13:00", is_active: 1 },
          { time_range: "15:00-16:30", is_active: 1 },
          { time_range: "17:00-18:30", is_active: 1 },
        ],
      };
    }

    let url = `../api/get_timestable_group.php?sheet_name=${encodeURIComponent(
      sheetName,
    )}&t=${Date.now()}`;
    if (archive) {
      url += `&archive=${encodeURIComponent(archive)}`;
    }

    const response = await fetch(url);
    const timesTables = await response.json();

    // If archive, hide Sunday if it's completely empty
    if (archive && isSundayActiveLive) {
      const sundayIndex = config.days.findIndex((d) => d.name === "Dimanche");
      if (sundayIndex !== -1) {
        let hasContent = false;
        // Check all rows for actual content
        if (Array.isArray(timesTables)) {
          for (const row of timesTables) {
            if (row && row[sundayIndex]) {
              const val = String(row[sundayIndex]).trim();
              // Check for non-empty and not just a placeholder 'x'
              if (val !== "" && val !== "x") {
                hasContent = true;
                break;
              }
            }
          }
        }
        if (!hasContent) {
          isSundayActiveLive = false;
        }
      }
    }

    // Calculate displayed days count for grid
    const displayDaysCount = config.days.filter((day) => {
      if (day.name === "Dimanche" && !isSundayActiveLive) return false;
      return true;
    }).length;

    let html = `<div class="timetable-grid" style="grid-template-columns: 100px repeat(${displayDaysCount}, 1fr);">`;

    // Header row
    html += '<div class="timetable-header">Heure</div>';
    config.days.forEach((dayData) => {
      if (dayData.name === "Dimanche" && !isSundayActiveLive) return;
      html += `<div class="timetable-header">${dayData.name}</div>`;
    });

    // Time slots from config
    config.time_slots.forEach((slot, slotIndex) => {
      html += `<div class="timetable-header">${slot.time_range}</div>`;

      const row = timesTables[slotIndex] || [];

      config.days.forEach((dayData, dayIndex) => {
        if (dayData.name === "Dimanche" && !isSundayActiveLive) return;

        let cellContent = row[dayIndex] ?? "";

        // Handle inactive days OR inactive time slots from CONFIG (historical)
        // CRITICAL FIX: If viewing an archive, we ignore the 'is_active' flag from the CURRENT config.
        // We trust the Excel file content. Only force 'x' if using live view AND it's inactive.
        if (!archive && (dayData.is_active == 0 || slot.is_active == 0)) {
          cellContent = "x";
        }

        const rawText = String(cellContent);

        if (rawText === "x" || rawText.trim() === "") {
          html += `<div class="timetable-cell inactive"></div>`;
        } else {
          // Split by separator for multiple events
          const events = rawText.split(" /// ");
          let cellHtml = `<div class="timetable-cell active-cell">`;

          // Group events by Subject Header (Line 0: [CODE] Subject) to merge them
          const groupedEvents = {};

          events.forEach((eventStr) => {
            const lines = eventStr.split("\n");
            if (lines.length === 0) return;

            // Normalize subject line to use as key
            const uniqueKey = lines[0].trim();

            if (!groupedEvents[uniqueKey]) {
              groupedEvents[uniqueKey] = [];
            }
            groupedEvents[uniqueKey].push(lines);
          });

          Object.values(groupedEvents).forEach((groupLinesArray) => {
            // Base info from the first event in the group
            const firstEventLines = groupLinesArray[0];

            let code = "",
              subject = "";
            const line1Match = firstEventLines[0].match(/^\[(.*?)\]\s*(.*)$/);
            if (line1Match) {
              code = line1Match[1];
              subject = line1Match[2];
            } else {
              subject = firstEventLines[0];
            }

            // Collect and merge details
            const types = [];
            const groups = [];
            const profs = [];
            const rooms = [];

            groupLinesArray.forEach((lines) => {
              // Parse Type & Group (Line 1)
              if (lines.length > 1) {
                let typeStr = lines[1];
                let groupStr = "";

                const line2Match = typeStr.match(/^\((.*?)\)\s*-\s*(.*)$/);
                if (line2Match) {
                  typeStr = line2Match[1];
                  groupStr = line2Match[2];
                } else {
                  typeStr = typeStr.replace(/^\(|\)$/g, "");
                }
                typeStr = typeStr.replace(/Online\s*|Onl\s*/i, "");

                // Clean group name:
                // If it's empty (like CM), use the type.
                if (!groupStr || groupStr.trim() === "") {
                  groupStr = typeStr;
                } else if (typeStr === "TD" || typeStr === "TP") {
                  // Ensure prefix matches type (e.g. show TP1 for TP session even if group is TD1)
                  const numbers = groupStr.match(/\d+/g);
                  if (numbers) {
                    groupStr = numbers.map((n) => typeStr + n).join(", ");
                  } else {
                    groupStr = typeStr;
                  }
                }

                // Final cleanup: remove trailing " TD" or " TP" if present
                groupStr = groupStr.replace(/\s+(TD|TP)$/i, "");

                types.push(typeStr);
                groups.push(groupStr);
              } else {
                types.push("?");
                groups.push("?");
              }

              // Parse Prof (Line 2)
              if (lines.length > 2) {
                profs.push(lines[2].replace("Prof: ", ""));
              } else {
                profs.push("?");
              }

              // Parse Room (Line 3)
              if (lines.length > 3) {
                rooms.push(lines[3].replace("Salle: ", ""));
              } else {
                rooms.push("?");
              }
            });

            // formatting for display: join with " / "
            const mergedGroups = [...new Set(groups)].join(" / ");
            const mergedProfs = profs.join(" / ");
            const mergedRooms = rooms.join(" / ");

            let roomDisplayHtml = "";
            if (mergedRooms === "En ligne") {
              roomDisplayHtml = `<span class="event-room" style="font-weight: 500;">En ligne</span>`;
            } else {
              roomDisplayHtml = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span class="event-room">${mergedRooms}</span>
                 `;
            }

            // Determine styling class
            let typeClass = "mixed";
            if (new Set(types).size === 1) {
              const t = types[0].toLowerCase();
              if (t.includes("cm")) {
                typeClass = "cm";
              } else if (t.includes("tp")) {
                typeClass = "tp";
              } else if (t.includes("td")) {
                typeClass = "td";
              } else {
                typeClass = t
                  .replace(")", "")
                  .replace("(", "")
                  .replace(/\s+/g, "-");
              }
            }

            cellHtml += `
                  <div class="event-card type-${typeClass}">
                      <div class="event-header">
                          <span class="event-subject" title="${subject}">${subject}</span>
                      </div>
                      <div class="event-meta">
                          <div class="event-row">
                              <span class="event-badge type-badge" style="background:none; color: var(--text-secondary); border: 1px solid var(--border-color);">${mergedGroups}</span>
                          </div>
                          <div class="event-row">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                              <span class="event-prof">${mergedProfs}</span>
                          </div>
                          <div class="event-row">
                              ${roomDisplayHtml}
                          </div>
                      </div>
                  </div>
              `;
          });

          cellHtml += `</div>`;
          html += cellHtml;
        }
      });
    });

    html += "</div>";
    timetableGrid.innerHTML = html;

    // Fetch and display unscheduled classes (Only for live view)
    const unscheduledSection = document.getElementById(
      "unscheduledClassesSection",
    );
    if (!archive) {
      await renderUnscheduledClasses(sheetName);
    } else if (unscheduledSection) {
      unscheduledSection.style.display = "none";
    }
  } catch (error) {
    console.error("Error rendering timetable:", error);
    timetableGrid.innerHTML =
      '<div style="padding: 2rem; text-align: center; color: var(--color-danger);">Erreur lors du chargement des données de l\'emploi du temps.</div>';
  }
}

async function GenerateTimetables(btn) {
  if (typeof Spinner !== "undefined" && btn) Spinner.show(btn);

  try {
    const response = await fetch("../api/generate_timetables.php");
    const result = await response.json();

    if (result.status === "success") {
      Toast.success("Les emplois du temps ont été générés avec succès.");

      // Automatically refresh the current view if a group is selected
      const groupBtn = document.querySelector(
        '[data-dropdown-id="adminGroupSelect"]',
      );
      const groupValue = groupBtn ? groupBtn.getAttribute("data-value") : null;
      const groupText = groupBtn
        ? groupBtn.querySelector(".dropdown-text").textContent
        : null;

      if (groupValue && groupText && groupText !== "Sélectionner un groupe") {
        // Reset source to live after generation
        const sourceBtn = document.querySelector(
          '[data-dropdown-id="adminSourceSelect"]',
        );
        if (sourceBtn) {
          const liveItem = document.querySelector(
            '#adminSourceOptionsMenu .dropdown-item[data-value="live"]',
          );
          const sourceMenu = document.getElementById("adminSourceOptionsMenu");
          if (liveItem && window.customDropdown) {
            window.customDropdown.selectItem(sourceBtn, sourceMenu, liveItem);
          }
        }
        await renderTimetable(groupText);
      }
    } else {
      Toast.error(
        result.message || "Échec de la génération des emplois du temps.",
      );
    }
  } catch (error) {
    console.error("Error generating timetables:", error);
    Toast.error("Échec de la génération des emplois du temps.");
  } finally {
    if (typeof Spinner !== "undefined" && btn) Spinner.hide(btn);
  }
}

async function renderUnscheduledClasses(sheetName) {
  const unscheduledSection = document.getElementById(
    "unscheduledClassesSection",
  );
  const unscheduledList = document.getElementById("unscheduledClassesList");

  if (!unscheduledSection || !unscheduledList) return;

  try {
    const response = await fetch("../api/get_unscheduled_classes.php");
    const allUnscheduled = await response.json();

    // Filter for the current group
    const groupUnscheduled = allUnscheduled.filter(
      (item) => item.group === sheetName,
    );

    if (groupUnscheduled.length === 0) {
      unscheduledSection.style.display = "none";
      return;
    }

    // Display the unscheduled classes
    let html = '<div class="grid grid-2 gap-2">';

    groupUnscheduled.forEach((item) => {
      let typeColor = "var(--text-muted)";
      let typeLabelColor = "var(--text-secondary)";

      if (item.type === "CM") {
        typeColor = "#3b82f6";
      } else if (item.type === "TP") {
        typeColor = "#f59e0b";
      } else if (item.type === "TD") {
        typeColor = "#10b981";
      }

      html += `
        <div class="glass-card" style="padding: 1.5rem; border-left: 4px solid ${typeColor};">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">
                ${item.subject}
              </h4>
              <div style="display: flex; gap: 1rem; flex-wrap: wrap; color: var(--text-secondary); font-size: 0.9rem;">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 0.25rem;">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  ${item.professor}
                </span>
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 0.25rem;">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  ${item.group}
                </span>
              </div>
            </div>
            <div style="text-align: right;">
              <span class="event-badge type-badge" style="background: none; color: ${typeLabelColor}; border: 1px solid var(--border-color); padding: 0.25rem 0.75rem; border-radius: 4px; font-weight: bold;">
                ${item.type}
              </span>
            </div>
          </div>
          <div style="display: flex; gap: 2rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
            <div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Séances requises</div>
              <div style="font-size: 1.25rem; font-weight: bold; color: var(--text-primary);">${item.required_sessions}</div>
            </div>
            <div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Séances programmées</div>
              <div style="font-size: 1.25rem; font-weight: bold; color: var(--color-success);">${item.scheduled_sessions}</div>
            </div>
            <div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Séances manquantes</div>
              <div style="font-size: 1.25rem; font-weight: bold; color: var(--color-danger);">${item.missing_sessions}</div>
            </div>
          </div>
        </div>
      `;
    });

    html += "</div>";
    unscheduledList.innerHTML = html;
    unscheduledSection.style.display = "block";
  } catch (error) {
    console.error("Error loading unscheduled classes:", error);
    unscheduledSection.style.display = "none";
  }
}

// Toggle Section Visibility
function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const baseId = sectionId.replace("Section", "");
  const btnText = document.getElementById(baseId + "BtnText");
  const icon = document.getElementById(baseId + "Icon");

  const eyeShowSvg = `<svg style="width: 1em; height: 1em; vertical-align: middle;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9944 15.5C13.9274 15.5 15.4944 13.933 15.4944 12C15.4944 10.067 13.9274 8.5 11.9944 8.5C10.0614 8.5 8.49439 10.067 8.49439 12C8.49439 13.933 10.0614 15.5 11.9944 15.5ZM11.9944 13.4944C11.1691 13.4944 10.5 12.8253 10.5 12C10.5 11.1747 11.1691 10.5056 11.9944 10.5056C12.8197 10.5056 13.4888 11.1747 13.4888 12C13.4888 12.8253 12.8197 13.4944 11.9944 13.4944Z" fill="#999"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12 5C7.18879 5 3.9167 7.60905 2.1893 9.47978C0.857392 10.9222 0.857393 13.0778 2.1893 14.5202C3.9167 16.391 7.18879 19 12 19C16.8112 19 20.0833 16.391 21.8107 14.5202C23.1426 13.0778 23.1426 10.9222 21.8107 9.47978C20.0833 7.60905 16.8112 5 12 5ZM3.65868 10.8366C5.18832 9.18002 7.9669 7 12 7C16.0331 7 18.8117 9.18002 20.3413 10.8366C20.9657 11.5128 20.9657 12.4872 20.3413 13.1634C18.8117 14.82 16.0331 17 12 17C7.9669 17 5.18832 14.82 3.65868 13.1634C3.03426 12.4872 3.03426 11.5128 3.65868 10.8366Z" fill="#999"/></svg>`;

  const eyeOffSvg = `<svg style="width: 1em; height: 1em; vertical-align: middle;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.4955 7.44088C3.54724 8.11787 2.77843 8.84176 2.1893 9.47978C0.857392 10.9222 0.857393 13.0778 2.1893 14.5202C3.9167 16.391 7.18879 19 12 19C13.2958 19 14.4799 18.8108 15.5523 18.4977L13.8895 16.8349C13.2936 16.9409 12.6638 17 12 17C7.9669 17 5.18832 14.82 3.65868 13.1634C3.03426 12.4872 3.03426 11.5128 3.65868 10.8366C4.23754 10.2097 4.99526 9.50784 5.93214 8.87753L4.4955 7.44088Z" fill="#999"/><path d="M8.53299 11.4784C8.50756 11.6486 8.49439 11.8227 8.49439 12C8.49439 13.933 10.0614 15.5 11.9944 15.5C12.1716 15.5 12.3458 15.4868 12.516 15.4614L8.53299 11.4784Z" fill="#999"/><path d="M15.4661 12.4471L11.5473 8.52829C11.6937 8.50962 11.8429 8.5 11.9944 8.5C13.9274 8.5 15.4944 10.067 15.4944 12C15.4944 12.1515 15.4848 12.3007 15.4661 12.4471Z" fill="#999"/><path d="M18.1118 15.0928C19.0284 14.4702 19.7715 13.7805 20.3413 13.1634C20.9657 12.4872 20.9657 11.5128 20.3413 10.8366C18.8117 9.18002 16.0331 7 12 7C11.3594 7 10.7505 7.05499 10.1732 7.15415L8.50483 5.48582C9.5621 5.1826 10.7272 5 12 5C16.8112 5 20.0833 7.60905 21.8107 9.47978C23.1426 10.9222 23.1426 13.0778 21.8107 14.5202C21.2305 15.1486 20.476 15.8603 19.5474 16.5284L18.1118 15.0928Z" fill="#999"/><path d="M2.00789 3.42207C1.61736 3.03155 1.61736 2.39838 2.00789 2.00786C2.39841 1.61733 3.03158 1.61733 3.4221 2.00786L22.0004 20.5862C22.391 20.9767 22.391 21.6099 22.0004 22.0004C21.6099 22.3909 20.9767 22.3909 20.5862 22.0004L2.00789 3.42207Z" fill="#999"/></svg>`;

  if (section.style.display === "none") {
    section.style.display = "block";
    if (btnText) btnText.textContent = "Masquer";
    if (icon) icon.innerHTML = eyeOffSvg;
    // Save state to localStorage
    localStorage.setItem("admin_" + sectionId + "_visible", "true");
  } else {
    section.style.display = "none";
    if (btnText) btnText.textContent = "Afficher";
    if (icon) icon.innerHTML = eyeShowSvg;
    // Save state to localStorage
    localStorage.setItem("admin_" + sectionId + "_visible", "false");
  }
}

// Restore section visibility from localStorage on page load
function restoreSectionStates() {
  const sections = ["unscheduledContentSection"];

  sections.forEach((id) => {
    const isVisible = localStorage.getItem("admin_" + id + "_visible");
    if (isVisible === "true") {
      const section = document.getElementById(id);
      const baseId = id.replace("Section", "");
      const btnText = document.getElementById(baseId + "BtnText");
      const icon = document.getElementById(baseId + "Icon");

      if (section) {
        section.style.display = "block";
        if (btnText) btnText.textContent = "Masquer";
        if (icon) {
          icon.innerHTML = `<svg style="width: 1em; height: 1em; vertical-align: middle;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.4955 7.44088C3.54724 8.11787 2.77843 8.84176 2.1893 9.47978C0.857392 10.9222 0.857393 13.0778 2.1893 14.5202C3.9167 16.391 7.18879 19 12 19C13.2958 19 14.4799 18.8108 15.5523 18.4977L13.8895 16.8349C13.2936 16.9409 12.6638 17 12 17C7.9669 17 5.18832 14.82 3.65868 13.1634C3.03426 12.4872 3.03426 11.5128 3.65868 10.8366C4.23754 10.2097 4.99526 9.50784 5.93214 8.87753L4.4955 7.44088Z" fill="#999"/><path d="M8.53299 11.4784C8.50756 11.6486 8.49439 11.8227 8.49439 12C8.49439 13.933 10.0614 15.5 11.9944 15.5C12.1716 15.5 12.3458 15.4868 12.516 15.4614L8.53299 11.4784Z" fill="#999"/><path d="M15.4661 12.4471L11.5473 8.52829C11.6937 8.50962 11.8429 8.5 11.9944 8.5C13.9274 8.5 15.4944 10.067 15.4944 12C15.4944 12.1515 15.4848 12.3007 15.4661 12.4471Z" fill="#999"/><path d="M18.1118 15.0928C19.0284 14.4702 19.7715 13.7805 20.3413 13.1634C20.9657 12.4872 20.9657 11.5128 20.3413 10.8366C18.8117 9.18002 16.0331 7 12 7C11.3594 7 10.7505 7.05499 10.1732 7.15415L8.50483 5.48582C9.5621 5.1826 10.7272 5 12 5C16.8112 5 20.0833 7.60905 21.8107 14.5202C21.2305 15.1486 20.476 15.8603 19.5474 16.5284L18.1118 15.0928Z" fill="#999"/><path d="M2.00789 3.42207C1.61736 3.03155 1.61736 2.39838 2.00789 2.00786C2.39841 1.61733 3.03158 1.61733 3.4221 2.00786L22.0004 20.5862C22.391 20.9767 22.391 21.6099 22.0004 22.0004C21.6099 22.3909 20.9767 22.3909 20.5862 22.0004L2.00789 3.42207Z" fill="#999"/></svg>`;
        }
      }
    }
  });
}

// Call restoreSectionStates when DOM is ready
document.addEventListener("DOMContentLoaded", restoreSectionStates);
