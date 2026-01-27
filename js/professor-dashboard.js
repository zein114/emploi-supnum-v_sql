const timetableContainer = document.getElementById("timetableContainer");
const timetableGrid = document.getElementById("timetableGrid");
const professorTimetableGrid = document.getElementById(
  "professorTimetableGrid",
);

let timeSlots = [];
let availability = [];
let professorTimetable = [];

// Global variable for days
let daysData = [];

// Shared data loading promise to avoid race conditions
let globalDataPromise = null;

async function loadGlobalData() {
  if (globalDataPromise) return globalDataPromise;

  globalDataPromise = (async () => {
    try {
      // Load days
      const daysResponse = await fetch("api/get_days.php");
      daysData = await daysResponse.json();

      // Fallback if no days
      if (!daysData || daysData.length === 0) {
        daysData = [
          { name: "Lundi", is_active: 1 },
          { name: "Mardi", is_active: 1 },
          { name: "Mercredi", is_active: 1 },
          { name: "Jeudi", is_active: 1 },
          { name: "Vendredi", is_active: 1 },
          { name: "Samedi", is_active: 0 },
        ];
      }

      // Load time slots
      const slotsResponse = await fetch("api/get_time_slots.php");
      timeSlots = await slotsResponse.json();

      return true;
    } catch (error) {
      console.error("Error loading global data:", error);
      throw error;
    }
  })();

  return globalDataPromise;
}

// Load timetable immediately
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Start loading data
    await loadGlobalData();

    // Now load individual sections
    loadTimetable();
    loadProfessorTimetable();
  } catch (error) {
    const errorHtml = `<div style="padding: 2rem; text-align: center; color: var(--color-error);">Erreur critique lors du chargement des données : ${error.message}</div>`;
    if (timetableGrid) timetableGrid.innerHTML = errorHtml;
    if (professorTimetableGrid) professorTimetableGrid.innerHTML = errorHtml;
  }
});

async function loadTimetable() {
  try {
    await loadGlobalData();

    if (!timeSlots || timeSlots.length === 0) {
      timetableGrid.innerHTML =
        '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Aucun créneau horaire n\'est configuré.</div>';
      return;
    }

    // Load professor's availability
    const availResponse = await fetch(
      `api/get_professor_availability.php?t=${Date.now()}`,
    );
    availability = await availResponse.json();

    renderTimetable();
    timetableContainer.style.display = "block";
  } catch (error) {
    console.error("Error loading availability:", error);
    timetableGrid.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--color-error);">Erreur lors du chargement des disponibilités : ${error.message}</div>`;
  }
}

async function loadProfessorTimetable() {
  try {
    await loadGlobalData();

    if (!timeSlots || timeSlots.length === 0) {
      professorTimetableGrid.innerHTML =
        '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Aucun créneau horaire n\'est configuré.</div>';
      return;
    }

    // Load professor's timetable
    const timetableResponse = await fetch(
      `api/get_professor_times_table.php?t=${Date.now()}`,
    );
    const result = await timetableResponse.json();

    if (result && result.success) {
      professorTimetable = result.classes || [];
    } else {
      console.error("API Error:", result?.message || "Unknown error");
      // Still render something (empty grid or error)
      professorTimetable = [];
      if (result?.message) {
        professorTimetableGrid.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--color-warning);">${result.message}</div>`;
        return;
      }
    }

    renderProfessorTimetable();
  } catch (error) {
    console.error("Error loading professor timetable:", error);
    professorTimetableGrid.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--color-error);">Erreur lors du chargement de l'emploi du temps : ${error.message}</div>`;
  }
}

