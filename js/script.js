/* =========================================================
   Rangmarg — shared front-end logic (localStorage-backed).
   No server yet: this is the frontend-only phase. Search is
   simulated as a debounced local filter standing in for the
   future AJAX endpoint; the itinerary "passport" cart is the
   real, working differentiator for this build.
   ========================================================= */

const CART_KEY = "rangmarg_passport_v1";

function getCart(){
  try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch(e){ return []; }
}
function setCart(items){
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch(e) {
    showToast("Storage full — remove some items first.");
    return;
  }
  updatePassportCount();
}
function isInCart(name){ return getCart().some(d => d.name === name); }
function addToCart(dest){
  const cart = getCart();
  if(cart.some(d => d.name === dest.name)) return;
  cart.push(dest);
  setCart(cart);
}
function removeFromCart(name){
  setCart(getCart().filter(d => d.name !== name));
  renderDrawer();
}
function updatePassportCount(){
  document.querySelectorAll(".passport-count").forEach(el => {
    el.textContent = getCart().length;
  });
}

/* ---------- Nav ---------- */
function initNav(){
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if(toggle && links){
    toggle.addEventListener("click", () => {
      links.classList.toggle("is-open");
      toggle.classList.toggle("is-open");
      const open = links.classList.contains("is-open");
      toggle.setAttribute("aria-expanded", open);
    });
    links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
      links.classList.remove("is-open");
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }));
  }
}

/* ---------- Passport drawer ---------- */
function initDrawer(){
  const drawer = document.querySelector(".passport-drawer");
  const overlay = document.querySelector(".drawer-overlay");
  if(!drawer || !overlay) return;

  const openBtns = document.querySelectorAll("[data-open-passport]");
  const open = () => {
    drawer.classList.add("is-open"); overlay.classList.add("is-open");
    openBtns.forEach(b => b.setAttribute("aria-expanded", "true"));
    renderDrawer();
  };
  const close = () => {
    drawer.classList.remove("is-open"); overlay.classList.remove("is-open");
    openBtns.forEach(b => b.setAttribute("aria-expanded", "false"));
  };

  openBtns.forEach(btn => btn.addEventListener("click", open));
  document.querySelector(".drawer-close")?.addEventListener("click", close);
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", e => { if(e.key === "Escape") close(); });
}

/* ---------- Smart Suggestions ---------- */
const SUGGESTION_RULES = {
  heritage:   { icon: "🏛", tip: "Carry comfortable walking shoes" },
  city:       { icon: "🌆", tip: "Use metro for quick city hops" },
  beach:      { icon: "🏖", tip: "Pack sunscreen & a waterproof phone pouch" },
  mountain:   { icon: "⛰", tip: "Layer up — temperatures drop fast at altitude" },
  desert:     { icon: "🏜", tip: "Hydration pack & a scarf for sand" },
  spiritual:  { icon: "🙏", tip: "Dress modestly — carry a shawl or scarf" },
  adventure:  { icon: "🎒", tip: "Wear sturdy footwear, carry a small daypack" },
  romantic:   { icon: "🌅", tip: "Book a sunset-view dinner spot" },
  backwater:  { icon: "🛶", tip: "Insect repellent is a must" },
  diving:     { icon: "🤿", tip: "Get certified before you go" },
  nightlife:  { icon: "🎶", tip: "Carry ID for club entries" },
  tea:        { icon: "🍃", tip: "Carry a warm jacket for plantation walks" },
  ruins:      { icon: "🗿", tip: "Go early — ruins are cooler before noon" },
  river:      { icon: "🌊", tip: "Waterproof bag for boat rides" },
  icon:       { icon: "📸", tip: "Visit at sunrise for fewer crowds" },
  premium:    { icon: "✨", tip: "Book boutique stays early — they fill fast" },
  budget:     { icon: "💰", tip: "Street food is safe & delicious here" },
  "mid-range":{ icon: "🍽", tip: "Mix local dhabas with one nice restaurant per day" },
};

function parseDaysMin(daysStr) {
  const m = daysStr.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 2;
}

function getSuggestions(cart) {
  const seen = new Set();
  const tips = [];
  cart.forEach(d => {
    d.tags.forEach(tag => {
      if (SUGGESTION_RULES[tag] && !seen.has(tag)) {
        seen.add(tag);
        tips.push(SUGGESTION_RULES[tag]);
      }
    });
    const budgetKey = d.budget.toLowerCase();
    if (SUGGESTION_RULES[budgetKey] && !seen.has(budgetKey)) {
      seen.add(budgetKey);
      tips.push(SUGGESTION_RULES[budgetKey]);
    }
  });
  return tips;
}

