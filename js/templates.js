/* =========================================================
   Rangmarg — shared HTML templates (DRY).
   Nav, footer, passport drawer rendered once per page via JS.
   ========================================================= */

function renderSkipLink() {
  return `<a href="#main" class="visually-hidden">Skip to content</a>`;
}

function renderNav(activePage) {
  const pages = [
    { href: "index.html", key: "home", label: "Home" },
    { href: "index.html#destinations", key: "destinations", label: "Destinations" },
    { href: "services.html", key: "services", label: "Services" },
    { href: "about.html", key: "about", label: "About" },
    { href: "contact.html", key: "contact", label: "Contact" },
  ];

  const navLinks = pages
    .map(
      (p) =>
        `<a href="${p.href}" data-page="${p.key}"${p.key === activePage ? ' class="active" aria-current="page"' : ""}>${p.label}</a>`
    )
    .join("");

  return `
  <header class="site-nav">
    <div class="container">
      <a href="index.html" class="wordmark">Rangmarg<span class="dot">.</span></a>
      <nav class="nav-links" id="nav-links" role="navigation" aria-label="Main navigation">${navLinks}</nav>
      <div class="nav-actions">
        <button class="theme-toggle" aria-label="Toggle dark mode">
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
        </button>
        <button class="passport-btn" data-open-passport aria-expanded="false" aria-controls="passport-drawer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>
          Passport <span class="passport-count">0</span>
        </button>
        <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="nav-links"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4>Rangmarg</h4>
          <p>A student-built travel and tourism portal for planning India trips around real, collectible destination stamps.</p>
        </div>
        <div>
          <h4>Explore</h4>
          <a href="index.html">Home</a>
          <a href="index.html#destinations">Destinations</a>
          <a href="services.html">Services</a>
        </div>
        <div>
          <h4>Studio</h4>
          <a href="about.html">About</a>
          <a href="contact.html">Contact</a>
        </div>
        <div>
          <h4>Enquiries</h4>
          <a href="mailto:hello@rangmarg.example">hello@rangmarg.example</a>
          <a href="tel:+911234567890">+91 12345 67890</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; <span data-year></span> Rangmarg. Built as an academic project.</span>
        <span>Made in Jaipur, Rajasthan</span>
      </div>
    </div>
  </footer>`;
}

function renderPassportDrawer() {
  return `
  <div class="drawer-overlay"></div>
  <aside class="passport-drawer" id="passport-drawer" role="dialog" aria-modal="true" aria-label="Your itinerary passport">
    <div class="drawer-head">
      <div><h3>Your passport</h3><p>Stamps collected so far</p></div>
      <button class="drawer-close" aria-label="Close">&times;</button>
    </div>
    <div class="drawer-body"></div>
    <div class="drawer-foot">
      <div class="drawer-actions">
        <button class="btn-secondary drawer-share" data-action="share" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share link
        </button>
        <button class="btn-secondary drawer-pdf" data-action="pdf" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          PDF
        </button>
      </div>
      <a href="contact.html" class="btn-primary btn-primary--block">Send as an enquiry</a>
    </div>
  </aside>`;
}

function injectShell(activePage) {
  const skip = document.createElement("div");
  skip.innerHTML = renderSkipLink();
  document.body.prepend(skip.firstElementChild);

  const nav = document.createElement("div");
  nav.innerHTML = renderNav(activePage);
  document.body.insertBefore(nav.firstElementChild, document.body.querySelector("main"));

  document.body.insertAdjacentHTML("beforeend", renderFooter());
  document.body.insertAdjacentHTML("beforeend", renderPassportDrawer());
}

/* ---------- Theme Toggle ---------- */
function initThemeToggle() {
  const STORAGE_KEY = "rangmarg_theme";
  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    btn.classList.toggle("is-dark", theme === "dark");
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    apply(saved);
  } else {
    apply(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    apply(current === "dark" ? "light" : "dark");
  });
}

/* ---------- Nav Scroll Elevation ---------- */
function initNavScroll() {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        nav.classList.toggle("scrolled", window.scrollY > 24);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}
