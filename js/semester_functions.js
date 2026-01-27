
// Semester management functions
function renderSemesters(semesters) {
    const list = document.getElementById('semestersList');
    if (!list) return;

    list.innerHTML = semesters.map(sem => {
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
                    <button class="btn btn-sm btn-danger" onclick="deleteSemester(${sem.id})">Supprimer</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateSemesterDropdown(semesters) {
    const menu = document.getElementById('semesterDropdownMenu');
    if (!menu || !semesters || semesters.length === 0) return;

    menu.innerHTML = `
        <div class="dropdown-item" data-value="Odd">Impair (S1, S3, S5...)</div>
        <div class="dropdown-item" data-value="Even">Pair (S2, S4, S6...)</div>
    `;
}

function addSemester() {
    const html = `
        <div class="form-group">
            <div class="mb-1">
                <label class="form-label">Code du semestre</label>
                <input type="text" id="addSemesterName" class="form-input" placeholder="ex: S1, S2..." required>
            </div>
            <div class="mb-1">
                <label class="form-label">Nom d'affichage</label>
                <input type="text" id="addSemesterDisplay" class="form-input" placeholder="ex: Semestre 1" required>
            </div>
        </div>
    `;
    Modal.showContent('Nouveau semestre', html);
    const menu = document.getElementById('modalBody');
    const actions = document.createElement('div');
    actions.className = 'grid grid-2 gap-2 mt-3';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary w-100';
    cancelBtn.textContent = 'Annuler';
    cancelBtn.onclick = () => Modal.close();

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary w-100';
    addBtn.textContent = 'Ajouter';
    addBtn.onclick = async () => {
        const name = document.getElementById('addSemesterName').value.trim();
        const displayName = document.getElementById('addSemesterDisplay').value.trim();

        if (!name || !displayName) {
            Toast.error('Erreur', 'Veuillez remplir tous les champs.');
            return;
        }

        await updateSettings({ action: 'add_semester', name, display_name: displayName });
        Modal.close();
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(addBtn);
    menu.appendChild(actions);
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
    Modal.showContent('Modifier le semestre', html);
    const menu = document.getElementById('modalBody');
    const actions = document.createElement('div');
    actions.className = 'grid grid-2 gap-2 mt-3';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary w-100';
    cancelBtn.textContent = 'Annuler';
    cancelBtn.onclick = () => Modal.close();

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary w-100';
    saveBtn.textContent = 'Enregistrer';
    saveBtn.onclick = async () => {
        const newName = document.getElementById('editSemesterName').value.trim();
        const newDisplayName = document.getElementById('editSemesterDisplay').value.trim();

        if (!newName || !newDisplayName) {
            Toast.error('Erreur', 'Veuillez remplir tous les champs.');
            return;
        }

        await updateSettings({ action: 'edit_semester', id, name: newName, display_name: newDisplayName });
        Modal.close();
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    menu.appendChild(actions);
}

function deleteSemester(id) {
    Modal.confirm(
        'Supprimer le semestre',
        'Voulez-vous vraiment supprimer ce semestre ?',
        async () => {
            await updateSettings({ action: 'delete_semester', id });
        },
        null,
        { isDelete: true, confirmText: 'Supprimer' }
    );
}