function renderDrawer(){
  const body = document.querySelector(".drawer-body");
  if(!body) return;
  const cart = getCart();

  /* Update drawer subtitle */
  const subtitle = document.querySelector(".drawer-head p");
  if(subtitle){
    subtitle.textContent = cart.length === 0
      ? "Stamps collected so far"
      : `${cart.length} stamp${cart.length > 1 ? 's' : ''} · ${cart.reduce((s,d) => s + parseDaysMin(d.days), 0)}+ days planned`;
  }

  if(cart.length === 0){
    body.innerHTML = `
      <div class="drawer-empty">
        <div class="drawer-empty-stamp" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="24" cy="24" r="20" stroke-dasharray="4 4"/>
            <text x="24" y="20" text-anchor="middle" font-family="var(--font-mono)" font-size="8" fill="currentColor" stroke="none" font-weight="600">YOUR</text>
            <text x="24" y="30" text-anchor="middle" font-family="var(--font-mono)" font-size="8" fill="currentColor" stroke="none" font-weight="600">TRIP</text>
          </svg>
        </div>
        <p class="drawer-empty-title">Your passport is empty</p>
        <p class="drawer-empty-hint">Tap the stamp icon on any destination to start building your itinerary.</p>
      </div>`;
  } else {
    /* --- Itinerary Summary Stats --- */
    const totalDays = cart.reduce((sum, d) => sum + parseDaysMin(d.days), 0);
    const regions = [...new Set(cart.map(d => d.region))];

    let html = `
      <div class="itinerary-stats">
        <div class="itinerary-stat">
          <span class="itinerary-stat-num">${cart.length}</span>
          <span class="itinerary-stat-label">destinations</span>
        </div>
        <div class="itinerary-stat">
          <span class="itinerary-stat-num">${totalDays}+</span>
          <span class="itinerary-stat-label">days</span>
        </div>
        <div class="itinerary-stat">
          <span class="itinerary-stat-num">${regions.length}</span>
          <span class="itinerary-stat-label">regions</span>
        </div>
      </div>`;

    /* --- Day-by-day Timeline --- */
    let dayCounter = 1;
    html += `<div class="itinerary-timeline">`;
    cart.forEach((d, i) => {
      const dur = parseDaysMin(d.days);
      const dayEnd = dayCounter + dur - 1;
      html += `
        <div class="timeline-node">
          <div class="timeline-rail">
            <div class="timeline-dot"></div>
            ${i < cart.length - 1 ? '<div class="timeline-line"></div>' : ''}
          </div>
          <div class="timeline-content">
            <div class="timeline-day">Day ${dayCounter}${dur > 1 ? '–' + dayEnd : ''}</div>
            <div class="timeline-card">
              <div class="timeline-card-head">
                <span class="timeline-postmark">${d.code}</span>
                <div>
                  <b>${d.name}</b>
                  <span class="timeline-region">${d.region} · ${d.state}</span>
                </div>
                <button class="remove" aria-label="Remove ${d.name}" data-remove="${d.name}">&times;</button>
              </div>
              <p class="timeline-tagline">${d.tagline}</p>
            </div>
          </div>
        </div>`;
      dayCounter = dayEnd + 1;
    });
    html += `</div>`;

    /* --- Smart Suggestions --- */
    const suggestions = getSuggestions(cart);
    if(suggestions.length > 0){
      html += `
        <div class="suggestions-panel">
          <div class="suggestions-head">
            <span class="eyebrow" style="font-size:10px;">Smart tips</span>
          </div>
          <ul class="suggestions-list">
            ${suggestions.map(s => `
              <li class="suggestion-item">
                <span class="suggestion-icon">${s.icon}</span>
                <span class="suggestion-text">${s.tip}</span>
              </li>`).join('')}
          </ul>
        </div>`;
    }

    body.innerHTML = html;

    body.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => {
        const row = btn.closest('.timeline-node');
        if(row){
          row.classList.add('is-removing');
          const fallback = setTimeout(() => removeFromCart(btn.dataset.remove), 1000);
          row.addEventListener('animationend', () => { clearTimeout(fallback); removeFromCart(btn.dataset.remove); }, {once:true});
        } else {
          removeFromCart(btn.dataset.remove);
        }
      });
    });
  }
  const foot = document.querySelector(".drawer-foot .btn-primary");
  if(foot) foot.toggleAttribute("disabled", cart.length === 0);

  /* Enable/disable share & PDF buttons */
  document.querySelectorAll(".drawer-share, .drawer-pdf").forEach(btn => {
    btn.toggleAttribute("disabled", cart.length === 0);
  });
}

