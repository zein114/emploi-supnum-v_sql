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
    const response = await fetch("../api/get_semesters.php");
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

      const semBtn = document.querySelector(
        '[data-dropdown-id="adminSemesterSelect"]',
      );
      const groupBtn = document.querySelector(
        '[data-dropdown-id="adminGroupSelect"]',
      );

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
        await renderTimetable(sheetName);
        if (container) container.style.display = "block";
      } catch (error) {
        console.error("Error loading Time Tables:", error);
      } finally {
        if (typeof Spinner !== "undefined") Spinner.hide(submitBtn);
      }
    });
  }
});

async function renderTimetable(sheetName) {
  const timetableGrid = document.getElementById("timetableGrid");
  if (!timetableGrid) return;

  try {
    // 1. Fetch live days to check Sunday status
    const daysResponse = await fetch("../api/get_days.php");
    const liveDays = await daysResponse.json();
    const sundayLive = liveDays.find((d) => d.name === "Dimanche");
    const isSundayActiveLive = sundayLive ? sundayLive.is_active == 1 : false;

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

    const response = await fetch(
      `../api/get_timestable_group.php?sheet_name=${encodeURIComponent(
        sheetName,
      )}&t=${Date.now()}`,
    );
    const timesTables = await response.json();

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
        if (dayData.is_active == 0 || slot.is_active == 0) {
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
                  // Fallback: remove parens if present (e.g., "(CM)")
                  typeStr = typeStr.replace(/^\(|\)$/g, "");
                }

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

            // Determine styling class
            let typeClass = "mixed";
            if (new Set(types).size === 1) {
              typeClass = types[0]
                .toLowerCase()
                .replace(")", "")
                .replace("(", "");
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
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                              <span class="event-room">${mergedRooms}</span>
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
