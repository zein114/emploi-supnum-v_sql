/**
 * Global Spinner System for Buttons and Elements
 * Usage: Spinner.show(element) / Spinner.hide(element)
 */
const Spinner = (function () {
  // SVG Template (matching the structure expected by the CSS we added)
  const spinnerSvg = `
    <svg class="button-spinner-svg" viewBox="25 25 50 50">
        <circle cx="50" cy="50" r="20"></circle>
    </svg>
    `;

  return {
    show: function (element) {
      // If element is string, get by ID
      if (typeof element === "string") {
        element = document.getElementById(element);
      }
      if (!element) return;

      // Prevent double loading
      if (element.hasAttribute("data-loading")) return;

      // 1. Save original content and state
      element.setAttribute("data-original-html", element.innerHTML);
      // Save original style attribute if it exists, otherwise empty string
      element.setAttribute(
        "data-original-style",
        element.getAttribute("style") || ""
      );
      element.setAttribute("data-loading", "true");

      // 2. Fix dimensions to prevent resizing
      const rect = element.getBoundingClientRect();
      // Use inline styles to fix width/height and lock them
      element.style.width = `${rect.width}px`;
      element.style.height = `${rect.height}px`;
      element.style.minWidth = `${rect.width}px`;
      element.style.minHeight = `${rect.height}px`;

      // Ensure content is centered if not already handled by CSS
      const computedStyle = window.getComputedStyle(element);
      if (
        computedStyle.display !== "flex" &&
        computedStyle.display !== "inline-flex"
      ) {
        element.style.display = "inline-flex";
        element.style.justifyContent = "center";
        element.style.alignItems = "center";
      }

      // 3. Disable if it's a button/input
      if (element.tagName === "BUTTON" || element.tagName === "INPUT") {
        element.disabled = true;
      }

      // 4. Replace content
      element.innerHTML = spinnerSvg;
    },

    hide: function (element) {
      if (typeof element === "string") {
        element = document.getElementById(element);
      }
      if (!element) return;

      if (!element.hasAttribute("data-loading")) return;

      // Restore content
      element.innerHTML = element.getAttribute("data-original-html");

      // Restore state
      if (element.tagName === "BUTTON" || element.tagName === "INPUT") {
        element.disabled = false;
      }

      // Restore original style attribute exactly
      const originalStyle = element.getAttribute("data-original-style");
      if (originalStyle !== null && originalStyle !== "") {
        element.setAttribute("style", originalStyle);
      } else {
        // If it was null or empty, remove the style attribute entirely
        element.removeAttribute("style");
      }

      // Clean up attributes
      element.removeAttribute("data-original-html");
      element.removeAttribute("data-original-style");
      element.removeAttribute("data-loading");
    },
  };
})();

// Export
if (typeof module !== "undefined" && module.exports) {
  module.exports = Spinner;
} else {
  window.Spinner = Spinner;
}