/* ---------- Share Itinerary ---------- */
function shareItinerary(){
  const cart = getCart();
  if(cart.length === 0) return;

  const payload = cart.map(d => ({
    n: d.name, c: d.code, r: d.region, s: d.state,
    t: d.tagline, d: d.days, b: d.budget, tg: d.tags
  }));
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = `${location.origin}${location.pathname.replace(/\/[^/]*$/, '/')}share.html#${encoded}`;

  if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(() => {
      showToast("Share link copied!");
    }).catch(() => {
      prompt("Copy this link:", url);
    });
  } else {
    prompt("Copy this link:", url);
  }
}

function showToast(msg){
  const existing = document.querySelector(".toast");
  if(existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

/* ---------- PDF Export ---------- */
function exportPDF(){
  const cart = getCart();
  if(cart.length === 0) return;

  let dayCounter = 1;
  const rows = cart.map(d => {
    const dur = parseDaysMin(d.days);
    const dayEnd = dayCounter + dur - 1;
    const dayLabel = `Day ${dayCounter}${dur > 1 ? '–' + dayEnd : ''}`;
    dayCounter = dayEnd + 1;
    return { dayLabel, name: d.name, code: d.code, region: d.region, state: d.state, tagline: d.tagline, days: d.days };
  });

  const totalDays = cart.reduce((s,d) => s + parseDaysMin(d.days), 0);
  const regions = [...new Set(cart.map(d => d.region))];

  const win = window.open('', '_blank');
  if(!win){ showToast("Popup blocked — please allow popups and try again."); return; }
  win.document.write(`<!DOCTYPE html>
<html><head>
<title>Rangmarg — My Itinerary</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',sans-serif;color:#0D2B29;background:#fff;padding:48px;max-width:800px;margin:0 auto}
  h1{font-family:'Poppins',sans-serif;font-size:32px;font-weight:700;letter-spacing:-0.02em;margin-bottom:4px}
  .subtitle{color:#4A7A77;font-size:14px;margin-bottom:32px}
  .stats{display:flex;gap:32px;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid #EDE7DC}
  .stat b{display:block;font-size:24px;font-family:'Poppins',sans-serif;font-weight:700}
  .stat span{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#4A7A77}
  table{width:100%;border-collapse:collapse;margin-bottom:32px}
  th{text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#C44D20;padding:8px 12px;border-bottom:2px solid #C44D20}
  td{padding:10px 12px;border-bottom:1px solid #EDE7DC;font-size:13px;vertical-align:top}
  td:first-child{font-family:'JetBrains Mono',monospace;font-size:11px;color:#C44D20;font-weight:600;white-space:nowrap}
  .name{font-family:'Poppins',sans-serif;font-weight:600;font-size:14px}
  .tagline{color:#4A7A77;font-size:12px;margin-top:2px}
  .footer{text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:#4A7A77;padding-top:24px;border-top:1px solid #EDE7DC}
  @media print{body{padding:24px}}
</style></head><body>
<h1>My Rangmarg Itinerary</h1>
<p class="subtitle">${cart.length} destinations · ${totalDays}+ days · ${regions.join(', ')}</p>
<div class="stats">
  <div class="stat"><b>${cart.length}</b><span>Destinations</span></div>
  <div class="stat"><b>${totalDays}+</b><span>Days</span></div>
  <div class="stat"><b>${regions.length}</b><span>Regions</span></div>
</div>
<table><thead><tr><th>When</th><th>Destination</th><th>Region</th><th>Duration</th></tr></thead><tbody>
${rows.map(r => `<tr><td>${r.dayLabel}</td><td><div class="name">${r.name}</div><div class="tagline">${r.tagline}</div></td><td>${r.region} · ${r.state}</td><td>${r.days}</td></tr>`).join('')}
</tbody></table>
<div class="footer">rangmarg.in · Your travel passport</div>
<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script>
</body></html>`);
  win.document.close();
}

/* ---------- Init drawer actions ---------- */
function initDrawerActions(){
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-action]");
    if(!btn) return;
    if(btn.dataset.action === "share") shareItinerary();
    if(btn.dataset.action === "pdf") exportPDF();
  });
}

