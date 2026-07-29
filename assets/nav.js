(() => {
  const openClass = "is-menu-open";
  const jsClass = "global-header--js";
  const desktopQuery = window.matchMedia("(min-width: 761px)");

  function initHeader(header, index) {
    const toggle = header.querySelector(".global-menu-toggle");
    const nav = header.querySelector(".global-nav");

    if (!toggle || !nav) {
      return;
    }

    if (!nav.id) {
      nav.id = index === 0 ? "globalNav" : `globalNav${index + 1}`;
    }

    header.classList.add(jsClass);
    toggle.setAttribute("aria-controls", nav.id);

    const setOpen = (isOpen) => {
      header.classList.toggle(openClass, isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    };

    setOpen(false);

    toggle.addEventListener("click", () => {
      setOpen(!header.classList.contains(openClass));
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        setOpen(false);
      }
    });

    document.addEventListener("click", (event) => {
      if (!header.contains(event.target)) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });

    desktopQuery.addEventListener("change", (event) => {
      if (event.matches) {
        setOpen(false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".global-header").forEach(initHeader);
  });
})();
