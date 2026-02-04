/**
 * Global Modal System
 * Usage: Modal.confirm('Title', 'Message', onConfirm, onCancel, options)
 *        Modal.alert('Title', 'Message', onConfirm)
 */
const Modal = (function () {
  const modalId = "globalModalBackdrop";
  let onConfirmCallback = null;
  let onCancelCallback = null;
  let isLocked = false;

  function setLocked(locked) {
    isLocked = !!locked;
    const cancelBtn = document.getElementById("modalCancelBtn");
    if (cancelBtn) {
      cancelBtn.disabled = isLocked;
      if (isLocked) {
        cancelBtn.style.cursor = "not-allowed";
        cancelBtn.style.opacity = "0.6";
        cancelBtn.style.backgroundColor = "var(--color-bg-card)";
        cancelBtn.style.borderColor = "var(--border-color)";
        cancelBtn.style.color = "var(--text-secondary)";
      } else {
        cancelBtn.style.cursor = "";
        cancelBtn.style.opacity = "";
        cancelBtn.style.backgroundColor = "";
        cancelBtn.style.borderColor = "";
        cancelBtn.style.color = "";
      }
    }
  }

  function ensureModalStructure() {
    let backdrop = document.getElementById(modalId);
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = modalId;
      backdrop.className = "modal-backdrop hidden"; // Hidden initially
      backdrop.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title" id="modalTitle"></h2>
                        <p class="modal-description" id="modalDescription"></p>
                    </div>
                </div>
            `;
      document.body.appendChild(backdrop);

      // Close on backdrop click
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop && !isLocked) {
          close();
        }
      });
    }
    return backdrop;
  }

  function open() {
    const backdrop = ensureModalStructure();
    backdrop.classList.remove("hidden");
    document.body.classList.add("modal-open");

    // Force reflow to ensure initial state is rendered before transition
    void backdrop.offsetWidth;

    // Trigger animation
    requestAnimationFrame(() => {
      backdrop.classList.add("show");
    });
  }

  function cancel() {
    if (isLocked) return;
    close();
  }

  function close() {
    const backdrop = document.getElementById(modalId);
    if (!backdrop) return;

    backdrop.classList.remove("show");
    // Wait for transition
    setTimeout(() => {
      backdrop.classList.add("hidden");
      document.body.classList.remove("modal-open");

      // Reset callbacks to prevent memory leaks or potential errors
      onConfirmCallback = null;
      onCancelCallback = null;
      isLocked = false; // Reset lock state for next modal
    }, 300);

    if (onCancelCallback) {
      onCancelCallback();
    }
  }

  async function handleConfirm() {
    if (onConfirmCallback) {
      setLocked(true);
      try {
        const result = onConfirmCallback();
        if (result instanceof Promise) {
          await result;
        }
      } finally {
        setLocked(false);
      }
    }
    close(); // Close after confirm usually, unless we want async waiting
  }

  return {
    /**
     * Show a confirmation modal
     * @param {string} title
     * @param {string} message
     * @param {Function} onConfirm
     * @param {Function} onCancel (optional)
     * @param {Object} options { confirmText: 'Confirm', cancelText: 'Cancel', confirmClass: 'modal-btn-confirm' }
     */
    confirm: function (
      title,
      message,
      onConfirm,
      onCancel = null,
      options = {},
    ) {
      ensureModalStructure();

      const titleEl = document.getElementById("modalTitle");
      const descEl = document.getElementById("modalDescription");

      // Handle missing actions container by creating it or finding it
      let actionsEl = document.getElementById("modalActions");
      if (!actionsEl) {
        actionsEl = document.createElement("div");
        actionsEl.id = "modalActions";
        actionsEl.className = "modal-actions";
        // Append to modal-content (parent of header/desc)
        // We assume modal-content is the parent of modalTitle's parent div (modal-header)
        // Actually structure is likely: .modal-content > .modal-header, .modal-body
        const contentEl = document.querySelector(
          "#globalModalBackdrop .modal-content",
        );
        if (contentEl) contentEl.appendChild(actionsEl);
      }

      titleEl.textContent = title;
      descEl.textContent = message;
      descEl.style.display = "block"; // Ensure it is visible if previously hidden

      // Hide custom body if exists
      const bodyEl = document.getElementById("modalBody");
      if (bodyEl) bodyEl.style.display = "none";

      onConfirmCallback = onConfirm;
      onCancelCallback = onCancel;

      // Defaults
      const confirmText = options.confirmText || "Confirmer";
      const cancelText = options.cancelText || "Annuler";
      const confirmClass = options.isDelete
        ? "modal-btn-confirm danger"
        : options.confirmClass || "modal-btn-confirm";

      actionsEl.innerHTML = `
        <button class="modal-btn modal-btn-cancel" id="modalCancelBtn">${cancelText}</button>
        <button class="modal-btn ${confirmClass}" id="modalConfirmBtn">${confirmText}</button>
      `;

      // Re-attach events safely
      const cancelBtn = document.getElementById("modalCancelBtn");
      const confirmBtn = document.getElementById("modalConfirmBtn");

      if (cancelBtn) cancelBtn.onclick = cancel;
      if (confirmBtn) confirmBtn.onclick = handleConfirm;

      // Ensure actions are visible/part of layout
      actionsEl.style.display = "flex";

      open();
    },

    alert: function (title, message, onOk = null) {
      ensureModalStructure();

      const titleEl = document.getElementById("modalTitle");
      const descEl = document.getElementById("modalDescription");

      let actionsEl = document.getElementById("modalActions");
      if (!actionsEl) {
        actionsEl = document.createElement("div");
        actionsEl.id = "modalActions";
        actionsEl.className = "modal-actions";
        const contentEl = document.querySelector(
          "#globalModalBackdrop .modal-content",
        );
        if (contentEl) contentEl.appendChild(actionsEl);
      }

      titleEl.textContent = title;
      descEl.textContent = message;
      descEl.style.display = "block";

      const bodyEl = document.getElementById("modalBody");
      if (bodyEl) bodyEl.style.display = "none";

      onConfirmCallback = onOk;
      onCancelCallback = null;

      actionsEl.innerHTML = `
          <button class="modal-btn modal-btn-confirm" id="modalOkBtn">D'accord</button>
        `;

      const okBtn = document.getElementById("modalOkBtn");
      if (okBtn) okBtn.onclick = handleConfirm;

      actionsEl.style.display = "flex";

      open();
    },

    showContent: function (title, htmlContent, onRender = null) {
      ensureModalStructure();

      const titleEl = document.getElementById("modalTitle");
      const descEl = document.getElementById("modalDescription");

      // For showContent, we might not need standard actions if the HTML has them.
      // But we should clean up standard actions if they exist.
      const actionsEl = document.getElementById("modalActions");
      if (actionsEl) {
        actionsEl.innerHTML = "";
        actionsEl.style.display = "none"; // Hide standard actions for custom content
      }

      titleEl.textContent = title;

      let bodyEl = document.getElementById("modalBody");
      if (!bodyEl) {
        bodyEl = document.createElement("div");
        bodyEl.id = "modalBody";
        bodyEl.className = "modal-body";
        // Convert to flex column layout if needed on the fly?
        // Or just append. parent is .modal-content
        // structure: .modal-content > .modal-header
        // insert after header
        const headerEl = descEl.parentNode;
        headerEl.parentNode.insertBefore(bodyEl, headerEl.nextSibling);
      }

      descEl.style.display = "none";
      bodyEl.style.display = "block";
      bodyEl.innerHTML = htmlContent;

      open();

      if (onRender) {
        setTimeout(onRender, 0);
      }
    },

    close: close,
    setLocked: setLocked,
    cancel: cancel,
  };
})();

// Export
if (typeof module !== "undefined" && module.exports) {
  module.exports = Modal;
} else {
  window.Modal = Modal;
}
