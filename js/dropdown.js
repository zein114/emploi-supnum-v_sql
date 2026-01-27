class CustomDropdown {
  constructor() {
    this.dropdowns = document.querySelectorAll(".dropdown-container");
    this.activeDropdown = null;
    this.init();
  }

  init() {
    this.dropdowns.forEach((container) => {
      const button = container.querySelector(".dropdown-button");
      const menu = container.querySelector(".dropdown-menu");
      const items = menu.querySelectorAll(".dropdown-item");

      // Toggle dropdown
      button.addEventListener("click", (e) => {
        if (
          button.disabled ||
          button.getAttribute("aria-disabled") === "true"
        ) {
          return;
        }
        e.stopPropagation();
        this.toggleDropdown(button, menu);
      });

      // Select item
      items.forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectItem(button, menu, item);
        });
      });
    });

    // Close when clicking outside
    document.addEventListener("click", () => {
      this.closeAllDropdowns();
    });

    // Keydown support
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeAllDropdowns();
      }
    });
  }

  toggleDropdown(button, menu) {
    const isOpen = menu.classList.contains("show");
    this.closeAllDropdowns();

    if (!isOpen) {
      button.classList.add("active");
      menu.classList.add("show");
      this.activeDropdown = { button, menu };
    }
  }

  closeAllDropdowns() {
    document
      .querySelectorAll(".dropdown-button")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelectorAll(".dropdown-menu")
      .forEach((menu) => menu.classList.remove("show"));
    this.activeDropdown = null;
  }

  selectItem(button, menu, item) {
    const value = item.getAttribute("data-value");
    const text = item.textContent;
    const textElement = button.querySelector(".dropdown-text");

    // Update UI
    textElement.textContent = text;
    button.setAttribute("data-value", value);

    // Remove selected class from all items
    menu
      .querySelectorAll(".dropdown-item")
      .forEach((i) => i.classList.remove("selected"));
    item.classList.add("selected");

    this.closeAllDropdowns();

    // Dispatch Custom Event
    const event = new CustomEvent("dropdown-change", {
      detail: {
        value: value,
        text: text,
        dropdownId: button.getAttribute("data-dropdown-id"),
      },
    });
    document.dispatchEvent(event);
  }

  updateMenu(dropdownId, itemsHtml) {
    const button = document.querySelector(`[data-dropdown-id="${dropdownId}"]`);
    if (!button) return;

    const container = button.closest(".dropdown-container");
    const menu = container.querySelector(".dropdown-menu");

    menu.innerHTML = itemsHtml;

    // Re-attach listeners
    const newItems = menu.querySelectorAll(".dropdown-item");
    newItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectItem(button, menu, item);
      });
    });

    // Reset selection
    const textElement = button.querySelector(".dropdown-text");
    // textElement.textContent = "Select Option..."; // Keep existing text or reset? Logic varies.
    // user usually changes text manually if needed.
    button.removeAttribute("data-value");
  }

  // Bind dropdowns in a specific container (e.g., Modal)
  initContainer(containerElement) {
    const dropdowns = containerElement.querySelectorAll(".dropdown-container");
    dropdowns.forEach((container) => {
      // Check if already initialized? The easiest way is to re-attach or check a flag.
      // Assuming simple re-attachment provided we don't duplicate events.
      // Since we are creating new HTML in modal, no dupes.

      const button = container.querySelector(".dropdown-button");
      const menu = container.querySelector(".dropdown-menu");
      const items = menu.querySelectorAll(".dropdown-item");

      // Toggle dropdown
      button.addEventListener("click", (e) => {
        if (
          button.disabled ||
          button.getAttribute("aria-disabled") === "true"
        ) {
          return;
        }
        e.stopPropagation();
        this.toggleDropdown(button, menu);
      });

      // Select item
      items.forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectItem(button, menu, item);
        });
      });
    });
  }
}

// Initialize globally
document.addEventListener("DOMContentLoaded", () => {
  window.customDropdown = new CustomDropdown();
});