function renderProfessorTimetable() {
  const days = daysData.map((d) => d.name);
  // Time slot rows
  const timetable = {};

  // initialize empty grid
  timeSlots.forEach((slot) => {
    timetable[slot.time_range] = {};
    days.forEach((day) => {
      timetable[slot.time_range][day] = "";
    });
  });

  // fill grid
  professorTimetable.forEach(([course, day, time]) => {
    if (timetable[time] && timetable[time][day] !== undefined) {
      if (timetable[time][day] !== "") timetable[time][day] += " /// ";
      timetable[time][day] += course;
    }
  });

  let html = `<div class="timetable-grid" style="grid-template-columns: 100px repeat(${days.length}, 1fr);">`;

  // Header row
  html += '<div class="timetable-header">Heure</div>';
  days.forEach((day) => {
    html += `<div class="timetable-header">${day}</div>`;
  });

  // Time slot rows
  timeSlots.forEach((slot) => {
    html += `<div class="timetable-header">${slot.time_range}</div>`;

    daysData.forEach((dayData) => {
      let cellContent = timetable[slot.time_range][dayData.name] || "";

      // Handle inactive days OR inactive time slots
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
          const profs = []; // usually just the current prof, but logic supports multiple
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

              // Clean group name logic for professors:
              // Combine type and major info into one clean string
              if (!groupStr || groupStr.trim() === "") {
                groupStr = typeStr;
              } else {
                if (typeStr === "TD" || typeStr === "TP") {
                  // Ensure prefix matches type (e.g. show "TP1 - RSS-L2" even if original was "TD1")
                  const numMatch = groupStr.match(/\d+/);
                  const number = numMatch ? numMatch[0] : "";

                  // Extract major info (everything else after TD/TP prefix/number)
                  let majorInfo = groupStr
                    .replace(/^(TD|TP)\s*\d*/i, "")
                    .trim()
                    .replace(/^-\s*/, "");
                  groupStr =
                    typeStr + number + (majorInfo ? " - " + majorInfo : "");
                } else {
                  // For CM, just combine them: "CM - RSS-L2"
                  groupStr = typeStr + " - " + groupStr;
                }
              }

              // Final cleanup: remove trailing " TD" or " TP" if present
              groupStr = groupStr
                .replace(/\s+(TD|TP)$/i, "")
                .replace(/\(\s*\)/g, "")
                .trim();

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
          const mergedProfs = [...new Set(profs)].join(" / "); // Dedupe prof if it's just 'Me'
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
  professorTimetableGrid.innerHTML = html;
}

function renderTimetable() {
  const days = daysData.map((d) => d.name);

  let html = `<div class="timetable-grid" style="grid-template-columns: 100px repeat(${days.length}, 1fr);">`;

  // Header row
  html += '<div class="timetable-header">Heure</div>';
  days.forEach((day) => {
    html += `<div class="timetable-header">${day}</div>`;
  });

  // Time slot rows
  const slotsCount = timeSlots.length;
  timeSlots.forEach((slot, slotIndex) => {
    html += `<div class="timetable-header">${slot.time_range}</div>`;

    daysData.forEach((dayData, dayIndex) => {
      const index = dayIndex * slotsCount + slotIndex;
      let cellClass = availability?.[index] ? "available" : "";
      let cellContent = "";
      let onclickAttr = `onclick="toggleAvailability(${index}, this)"`;

      // Handle inactive days OR inactive time slots
      if (dayData.is_active == 0 || slot.is_active == 0) {
        cellClass = "inactive";
        cellContent = "x";
        onclickAttr = ""; // Disable interaction
      }

      html += `
                <div class="timetable-cell ${cellClass}" 
                        data-index="${index}"
                        ${onclickAttr}>
                        ${cellContent}
                </div>
            `;
    });
  });

  html += "</div>";
  timetableGrid.innerHTML = html;
}

async function toggleAvailability(index, cellElement) {
  // If not passed (could happen if old cache but we updated render), try to find it
  if (!cellElement) {
    cellElement = document.querySelector(
      `.timetable-cell[data-index="${index}"]`,
    );
  }

  // Prevent double clicks
  if (cellElement && cellElement.classList.contains("processing")) return;

  if (cellElement) cellElement.classList.add("processing");

  try {
    const response = await fetch("api/toggle_availability.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        index: index,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Reload availability (re-renders completely which removes processing class)
      await loadTimetable();
    } else {
      if (cellElement) cellElement.classList.remove("processing");
      Toast.error(
        result.error || "Échec de la mise à jour des disponibilités.",
      );
    }
  } catch (error) {
    if (cellElement) cellElement.classList.remove("processing");
    console.error("Error toggling availability:", error);
    Toast.error("Échec de la mise à jour des disponibilités.");
  }
}

// Change Password Function
async function changePassword() {
  const oldPassword = document.getElementById("oldPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const submitBtn = document.getElementById("changePasswordBtn");

  // Validation
  if (!oldPassword || !newPassword || !confirmPassword) {
    Toast.warning("Veuillez remplir tous les champs de mot de passe.");
    return;
  }

  if (newPassword !== confirmPassword) {
    Toast.error("Les nouveaux mots de passe ne correspondent pas.");
    return;
  }

  if (newPassword.length < 4) {
    Toast.warning(
      "Le nouveau mot de passe doit contenir au moins 4 caractères.",
    );
    return;
  }

  // Show spinner
  if (typeof Spinner !== "undefined") Spinner.show(submitBtn);

  try {
    const response = await fetch("api/change_password.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });

    const result = await response.json();

    if (result.success) {
      Toast.success("Mot de passe modifié avec succès.");
      // Clear the form
      document.getElementById("oldPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";
    } else {
      Toast.error(result.error || "Échec de la modification du mot de passe.");
    }
  } catch (error) {
    console.error("Error changing password:", error);
    Toast.error("Échec de la modification du mot de passe.");
  } finally {
    if (typeof Spinner !== "undefined") Spinner.hide(submitBtn);
  }
}

// Initialize Timetables Function
async function initializeTimetables() {
  const submitBtn = document.getElementById("initTimetablesBtn");

  // Confirm action
  Modal.confirm(
    "Initialiser les emplois du temps",
    "Cette action va réinitialiser votre grille de disponibilités par défaut (toutes les cases indisponibles). Voulez-vous continuer?",
    async () => {
      const confirmBtn = document.getElementById("modalConfirmBtn");
      if (typeof Spinner !== "undefined" && confirmBtn)
        Spinner.show(confirmBtn);

      try {
        const response = await fetch("api/initialize_timetables.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();

        if (result.success) {
          Toast.success(
            result.message ||
              "Les emplois du temps ont été initialisés avec succès.",
          );
          // Reload the timetable
          await loadTimetable();
        } else {
          Toast.error(
            result.error || "Échec de l'initialisation des emplois du temps.",
          );
        }
      } catch (error) {
        console.error("Error initializing timetables:", error);
        Toast.error("Échec de l'initialisation des emplois du temps.");
      } finally {
        if (typeof Spinner !== "undefined" && confirmBtn)
          Spinner.hide(confirmBtn);
      }
    },
    null,
    {
      confirmText: "Initialiser",
      confirmClass: "modal-btn-confirm",
    },
  );
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
    localStorage.setItem(sectionId + "_visible", "true");
  } else {
    section.style.display = "none";
    if (btnText) btnText.textContent = "Afficher";
    if (icon) icon.innerHTML = eyeShowSvg;
    // Save state to localStorage
    localStorage.setItem(sectionId + "_visible", "false");
  }
}

// Restore section visibility from localStorage on page load
function restoreSectionStates() {
  const sections = [
    "availabilitySection",
    "timetableSection",
    "quickActionsSection",
  ];

  sections.forEach((id) => {
    const isVisible = localStorage.getItem(id + "_visible");
    if (isVisible === "true") {
      const section = document.getElementById(id);
      const baseId = id.replace("Section", "");
      const btnText = document.getElementById(baseId + "BtnText");
      const icon = document.getElementById(baseId + "Icon");

      if (section) {
        section.style.display = "block";
        if (btnText) btnText.textContent = "Masquer";
        if (icon) {
          icon.innerHTML = `<svg style="width: 1em; height: 1em; vertical-align: middle;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.4955 7.44088C3.54724 8.11787 2.77843 8.84176 2.1893 9.47978C0.857392 10.9222 0.857393 13.0778 2.1893 14.5202C3.9167 16.391 7.18879 19 12 19C13.2958 19 14.4799 18.8108 15.5523 18.4977L13.8895 16.8349C13.2936 16.9409 12.6638 17 12 17C7.9669 17 5.18832 14.82 3.65868 13.1634C3.03426 12.4872 3.03426 11.5128 3.65868 10.8366C4.23754 10.2097 4.99526 9.50784 5.93214 8.87753L4.4955 7.44088Z" fill="#999"/><path d="M8.53299 11.4784C8.50756 11.6486 8.49439 11.8227 8.49439 12C8.49439 13.933 10.0614 15.5 11.9944 15.5C12.1716 15.5 12.3458 15.4868 12.516 15.4614L8.53299 11.4784Z" fill="#999"/><path d="M15.4661 12.4471L11.5473 8.52829C11.6937 8.50962 11.8429 8.5 11.9944 8.5C13.9274 8.5 15.4944 10.067 15.4944 12C15.4944 12.1515 15.4848 12.3007 15.4661 12.4471Z" fill="#999"/><path d="M18.1118 15.0928C19.0284 14.4702 19.7715 13.7805 20.3413 13.1634C20.9657 12.4872 20.9657 11.5128 20.3413 10.8366C18.8117 9.18002 16.0331 7 12 7C11.3594 7 10.7505 7.05499 10.1732 7.15415L8.50483 5.48582C9.5621 5.1826 10.7272 5 12 5C16.8112 5 20.0833 7.60905 21.8107 9.47978C23.1426 10.9222 23.1426 13.0778 21.8107 14.5202C21.2305 15.1486 20.476 15.8603 19.5474 16.5284L18.1118 15.0928Z" fill="#999"/><path d="M2.00789 3.42207C1.61736 3.03155 1.61736 2.39838 2.00789 2.00786C2.39841 1.61733 3.03158 1.61733 3.4221 2.00786L22.0004 20.5862C22.391 20.9767 22.391 21.6099 22.0004 22.0004C21.6099 22.3909 20.9767 22.3909 20.5862 22.0004L2.00789 3.42207Z" fill="#999"/></svg>`;
        }
      }
    }
  });
}

// Call restoreSectionStates when DOM is ready
document.addEventListener("DOMContentLoaded", restoreSectionStates);
