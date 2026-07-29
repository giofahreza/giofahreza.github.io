(() => {
  const openClass = "is-menu-open";
  const jsClass = "global-header--js";
  const desktopQuery = window.matchMedia("(min-width: 761px)");

  function initPageLoader() {
    const loader = document.querySelector("[data-site-loader]");

    if (!loader) {
      return;
    }

    const startedAt = performance.now();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimumVisibleMs = reduceMotion ? 250 : 1800;
    let finishScheduled = false;

    document.documentElement.classList.add("site-loader-active");

    const finish = () => {
      if (finishScheduled) {
        return;
      }

      finishScheduled = true;
      const remainingDelay = Math.max(0, minimumVisibleMs - (performance.now() - startedAt));

      window.setTimeout(() => {
        loader.classList.add("is-complete");
        document.documentElement.classList.remove("site-loader-active");

        window.setTimeout(() => {
          loader.hidden = true;
        }, reduceMotion ? 20 : 340);
      }, remainingDelay);
    };

    if (document.readyState === "complete") {
      finish();
    } else {
      window.addEventListener("load", finish, { once: true });
    }

    window.setTimeout(finish, 8000);

    window.addEventListener("beforeunload", () => {
      loader.hidden = false;
      loader.classList.remove("is-complete");
      document.documentElement.classList.add("site-loader-active");
    });

    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        loader.hidden = true;
        loader.classList.add("is-complete");
        document.documentElement.classList.remove("site-loader-active");
      }
    });
  }

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

  initPageLoader();

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".global-header").forEach(initHeader);
  });
})();
