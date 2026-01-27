// Users Management JavaScript

// Global variable to track current user ID
let currentUserId = null;

// Load Users on page load
document.addEventListener("DOMContentLoaded", async () => {
  // Fetch current user ID
  try {
    const response = await fetch("../api/get_current_user.php");
    const data = await response.json();
    if (data.success && data.user) {
      currentUserId = data.user.id;
    }
  } catch (error) {
    console.error("Error fetching current user:", error);
  }

  loadUsers();

  // Search functionality
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", filterUsers);
  }
});

// Search Filter function
function filterUsers() {
  const searchInput = document
    .getElementById("searchInput")
    .value.toLowerCase();
  const rows = document.querySelectorAll("#usersTable tbody tr");
  let visibleCount = 0;

  rows.forEach((row) => {
    // Check username (col-username) and email (col-email)
    const usernameCell = row.querySelector(".col-username");
    const emailCell = row.querySelector(".col-email");

    if (usernameCell || emailCell) {
      const username = usernameCell
        ? usernameCell.textContent.toLowerCase()
        : "";
      const email = emailCell ? emailCell.textContent.toLowerCase() : "";

      if (username.includes(searchInput) || email.includes(searchInput)) {
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
        <td colspan="6" class="no-results">
          Aucun utilisateur ne correspond à votre recherche.
        </td>
      `;
      document.querySelector("#usersTable tbody").appendChild(noResultsRow);
    }
  } else if (noResultsRow) {
    noResultsRow.remove();
  }
}

// Load Users
async function loadUsers() {
  try {
    const tbody = document.querySelector("#usersTable tbody");
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center" style="padding: 2rem;">Chargement des données...</td></tr>';

    const response = await fetch("../api/get_all_users.php");
    const users = await response.json();

    tbody.innerHTML = "";

    users.forEach((user) => {
      const tr = document.createElement("tr");
      const isCurrentUser = currentUserId && user.id === currentUserId;
      const deleteDisabled = isCurrentUser ? "disabled" : "";
      const deleteStyle = isCurrentUser
        ? "opacity: 0.5; cursor: not-allowed;"
        : "";

      tr.innerHTML = `
                <td class="col-id">${user.id}</td>
                <td class="col-username"><strong>${user.username}</strong></td>
                <td class="col-email">${user.email}</td>
                <td class="col-role"><span class="badge badge-${getRoleBadgeClass(
                  user.role
                )}">${
        user.role === "admin"
          ? "Administrateur"
          : user.role === "professor"
          ? "Professeur"
          : user.role
      }</span></td>
                <td class="col-created">${formatDate(user.created_at)}</td>
                <td class="col-actions">
                    <button class="btn btn-success btn-sm edit-user-btn" style="margin-right: 0.5rem;">
                        Modifier
                    </button>
                    <button class="btn btn-danger btn-sm delete-user-btn" ${deleteDisabled} style="${deleteStyle}">
                        Supprimer
                    </button>
                </td>
            `;

      // Add Event Listeners
      const editBtn = tr.querySelector(".edit-user-btn");
      if (editBtn) {
        editBtn.addEventListener("click", () => {
          editUser(user.id, user.username, user.email, user.role, user.id_prof);
        });
      }

      const deleteBtn = tr.querySelector(".delete-user-btn");
      if (deleteBtn && !isCurrentUser) {
        deleteBtn.addEventListener("click", () => {
          deleteUser(user.id, user.username);
        });
      }

      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error loading users:", error);
  }
}

// Add User Form HTML
const addUserFormHtml = `
  <div class="form-group">
      <label for="newUsername" class="form-label">Nom d'utilisateur</label>
      <input type="text" id="newUsername" class="form-input" required placeholder="Saisissez un nom d'utilisateur">
  </div>
  <div class="form-group">
      <label for="newEmail" class="form-label">E-mail</label>
      <input type="email" id="newEmail" class="form-input" required placeholder="Saisissez une adresse e-mail">
  </div>
  <div class="form-group">
      <label for="newPassword" class="form-label">Mot de passe</label>
      <input type="password" id="newPassword" class="form-input" placeholder="Saisissez un mot de passe (laisser vide pour utiliser la valeur par défaut)">
      <small style="color: var(--text-muted); display: block; margin-top: 0.25rem;">Laissez vide pour utiliser le mot de passe par défaut "SupNum"</small>
  </div>
  <div class="form-group">
      <label class="form-label">Rôle</label>
      
      <div class="dropdown-container">
          <button type="button" class="dropdown-button" data-dropdown-id="roleSelect" data-value="professor">
              <span class="dropdown-text">Professeur</span>
              <div class="dropdown-arrow"></div>
          </button>
          <div class="dropdown-menu">
              <div class="dropdown-item selected" data-value="professor">Professeur</div>
              <div class="dropdown-item" data-value="admin">Administrateur</div>
          </div>
      </div>
  </div>
  <div class="flex gap-1" style="justify-content: flex-end; margin-top: 1.5rem;">
      <button type="button" class="btn btn-secondary" onclick="Modal.cancel()">Annuler</button>
      <button type="button" class="btn btn-primary" id="submitAddUserBtn">Ajouter un utilisateur</button>
  </div>
`;

// Modal functions
function openAddUserModal() {
  Modal.showContent("Ajouter un nouvel utilisateur", addUserFormHtml, () => {
    if (window.customDropdown) {
      window.customDropdown.initContainer(document.getElementById("modalBody"));
    }
    document
      .getElementById("submitAddUserBtn")
      .addEventListener("click", submitAddUser);
  });
}

function closeAddUserModal() {
  Modal.close();
}

async function submitAddUser() {
  const username = document.getElementById("newUsername").value;
  const email = document.getElementById("newEmail").value;
  const password = document.getElementById("newPassword").value;
  const roleBtn = document.querySelector('[data-dropdown-id="roleSelect"]');
  const role = roleBtn ? roleBtn.getAttribute("data-value") : null;
  const submitBtn = document.getElementById("submitAddUserBtn");

  if (!username || !email || !role) {
    Toast.warning(
      "Veuillez renseigner le nom d'utilisateur, l'e-mail et le rôle."
    );
    return;
  }

  // Show spinner
  if (typeof Spinner !== "undefined") Spinner.show(submitBtn);
  if (window.Modal && typeof Modal.setLocked === "function") {
    Modal.setLocked(true);
  }

  try {
    const response = await fetch("../api/add_user.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password, role }),
    });

    const result = await response.json();

    if (result.success) {
      closeAddUserModal();
      loadUsers();
      Toast.success("Utilisateur ajouté avec succès.");
    } else {
      Toast.error(result.error || "Échec de l'ajout de l'utilisateur.");
    }
  } catch (error) {
    console.error("Error adding user:", error);
    Toast.error("Échec de l'ajout de l'utilisateur.");
  } finally {
    // Hide spinner
    if (typeof Spinner !== "undefined") Spinner.hide(submitBtn);
    if (window.Modal && typeof Modal.setLocked === "function") {
      Modal.setLocked(false);
    }
  }
}

// Edit User Form HTML
const editUserFormHtml = (userId, username, email, role, idProf) => {
  const isCurrentUser = currentUserId && userId === currentUserId;
  const roleWarning = isCurrentUser
    ? `
<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 0.75rem; margin-top: 0.5rem;">
  <small style="color: #ef4444;">
    <span style="position: relative; padding-left: 1.4rem;">
      
      <!-- Icon sitting “behind” the word -->
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); opacity: 0.9;"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="14" />
        <circle cx="12" cy="17" r="1.25" fill="currentColor" stroke="none" />
      </svg>

      <strong>Attention :</strong>
    </span>
    Modifier votre propre rôle vous déconnectera et vous redirigera vers la page de connexion.
  </small>
</div>
`
    : "";

  return `
  <input type="hidden" id="editUserId" value="${userId}">
  <input type="hidden" id="editOriginalUsername" value="${username}">
  <input type="hidden" id="editOriginalEmail" value="${email}">
  <input type="hidden" id="editOriginalRole" value="${role}">
  <input type="hidden" id="editOriginalIdProf" value="${idProf || ""}">
  <div class="form-group">
      <label for="editUsername" class="form-label">Nom d'utilisateur</label>
      <input type="text" id="editUsername" class="form-input" required placeholder="Saisissez un nom d'utilisateur" value="${username}">
  </div>
  <div class="form-group">
      <label for="editEmail" class="form-label">E-mail</label>
      <input type="email" id="editEmail" class="form-input" required placeholder="Saisissez une adresse e-mail" value="${email}">
  </div>
  <div class="form-group">
      <label for="editPassword" class="form-label">Nouveau mot de passe</label>
      <input type="password" id="editPassword" class="form-input" placeholder="Laissez vide pour conserver le mot de passe actuel">
      <small style="color: var(--text-muted); display: block; margin-top: 0.25rem;">Laissez vide pour conserver le mot de passe actuel</small>
  </div>
  <div class="form-group">
      <label class="form-label">Rôle</label>
      
      <div class="dropdown-container">
          <button type="button" class="dropdown-button" data-dropdown-id="editRoleSelect" data-value="${role}">
              <span class="dropdown-text">${
                role.charAt(0).toUpperCase() + role.slice(1)
              }</span>
              <div class="dropdown-arrow"></div>
          </button>
          <div class="dropdown-menu">
              <div class="dropdown-item ${
                role === "professor" ? "selected" : ""
              }" data-value="professor">Professeur</div>
              <div class="dropdown-item ${
                role === "admin" ? "selected" : ""
              }" data-value="admin">Administrateur</div>
          </div>
      </div>
      ${roleWarning}
  </div>
  <div class="flex gap-1" style="justify-content: flex-end; margin-top: 1.5rem;">
      <button type="button" class="btn btn-secondary" onclick="Modal.cancel()">Annuler</button>
      <button type="button" class="btn btn-primary" id="submitEditUserBtn">Mettre à jour l'utilisateur</button>
  </div>