/* ---------- Stamp cards (Home) — Double-Bezel ---------- */
let stampCardIdx = 0;
function stampCardHTML(d){
  stampCardIdx++;
  const added = isInCart(d.name);
  return `
  <article class="stamp-card" data-name="${d.name}" data-region="${d.region}" data-budget="${d.budget}" data-tags="${d.tags.join(',')}">
    <span class="stamp-card-num">N\u00ba ${String(stampCardIdx).padStart(2,'0')}</span>
    <div class="stamp-card-inner">
      <div class="airmail-edge"></div>
      <div class="stamp-img">
        <img src="${d.image}" alt="${d.name}" loading="lazy" width="600" height="400">
      </div>
      <div class="stamp-content">
        <div class="postmark">${d.code}<small>INDIA</small></div>
        <span class="region-tag">${d.region} &middot; ${d.state}</span>
        <h3>${d.name}</h3>
        <p class="tagline">${d.tagline}</p>
        <div class="stamp-meta">
          <span>&#9201; ${d.days}</span>
          <span>&#8377; ${d.budget}</span>
        </div>
        <button class="add-stamp-btn ${added ? "is-added" : ""}" data-add="${d.name}">
          <span class="ink-burst"></span>
          <span class="btn-label">${added ? "Stamped ✓" : "Add to itinerary"}</span>
        </button>
      </div>
    </div>
  </article>`;
}

/* ---------- Dynamic Bento Grid ---------- */
function renderBentoGrid(list){
  const grid = document.querySelector(".stamp-grid");
  if(!grid) return;
  stampCardIdx = 0;
  grid.innerHTML = "";

  /* Empty state — no results */
  if(list.length === 0){
    grid.innerHTML = `
      <div class="stamp-empty">
        <div class="stamp-empty-postmark">?</div>
        <h3>No stamps match these filters</h3>
        <p>Try clearing your search or adjusting the region and budget.</p>
        <button class="btn-secondary stamp-empty-clear" onclick="document.querySelector('.clear-filters')?.click()">Clear all filters</button>
      </div>`;
    return;
  }

  /* Build row patterns dynamically from list length */
  const patterns = [];
  let remaining = list.length;
  const PATTERNS = [
    { type:"hero",   count:3 },
    { type:"pair",   count:2 },
    { type:"triple", count:3 },
    { type:"wide",   count:2 },
  ];
  let pi = 0;
  while(remaining > 0){
    const pat = PATTERNS[pi % PATTERNS.length];
    const take = Math.min(pat.count, remaining);
    patterns.push({ type: pat.type, count: take });
    remaining -= take;
    pi++;
  }

  let idx = 0;
  patterns.forEach(row => {
    const rowEl = document.createElement("div");
    rowEl.className = `bento-row bento-row--${row.type}`;
    for(let i = 0; i < row.count && idx < list.length; i++, idx++){
      const wrapper = document.createElement("div");
      wrapper.innerHTML = stampCardHTML(list[idx]);
      rowEl.appendChild(wrapper.firstElementChild);
    }
    grid.appendChild(rowEl);
  });
}

function renderDestinations(list){
  renderBentoGrid(list);
  bindStampButtons();
  initImageSkeletons();
  const meta = document.querySelector(".results-meta");
  if(meta) meta.innerHTML = `Showing <b>${list.length}</b> of <b>${DESTINATIONS.length}</b> destinations`;
  requestAnimationFrame(() => observeReveals());
}

