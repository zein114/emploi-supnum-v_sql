/**
 * Global Toast Notification System
 * Usage: Toast.show(type, title, message, duration)
 * Types: 'success', 'error', 'info', 'warning'
 */
const Toast = (function () {
  // Config
  const defaultConfig = {
    duration: 4000,
    containerId: "toastContainer",
  };

  // Icons (SVG strings)
  const icons = {
    success:
      '<svg viewBox="0 0 20 20" fill="currentColor" style="color: #10b981;"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    error:
      '<svg viewBox="0 0 20 20" fill="currentColor" style="color: var(--color-error);"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
    info: '<svg viewBox="0 0 20 20" fill="currentColor" style="color: var(--color-primary-blue-light);"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>',
    warning:
      '<svg viewBox="0 0 20 20" fill="currentColor" style="color: var(--color-warning);"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
  };

  // Ensure container exists
  function ensureContainer() {
    let container = document.getElementById(defaultConfig.containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = defaultConfig.containerId;
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  // Create Toast Element
  function createToastElement(type, title, message, id, count = 1) {
    const toast = document.createElement("div");
    toast.className = `toast ${type} entering`;
    toast.setAttribute("data-toast-id", id);

    const iconHtml = icons[type] || icons.info;

    toast.innerHTML = `
            <div class="toast-icon">${iconHtml}</div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ""}
                ${
                  message
                    ? `<div class="toast-description">${message}</div>`
                    : ""
                }
            </div>
            ${count > 1 ? `<div class="toast-counter">${count}</div>` : ""}
            <button class="toast-close" onclick="Toast.dismiss(${id})">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
            </button>
        `;
    return toast;
  }

  let toastId = 0;
  const toastTracker = new Map(); // Track duplicate toasts

  // Helper function to generate toast key
  function generateToastKey(type, title, message) {
    return `${type}:${title || ""}:${message || ""}`;
  }

  return {
    show: function (type, title, message, duration = defaultConfig.duration) {
      // If message is a number, it's actually the duration
      if (typeof message === "number") {
        duration = message;
        message = undefined;
      }

      const container = ensureContainer();

      // Safeguard: If title is strictly "Error" or "Warning" and there is a message,
      // shift the message to the title position to avoid redundant headers.
      if (
        (type === "error" &&
          (title === "Error" || title === "Erreur") &&
          message) ||
        (type === "warning" &&
          (title === "Warning" || title === "Avertissement") &&
          message)
      ) {
        title = message;
        message = undefined;
      }

      const toastKey = generateToastKey(type, title, message);

      // Check if this toast already exists
      if (toastTracker.has(toastKey)) {
        const existingToastData = toastTracker.get(toastKey);
        const existingToast = document.querySelector(
          `[data-toast-id="${existingToastData.id}"]`
        );

        if (existingToast && !existingToast.classList.contains("exiting")) {
          // Increment counter and update display
          existingToastData.count++;
          const counterElement = existingToast.querySelector(".toast-counter");

          if (counterElement) {
            counterElement.textContent = existingToastData.count;
            counterElement.style.animation = "pulse 0.3s ease";
            setTimeout(() => {
              counterElement.style.animation = "";
            }, 300);
          } else {
            // Add counter if it doesn't exist
            const counter = document.createElement("div");
            counter.className = "toast-counter";
            counter.textContent = existingToastData.count;
            counter.style.animation = "pulse 0.3s ease";

            const closeButton = existingToast.querySelector(".toast-close");
            existingToast.insertBefore(counter, closeButton);

            setTimeout(() => {
              counter.style.animation = "";
            }, 300);
          }

          // Reset the timer
          this.resetTimer(existingToastData.id, duration);

          return existingToastData.id;
        }
      }

      // Create new toast
      const id = toastId++;
      const toast = createToastElement(type, title, message, id, 1);
      container.appendChild(toast);

      // Track this toast
      const toastData = {
        id: id,
        count: 1,
        timeout: null,
        isHovered: false,
        duration: duration,
      };

      toastTracker.set(toastKey, toastData);

      // Set initial position using absolute positioning
      toast.style.position = "absolute";

      // Reposition all toasts to accommodate the new one
      this.repositionToasts();

      // Animation: Use a small delay before removing 'entering' to ensure animation finishes safely
      // and the static CSS properties (opacity:1, transform:none) take over.
      toast.addEventListener(
        "animationend",
        (e) => {
          if (e.animationName === "slideInRight") {
            toast.classList.remove("entering");
          }
        },
        { once: true }
      );

      // Fallback in case animationend doesn't fire
      setTimeout(() => {
        if (toast.classList.contains("entering")) {
          toast.classList.remove("entering");
        }
      }, 500);

      // Add hover and click event listeners
      toast.addEventListener("mouseenter", () => {
        this.pauseTimer(id);
      });

      toast.addEventListener("mouseleave", () => {
        this.resumeTimer(id);
      });

      toast.addEventListener("click", () => {
        this.resetTimer(id, duration);
      });

      // Start the timer
      this.startTimer(id, duration);

      return id;
    },

    startTimer: function (id, duration) {
      const toastData = this.getToastData(id);
      if (!toastData) return;

      // Clear any existing timeout
      if (toastData.timeout) {
        clearTimeout(toastData.timeout);
      }

      // Only start timer if not hovered
      if (!toastData.isHovered) {
        toastData.timeout = setTimeout(() => {
          this.dismiss(id);
        }, duration);
      }
    },

    pauseTimer: function (id) {
      const toastData = this.getToastData(id);
      if (!toastData) return;

      toastData.isHovered = true;
      if (toastData.timeout) {
        clearTimeout(toastData.timeout);
        toastData.timeout = null;
      }
    },

    resumeTimer: function (id) {
      const toastData = this.getToastData(id);
      if (!toastData) return;

      toastData.isHovered = false;
      this.startTimer(id, toastData.duration);
    },

    resetTimer: function (id, duration) {
      const toastData = this.getToastData(id);
      if (!toastData) return;

      toastData.duration = duration;
      toastData.isHovered = false;
      this.startTimer(id, duration);
    },

    getToastData: function (id) {
      for (const [key, data] of toastTracker.entries()) {
        if (data.id === id) {
          return data;
        }
      }
      return null;
    },

    success: function (title, message, duration) {
      return this.show("success", title, message, duration);
    },

    error: function (title, message, duration) {
      return this.show("error", title, message, duration);
    },

    info: function (title, message, duration) {
      return this.show("info", title, message, duration);
    },

    warning: function (title, message, duration) {
      return this.show("warning", title, message, duration);
    },

    dismiss: function (id) {
      const toast = document.querySelector(`[data-toast-id="${id}"]`);
      if (!toast || toast.classList.contains("exiting")) return;

      toast.classList.add("exiting");

      // Find and remove from tracker
      let toastKeyToRemove = null;
      for (const [key, data] of toastTracker.entries()) {
        if (data.id === id) {
          toastKeyToRemove = key;
          if (data.timeout) {
            clearTimeout(data.timeout);
          }
          break;
        }
      }

      // Get all remaining toasts that will need to slide up
      const container = ensureContainer();
      const allToasts = Array.from(container.children);
      const toastIndex = allToasts.indexOf(toast);
      const toastsToSlideUp = allToasts.slice(toastIndex + 1);

      // Apply slide-up animation to remaining toasts
      toastsToSlideUp.forEach((remainingToast, index) => {
        const currentTop =
          parseInt(window.getComputedStyle(remainingToast).top) || 0;
        const toastHeight = toast.offsetHeight + 8; // 8px for gap
        remainingToast.style.transition =
          "top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        remainingToast.style.top = `${currentTop - toastHeight}px`;
      });

      setTimeout(() => {
        toast.remove();

        // Remove from tracker
        if (toastKeyToRemove) {
          toastTracker.delete(toastKeyToRemove);
        }

        // Reset positions after removal
        toastsToSlideUp.forEach((remainingToast) => {
          remainingToast.style.transition = "";
          remainingToast.style.top = "";
        });

        // Recalculate positions for all remaining toasts
        this.repositionToasts();
      }, 400); // Match the animation duration
    },

    repositionToasts: function () {
      const container = ensureContainer();
      const toasts = Array.from(container.children);

      toasts.forEach((toast, index) => {
        // Calculate the cumulative height of all previous toasts
        let topPosition = 0;
        for (let i = 0; i < index; i++) {
          const previousToast = toasts[i];
          const toastHeight = previousToast.offsetHeight || 0;
          topPosition += toastHeight + 8; // 8px gap between toasts
        }

        toast.style.position = "absolute";
        toast.style.top = `${topPosition}px`;
        toast.style.right = "0";
      });

      // Update container height to accommodate all toasts
      const totalHeight = toasts.reduce((height, toast) => {
        return height + toast.offsetHeight + 8;
      }, 0);
      container.style.height = `${totalHeight}px`;
    },
  };
})();

// Export
if (typeof module !== "undefined" && module.exports) {
  module.exports = Toast;
} else {
  window.Toast = Toast;
}