`;
};

// Edit user
function editUser(userId, username, email, role, idProf) {
  Modal.showContent(
    "Modifier un utilisateur",
    editUserFormHtml(userId, username, email, role, idProf),
    () => {
      if (window.customDropdown) {
        window.customDropdown.initContainer(
          document.getElementById("modalBody")
        );
      }
      document
        .getElementById("submitEditUserBtn")
        .addEventListener("click", submitEditUser);
    }
  );
}

async function submitEditUser() {
  const userId = document.getElementById("editUserId").value;
  const username = document.getElementById("editUsername").value;
  const email = document.getElementById("editEmail").value;
  const password = document.getElementById("editPassword").value;
  const roleBtn = document.querySelector('[data-dropdown-id="editRoleSelect"]');
  const role = roleBtn ? roleBtn.getAttribute("data-value") : null;
  const submitBtn = document.getElementById("submitEditUserBtn");

  // Get original values
  const originalUsername = document.getElementById(
    "editOriginalUsername"
  ).value;
  const originalEmail = document.getElementById("editOriginalEmail").value;
  const originalRole = document.getElementById("editOriginalRole").value;
  const originalIdProf = document.getElementById("editOriginalIdProf").value;

  if (!username || !email || !role) {
    Toast.warning(
      "Veuillez renseigner le nom d'utilisateur, l'e-mail et le rôle."
    );
    return;
  }

  // Check if any changes were made
  const hasChanges =
    username !== originalUsername ||
    email !== originalEmail ||
    role !== originalRole ||
    password.trim() !== "";

  if (!hasChanges) {
    Toast.warning("Veuillez effectuer des modifications avant de valider.");
    return;
  }

  // Show spinner
  if (typeof Spinner !== "undefined") Spinner.show(submitBtn);
  if (window.Modal && typeof Modal.setLocked === "function") {
    Modal.setLocked(true);
  }

  try {
    const response = await fetch("../api/update_user.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        username,
        email,
        password,
        role,
        original_role: originalRole,
        original_id_prof: originalIdProf,
        original_username: originalUsername,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Check if user edited their own role
      const isCurrentUser = currentUserId && parseInt(userId) === currentUserId;
      if (isCurrentUser && originalRole !== role) {
        // Log out and redirect to login
        Toast.success(
          "Le rôle a été modifié avec succès. Déconnexion en cours..."
        );
        setTimeout(() => {
          window.location.href = "../logout.php";
        }, 1500);
        return;
      }
      Modal.close();
      loadUsers();
      Toast.success("Utilisateur mis à jour avec succès.");
    } else {
      Toast.error(result.error || "Échec de la mise à jour de l'utilisateur.");
    }
  } catch (error) {
    console.error("Error updating user:", error);
    Toast.error("Échec de la mise à jour de l'utilisateur.");
  } finally {
    // Hide spinner
    if (typeof Spinner !== "undefined") Spinner.hide(submitBtn);
    if (window.Modal && typeof Modal.setLocked === "function") {
      Modal.setLocked(false);
    }
  }
}

// Delete user
function deleteUser(userId, username) {
  // Prevent deleting current user
  if (currentUserId && parseInt(userId) === parseInt(currentUserId)) {
    Toast.warning("Vous ne pouvez pas supprimer votre propre compte.");
    return;
  }

  Modal.confirm(
    "Supprimer l'utilisateur",
    `Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ?`,
    async () => {
      // Find the confirm button in the modal
      const confirmBtn = document.getElementById("modalConfirmBtn");
      if (typeof Spinner !== "undefined" && confirmBtn)
        Spinner.show(confirmBtn);

      try {
        const response = await fetch("../api/delete_user.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: userId }),
        });

        const result = await response.json();

        if (result.success) {
          loadUsers();
          Toast.success("Utilisateur supprimé avec succès.");
        } else {
          Toast.error(
            result.error || "Échec de la suppression de l'utilisateur."
          );
        }
      } catch (error) {
        console.error("Error deleting user:", error);
        Toast.error("Échec de la suppression de l'utilisateur.");
      } finally {
        if (typeof Spinner !== "undefined" && confirmBtn)
          Spinner.hide(confirmBtn);
      }
    },
    null,
    {
      isDelete: true,
      confirmText: "Supprimer",
      confirmClass: "modal-btn-confirm danger",
    }
  );
}

// Utility functions
function getRoleBadgeClass(role) {
  switch (role) {
    case "admin":
      return "warning";
    case "professor":
      return "success";
    case "student":
      return "primary";
    default:
      return "primary";
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