/* ---------- Top Routes Carousel ---------- */
function initCarousel(){
  const track = document.querySelector("#carousel-track");
  const dotsContainer = document.querySelector("#carousel-dots");
  const prevBtn = document.querySelector(".carousel-prev");
  const nextBtn = document.querySelector(".carousel-next");
  if(!track || typeof ROUTES === "undefined") return;

  let current = 0;
  let autoplayTimer;
  let isPaused = false;

  /* Render slides */
  track.innerHTML = ROUTES.map((r, i) => `
    <div class="carousel-slide" data-index="${i}">
      <img src="${r.image}" alt="${r.name}" loading="${i === 0 ? 'eager' : 'lazy'}" width="1200" height="600">
      <div class="route-num" aria-hidden="true">${String(i+1).padStart(2,'0')}<small>/${String(ROUTES.length).padStart(2,'0')}</small></div>
      <div class="carousel-overlay">
        <h3>${r.name}</h3>
        <span class="route-tagline">${r.tagline}</span>
        <div class="route-stops">
          ${r.stops.map((s, j) => `<span class="route-chip">${j > 0 ? '<span class="route-dot"></span>' : ''}${s}</span>`).join("")}
          <span class="route-duration-stamp">${r.duration}</span>
        </div>
      </div>
    </div>`).join("");

  /* Render dots */
  dotsContainer.innerHTML = ROUTES.map((_, i) =>
    `<button class="carousel-dot${i === 0 ? ' is-active' : ''}" data-slide="${i}" aria-label="Go to slide ${i + 1}"></button>`
  ).join("");

  /* Progress line — sits above the dots, fills across the current slide */
  let progressEl = document.querySelector(".carousel-progress");
  if(!progressEl){
    progressEl = document.createElement("div");
    progressEl.className = "carousel-progress";
    progressEl.setAttribute("aria-hidden", "true");
    const progressFill = document.createElement("div");
    progressFill.className = "carousel-progress-fill";
    progressEl.appendChild(progressFill);
    dotsContainer.parentNode.insertBefore(progressEl, dotsContainer);
  }
  const progressFill = progressEl.querySelector(".carousel-progress-fill");

  const AUTOPLAY_MS = 6500;
  function goTo(index){
    current = (index + ROUTES.length) % ROUTES.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsContainer.querySelectorAll(".carousel-dot").forEach((d, i) => {
      d.classList.toggle("is-active", i === current);
    });
    /* Animate overlay text on the new slide */
    track.querySelectorAll(".carousel-overlay").forEach(o => o.classList.remove("is-entering"));
    const active = track.querySelector(`.carousel-slide[data-index="${current}"] .carousel-overlay`);
    if(active) requestAnimationFrame(() => active.classList.add("is-entering"));
  }
  function startAutoplay(){
    stopAutoplay();
    progressFill.style.transition = "none";
    progressFill.style.transform = "scaleX(0)";
    requestAnimationFrame(() => {
      progressFill.style.transition = `transform ${AUTOPLAY_MS}ms linear`;
      progressFill.style.transform = "scaleX(1)";
    });
    autoplayTimer = setInterval(() => {
      if(!isPaused) goTo(current + 1);
    }, AUTOPLAY_MS);
  }
  function stopAutoplay(){
    clearInterval(autoplayTimer);
    if(progressFill){
      progressFill.style.transition = "none";
      progressFill.style.transform = "scaleX(0)";
    }
  }

  prevBtn?.addEventListener("click", () => { goTo(current - 1); startAutoplay(); });
  nextBtn?.addEventListener("click", () => { goTo(current + 1); startAutoplay(); });
  dotsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".carousel-dot");
    if(btn) { goTo(parseInt(btn.dataset.slide, 10)); startAutoplay(); }
  });

  /* Pause on hover */
  track.addEventListener("mouseenter", () => { isPaused = true; });
  track.addEventListener("mouseleave", () => { isPaused = false; });

  /* Pause when not visible */
  const visObs = new IntersectionObserver(([entry]) => {
    if(entry.isIntersecting) startAutoplay();
    else stopAutoplay();
  }, { threshold: 0.2 });
  visObs.observe(track);

  /* Touch swipe */
  let touchStartX = 0;
  let touchDelta = 0;
  track.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchDelta = 0;
    track.style.transition = "none";
  }, { passive: true });
  track.addEventListener("touchmove", (e) => {
    touchDelta = e.touches[0].clientX - touchStartX;
    track.style.transform = `translateX(calc(-${current * 100}% + ${touchDelta}px))`;
  }, { passive: true });
  track.addEventListener("touchend", () => {
    track.style.transition = "";
    if(Math.abs(touchDelta) > 50){
      goTo(touchDelta > 0 ? current - 1 : current + 1);
    } else {
      goTo(current);
    }
    startAutoplay();
  });

  /* Keyboard */
  document.addEventListener("keydown", (e) => {
    if(e.key === "ArrowLeft") { goTo(current - 1); startAutoplay(); }
    if(e.key === "ArrowRight") { goTo(current + 1); startAutoplay(); }
  });

  /* Init */
  goTo(0);
  startAutoplay();
}

