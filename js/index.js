const timetableForm = document.getElementById("timetableForm");
const timetableContainer = document.getElementById("timetableContainer");

// Listen for dropdown changes
document.addEventListener("DOMContentLoaded", async () => {
  const groupBtn = document.querySelector('[data-dropdown-id="groupSelect"]');
  const submitBtn = timetableForm.querySelector('button[type="submit"]');

  if (submitBtn) submitBtn.disabled = true;

  if (groupBtn) {
    groupBtn.disabled = true;
    groupBtn.querySelector(".dropdown-text").textContent =
      "Sélectionnez d'abord un semestre";
    window.customDropdown.updateMenu("groupSelect", "");
  }

  // Load Semesters
  try {
    const response = await fetch("api/get_semesters.php");
    const semesters = await response.json();

    const semesterMenu = document.getElementById("semesterOptionsMenu");
    if (semesterMenu) {
      let html = "";
      semesters.forEach((sem) => {
        html += `<div class="dropdown-item" data-value="${sem.name}">${sem.name}</div>`;
      });
      window.customDropdown.updateMenu("semesterSelect", html);
    }
  } catch (e) {
    console.error("Error loading semesters", e);
  }

  // Restore from sessionStorage
  const savedSemester = sessionStorage.getItem("student_saved_semester");
  const savedGroupId = sessionStorage.getItem("student_saved_group_id");

  if (savedSemester) {
    const semBtn = document.querySelector(
      '[data-dropdown-id="semesterSelect"]',
    );
    // Need to wait for semesters to be loaded into DOM?
    // Since we just updated innerHTML of menu, we might need a small delay or check
    // Logic below handles selection if item exists
    const semMenu = document.getElementById("semesterOptionsMenu");

    // We can use MutationObserver or simple setTimeout if list is small.
    // But since we just set innerHTML above, it should be available almost immediately
    // if we put this logic after the await fetch.

    const semItem = semMenu.querySelector(
      `.dropdown-item[data-value="${savedSemester}"]`,
    );

    if (semItem && semBtn) {
      window.customDropdown.selectItem(semBtn, semMenu, semItem);

      // Wait for groups to load then restore group
      if (savedGroupId) {
        const groupMenu = document.getElementById("groupOptionsMenu");
        const observer = new MutationObserver((mutations, obs) => {
          const groupItem = groupMenu.querySelector(
            `.dropdown-item[data-value="${savedGroupId}"]`,
          );
          if (groupItem) {
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
});

function updateSubmitButtonState() {
  const semBtn = document.querySelector('[data-dropdown-id="semesterSelect"]');
  const groupBtn = document.querySelector('[data-dropdown-id="groupSelect"]');
  const submitBtn = timetableForm.querySelector('button[type="submit"]');

  const semValue = semBtn ? semBtn.getAttribute("data-value") : null;
  const groupValue = groupBtn ? groupBtn.getAttribute("data-value") : null;

  if (submitBtn) {
    submitBtn.disabled = !(semValue && groupValue);
  }
}

document.addEventListener("dropdown-change", async (e) => {
  const { dropdownId, value, text } = e.detail;

  if (dropdownId === "semesterSelect") {
    // Save selection
    if (value) {
      sessionStorage.setItem("student_saved_semester", value);
    } else {
      sessionStorage.removeItem("student_saved_semester");
      sessionStorage.removeItem("student_saved_group_id");
      sessionStorage.removeItem("student_saved_group_name");
    }

    const groupBtn = document.querySelector('[data-dropdown-id="groupSelect"]');
    const groupText = groupBtn.querySelector(".dropdown-text");

    groupBtn.disabled = true;
    groupText.textContent = "Chargement...";

    // Reset group button value as well since we are changing semester
    groupBtn.setAttribute("data-value", "");

    if (!value) {
      groupText.textContent = "Sélectionnez d'abord un semestre";
      window.customDropdown.updateMenu("groupSelect", "");
      updateSubmitButtonState();
      return;
    }

    try {
      const response = await fetch(
        `api/get_groups.php?semester=${encodeURIComponent(value)}`,
      );
      const groups = await response.json();

      if (groups.error) {
        throw new Error(groups.error);
      }

      if (!Array.isArray(groups) || groups.length === 0) {
        groupText.textContent = "Aucun groupe disponible";
        window.customDropdown.updateMenu("groupSelect", "");
        groupBtn.disabled = true;
      } else {
        let html = "";
        groups.forEach((group) => {
          html += `<div class="dropdown-item" data-value="${group.id}">${group.name}</div>`;
        });
        window.customDropdown.updateMenu("groupSelect", html);
        groupBtn.disabled = false;
        groupText.textContent = "Sélectionnez un groupe";
      }
    } catch (err) {
      console.error(err);
    }
  } else if (dropdownId === "groupSelect") {
    if (value) {
      sessionStorage.setItem("student_saved_group_id", value);
      sessionStorage.setItem("student_saved_group_name", text);
    }
  }

  // Always check button state after any dropdown change
  updateSubmitButtonState();
});

// Handle form submission
timetableForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const semBtn = document.querySelector('[data-dropdown-id="semesterSelect"]');
  const groupBtn = document.querySelector('[data-dropdown-id="groupSelect"]');
  const semValue = semBtn ? semBtn.getAttribute("data-value") : null;
  const groupValue = groupBtn ? groupBtn.getAttribute("data-value") : null;

  if (!semValue || !groupValue) return;

  const submitBtn = timetableForm.querySelector('button[type="submit"]');
  const groupText = groupBtn.querySelector(".dropdown-text").textContent;

  if (typeof Spinner !== "undefined") Spinner.show(submitBtn);

  // Sheet name is strictly the group name now (or group code?)
  // Based on excel_utils.py it uses group name.
  const sheetName = groupText;

  try {
    await renderTimetable(sheetName);
    // Use class for animation
    timetableContainer.classList.add("show");
  } catch (error) {
    console.error("Error loading Time Tables:", error);
  } finally {
    if (typeof Spinner !== "undefined") Spinner.hide(submitBtn);
  }
});

async function renderTimetable(sheetName) {
  const timetableGrid = document.getElementById("timetableGrid");

  try {
    // 1. Fetch live days to check Sunday status
    const daysResponse = await fetch("api/get_days.php");
    const liveDays = await daysResponse.json();
    const sundayLive = liveDays.find((d) => d.name === "Dimanche");
    const isSundayActiveLive = sundayLive ? sundayLive.is_active == 1 : false;

    // 2. Fetch generation config for grid structure
    const configResponse = await fetch("api/get_generation_config.php");
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
      `api/get_timestable_group.php?sheet_name=${encodeURIComponent(
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
    html +=
      '<div class="timetable-header sticky-header sticky-column">Heure</div>';
    config.days.forEach((dayData) => {
      if (dayData.name === "Dimanche" && !isSundayActiveLive) return;
      html += `<div class="timetable-header sticky-header">${dayData.name}</div>`;
    });

    // Time slots from config
    config.time_slots.forEach((slot, slotIndex) => {
      html += `<div class="timetable-header sticky-column">${slot.time_range}</div>`;

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

          // Render grouped events
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

// Close Timetable Logic
// Note: timetableContainer is already declared at the top of the file
const closeBtn = document.getElementById("closeTimetable");
if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    timetableContainer.classList.remove("show");
  });
}

if (timetableContainer) {
  timetableContainer.addEventListener("click", (e) => {
    // Check if clicking the backdrop (container or the wrapper div with padding)
    // The glass-card is the content we want to keep open
    if (
      e.target === timetableContainer ||
      e.target.classList.contains("container")
    ) {
      timetableContainer.classList.remove("show");
    }
  });
}