function bindStampButtons(){
  document.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.add;
      const dest = DESTINATIONS.find(d => d.name === name);
      if(!dest) return;
      if(isInCart(name)){
        removeFromCart(name);
        btn.classList.remove("is-added");
        btn.querySelector(".btn-label").textContent = "Add to itinerary";
      } else {
        addToCart(dest);
        btn.classList.add("is-added");
        btn.querySelector(".btn-label").textContent = "Stamped ✓";
        btn.classList.add("is-stamping");
        setTimeout(() => btn.classList.remove("is-stamping"), 450);
        const burst = btn.querySelector(".ink-burst");
        burst.classList.remove("play");
        void burst.offsetWidth; /* restart animation */
        burst.classList.add("play");
      }
    });
  });
}

/* ---------- Live search / filter (simulated AJAX) ---------- */
function initSearch(){
  const form = document.querySelector(".search-card");
  if(!form || typeof DESTINATIONS === "undefined") return;

  const input = form.querySelector('[name="q"]');
  const region = form.querySelector('[name="region"]');
  const budget = form.querySelector('[name="budget"]');
  const clearBtn = document.querySelector(".clear-filters");
  const filterBar = document.getElementById("active-filters");
  let debounceTimer;

  function renderActiveFilters(){
    if(!filterBar) return;
    const chips = [];
    const q = (input?.value || "").trim();
    const r = region?.value || "";
    const b = budget?.value || "";
    if(q) chips.push({ label:`"${q}"`, field:"q" });
    if(r) chips.push({ label:`Region: ${r}`, field:"region" });
    if(b) chips.push({ label:`Budget: ${b}`, field:"budget" });

    if(chips.length === 0){
      filterBar.classList.remove("has-filters");
      filterBar.innerHTML = "";
      return;
    }
    filterBar.classList.add("has-filters");
    filterBar.innerHTML = chips.map((c, i) =>
      `<button class="active-chip" data-clear-filter="${c.field}" style="--stagger-delay:${i * 60}ms">${c.label}<span class="active-chip-x">&times;</span></button>`
    ).join("");
    filterBar.querySelectorAll("[data-clear-filter]").forEach(btn => {
      btn.addEventListener("click", () => {
        const f = btn.dataset.clearFilter;
        if(f === "q" && input) input.value = "";
        if(f === "region" && region) region.value = "";
        if(f === "budget" && budget) budget.value = "";
        /* Animate chip out before removing */
        btn.classList.add("is-exiting");
        setTimeout(() => runFilter(), 200);
      });
    });
  }

  function runFilter(){
    const q = (input?.value || "").trim().toLowerCase();
    const r = region?.value || "";
    const b = budget?.value || "";
    const filtered = DESTINATIONS.filter(d => {
      const matchesQ = !q || d.name.toLowerCase().includes(q) || d.state.toLowerCase().includes(q) || d.tagline.toLowerCase().includes(q);
      const matchesR = !r || d.region === r;
      const matchesB = !b || d.budget === b;
      return matchesQ && matchesR && matchesB;
    });
    renderDestinations(filtered);
    renderActiveFilters();
  }

  function clearAllFilters(){
    if(input) input.value = "";
    if(region) region.value = "";
    if(budget) budget.value = "";
    runFilter();
  }

  form.addEventListener("submit", e => { e.preventDefault(); runFilter(); });
  input?.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runFilter, 280);
  });
  region?.addEventListener("change", runFilter);
  budget?.addEventListener("change", runFilter);
  clearBtn?.addEventListener("click", clearAllFilters);

  renderDestinations(DESTINATIONS);
}

/* ---------- Scroll reveal with stagger ---------- */
function observeReveals(){
  const items = document.querySelectorAll(".reveal:not(.is-visible), .stamp-card:not(.is-visible)");
  let batchIndex = 0;
  const io = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting);
    visible.forEach((entry, i) => {
      entry.target.style.setProperty('--stagger-delay', `${i * 80}ms`);
      requestAnimationFrame(() => entry.target.classList.add("is-visible"));
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  items.forEach(el => io.observe(el));
}

/* ---------- Hero Collage (images + mouse parallax) ---------- */
function initHeroCollage(){
  const collage = document.querySelector(".hero-collage");
  if(!collage || typeof HERO_IMAGES === "undefined") return;

  const photos = collage.querySelectorAll(".collage-photo img");
  const postmarks = collage.querySelectorAll(".collage-postmark");
  photos.forEach((img, i) => {
    if(HERO_IMAGES[i]){
      img.src = HERO_IMAGES[i].src;
      img.alt = HERO_IMAGES[i].alt;
    }
  });
  if(postmarks[0] && typeof DESTINATIONS !== "undefined"){
    const d = DESTINATIONS.find(x => x.name === "Jaipur");
    if(d) postmarks[0].innerHTML = `${d.code}<small>INDIA</small>`;
  }
  if(postmarks[1] && typeof DESTINATIONS !== "undefined"){
    const d = DESTINATIONS.find(x => x.name === "Leh–Ladakh");
    if(d) postmarks[1].innerHTML = `${d.code}<small>INDIA</small>`;
  }

  /* Mouse parallax — depth increases per layer */
  const photoEls = collage.querySelectorAll(".collage-photo");
  const depths = [8, 14, 22];
  const baseRotations = [-2, 1.5, -0.5];
  let ticking = false;

  collage.addEventListener("mousemove", (e) => {
    if(ticking) return;
    requestAnimationFrame(() => {
      const rect = collage.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      photoEls.forEach((p, i) => {
        p.classList.remove("is-springing");
        p.style.transform = `translate(${x * depths[i]}px, ${y * depths[i]}px) rotate(${baseRotations[i]}deg)`;
      });
      postmarks.forEach((pm, i) => {
        const depth = 18 + i * 8;
        pm.classList.remove("is-springing");
        pm.style.transform = `translate(${x * depth}px, ${y * depth}px) rotate(${i === 0 ? -8 : 5}deg)`;
      });
      ticking = false;
    });
    ticking = true;
  });

  collage.addEventListener("mouseleave", () => {
    /* Enable spring transition, then clear transforms */
    photoEls.forEach(p => p.classList.add("is-springing"));
    postmarks.forEach(pm => pm.classList.add("is-springing"));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        photoEls.forEach(p => { p.style.transform = ""; });
        postmarks.forEach(pm => { pm.style.transform = ""; });
        /* Remove spring class after transition completes */
        setTimeout(() => {
          photoEls.forEach(p => p.classList.remove("is-springing"));
          postmarks.forEach(pm => pm.classList.remove("is-springing"));
        }, 650);
      });
    });
  });
}

/* ---------- Hero Counter Animation ---------- */
/* ---------- Contact page ---------- */
function initContactForm(){
  const form = document.querySelector(".enquiry-card form");
  if(!form) return;

  const chipField = document.querySelector(".chip-field");
  function renderChips(){
    const cart = getCart();
    if(!chipField) return;
    if(cart.length === 0){
      chipField.innerHTML = `<span class="chip-empty">No destinations selected yet — browse the <a href="index.html" style="color:var(--accent)">home page</a> to add stamps.</span>`;
    } else {
      chipField.innerHTML = cart.map(d => `<span class="chip">${d.name}<button type="button" data-chip-remove="${d.name}">&times;</button></span>`).join("");
      chipField.querySelectorAll("[data-chip-remove]").forEach(btn => {
        btn.addEventListener("click", () => { removeFromCart(btn.dataset.chipRemove); renderChips(); });
      });
    }
  }
  renderChips();

  function validateField(input, errEl, test, msg){
    const field = input.closest(".form-field");
    if(!test(input.value.trim())){
      if(errEl) errEl.textContent = msg;
      if(field) field.classList.add("form-field--error");
      return false;
    }
    if(errEl) errEl.textContent = "";
    if(field) field.classList.remove("form-field--error");
    return true;
  }

  const name = form.querySelector("#name");
  const email = form.querySelector("#email");
  const nameErr = form.querySelector("#name-error");
  const emailErr = form.querySelector("#email-error");
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* Real-time validation on blur */
  name?.addEventListener("blur", () => validateField(name, nameErr, v => v.length > 0, "Tell us who's traveling."));
  email?.addEventListener("blur", () => validateField(email, emailErr, v => emailRe.test(v), "Enter a valid email address."));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if(!name || !email) return;

    const v1 = validateField(name, nameErr, v => v.length > 0, "Tell us who's traveling.");
    const v2 = validateField(email, emailErr, v => emailRe.test(v), "Enter a valid email address.");
    if(!v1 || !v2) return;

    /* Loading state */
    const btn = form.querySelector("[type=submit]");
    const origText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner"></span> Sending…`;

    /* Simulate send (no backend yet) */
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = origText;
      form.reset();
      name.closest(".form-field")?.classList.remove("form-field--error");
      email.closest(".form-field")?.classList.remove("form-field--error");

      const banner = document.querySelector(".confirm-banner");
      if(banner){
        banner.classList.add("show");
        banner.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => banner.classList.remove("show"), 6000);
      }
    }, 1200);
  });
}

/* ---------- Scroll Progress Bar ---------- */
function initScrollProgress(){
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.prepend(bar);

  /* Back-to-top button */
  const btt = document.createElement("button");
  btt.className = "back-to-top";
  btt.setAttribute("aria-label", "Back to top");
  btt.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>`;
  document.body.appendChild(btt);
  btt.addEventListener("click", () => window.scrollTo({ top:0, behavior:"smooth" }));

  let ticking = false;
  window.addEventListener("scroll", () => {
    if(ticking) return;
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${docH > 0 ? scrollY / docH : 0})`;
      btt.classList.toggle("is-visible", scrollY > 400);
      ticking = false;
    });
    ticking = true;
  }, { passive: true });
}

/* ---------- Hero Parallax Scroll ---------- */
function initHeroParallax(){
  const hero = document.querySelector("#hero");
  if(!hero) return;
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const heroText = hero.querySelector(".hero-text");
  const heroCollage = hero.querySelector(".hero-collage");
  const svgs = hero.querySelectorAll(".hero-svg");
  let ticking = false;

  function onScroll(){
    if(ticking) return;
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const heroH = hero.offsetHeight;
      if(scrollY < heroH){
        const progress = scrollY / heroH;
        /* Text fades and slides up as you scroll */
        if(heroText){
          heroText.style.transform = `translateY(${-scrollY * 0.15}px)`;
          heroText.style.opacity = 1 - progress * 0.6;
        }
        /* Collage moves slower (parallax depth) */
        if(heroCollage){
          heroCollage.style.transform = `translateY(${-scrollY * 0.18}px)`;
        }
        /* SVG decorations drift */
        svgs.forEach((svg, i) => {
          const speed = 0.08 + i * 0.04;
          svg.style.transform = `translateY(${-scrollY * speed}px)`;
        });
      }
      ticking = false;
    });
    ticking = true;
  }

  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------- Scroll-triggered Reveal ---------- */
function initScrollReveal(){
  const els = document.querySelectorAll(".section-head, .visa-entry, .contact-detail, .timeline-item, .stat-block > div");
  if(!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("reveal", "is-visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(el => {
    el.classList.add("reveal");
    io.observe(el);
  });
}

/* ---------- Footer year ---------- */
function initFooterYear(){
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
}

/* ---------- Image Skeletons ---------- */
function initImageSkeletons(){
  document.querySelectorAll(".stamp-img").forEach(wrap => {
    const img = wrap.querySelector("img");
    if(!img) return;
    if(img.complete && img.naturalWidth > 0){
      wrap.classList.add("is-loaded");
    } else {
      img.addEventListener("load", () => wrap.classList.add("is-loaded"), { once: true });
      img.addEventListener("error", () => wrap.classList.add("is-loaded"), { once: true });
    }
  });
}

/* ---------- Animated Counters ---------- */
function initCounters(){
  const blocks = document.querySelectorAll(".stat-block");
  if(!blocks.length) return;
  const animated = new Set();
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(!entry.isIntersecting || animated.has(entry.target)) return;
      animated.add(entry.target);
      entry.target.querySelectorAll(".num").forEach(el => {
        const target = parseInt(el.textContent, 10);
        if(isNaN(target) || target === 0) return;
        const duration = 800;
        const start = performance.now();
        function tick(now){
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target);
          if(progress < 1) requestAnimationFrame(tick);
        }
        el.textContent = "0";
        requestAnimationFrame(tick);
      });
    });
  }, { threshold: 0.3 });
  blocks.forEach(b => io.observe(b));
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initDrawer();
  initDrawerActions();
  updatePassportCount();
  initSearch();
  initContactForm();
  initFooterYear();
  initHeroCollage();
  initHeroParallax();
  initScrollReveal();
  initThemeToggle();
  initNavScroll();
  initCarousel();
  initScrollProgress();
  initImageSkeletons();
  initCounters();
  observeReveals();
});
