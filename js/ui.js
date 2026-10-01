/* Shared UI: icons, header, cart drawer, modals, toasts, destination detail, booking. */
(function () {
  const { img, MONTHS, TYPES, LEVELS, DESTINATIONS, PACKAGES, AGENTS } = window.PATHIK_DATA;
  const ICONS = window.PATHIK_ICONS || {};
  const { inr } = window.Budget;
  const GST = 0.05;
  const CHILD_PRICE = 0.7;
  const TOKEN = 0.2;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  function icon(name, cls = "") {
    return `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;
  }
  function hydrate(root = document) {
    $$("[data-icon]", root).forEach((el) => {
      if (el.firstElementChild) return;
      el.innerHTML = icon(el.dataset.icon);
    });
  }

  function photo(id, w, h, alt, cls = "", eager = false) {
    const one = img(id, w), two = img(id, w * 2);
    return `<img class="${cls}" src="${one}"${two !== one ? ` srcset="${one} 1x, ${two} 2x"` : ""} alt="${esc(alt)}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }

  // ---------- photo credits (CC licences need attribution) ----------
  function openCredits() {
    const { PHOTOS, credit } = window.PATHIK_DATA;
    modal(`<div class="article">
      <span class="kicker">Thank you</span>
      <h2>Photo credits</h2>
      <p class="muted">All photos come from Wikimedia Commons and are used under the licences below.</p>
      <ul class="credits">${Object.keys(PHOTOS).map((k) => {
        const c = credit(k);
        return `<li>${photo(k, 120, 80, "", "credits__img")}<div><strong>${esc(c.title)}</strong><span>${esc(c.by)} · ${esc(c.lic)} · <a href="${c.page}" target="_blank" rel="noopener">Source</a></span></div></li>`;
      }).join("")}</ul>
    </div>`, { label: "Photo credits" });
  }
  const creditLine = (key) => {
    const c = window.PATHIK_DATA.credit(key);
    return c ? `<a class="photo-credit" href="${c.page}" target="_blank" rel="noopener">Photo: ${esc(c.by)}, ${esc(c.lic)}</a>` : "";
  };

  // ---------- carousel (scroll-snap track + arrows + dots + optional autoplay) ----------
  function carousel(root, { autoplay = 0 } = {}) {
    const track = $(".carousel__track", root);
    const slides = [...track.children];
    const dots = $(".dots", root);
    if (!slides.length) return;
    if (dots) dots.innerHTML = slides.map((_, i) => `<button type="button" aria-label="Slide ${i + 1}"></button>`).join("");
    const center = track.dataset.align === "center";
    let current = 0;
    const left = (el) => el.offsetLeft - track.offsetLeft;
    const go = (i) => {
      current = (i + slides.length) % slides.length;
      const s = slides[current];
      track.scrollTo({ left: center ? left(s) - (track.clientWidth - s.offsetWidth) / 2 : left(s) - 4 });
    };
    const sync = () => {
      const ref = track.scrollLeft + (center ? track.clientWidth / 2 : 4);
      let best = 0, bd = Infinity;
      slides.forEach((s, i) => {
        const d = Math.abs((center ? left(s) + s.offsetWidth / 2 : left(s)) - ref);
        if (d < bd) { bd = d; best = i; }
      });
      if (!center && track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) best = slides.length - 1;
      current = best;
      slides.forEach((s, i) => s.classList.toggle("is-active", i === best));
      if (dots) $$("button", dots).forEach((d, i) => d.setAttribute("aria-current", i === best));
    };
    let raf;
    track.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
    $("[data-prev]", root)?.addEventListener("click", () => go(current - 1));
    $("[data-next]", root)?.addEventListener("click", () => go(current + 1));
    dots?.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) go([...dots.children].indexOf(b)); });
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
    });
    if (autoplay && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = setInterval(() => {
        const r = track.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0 && !document.hidden) go(current + 1);
      }, autoplay);
      ["pointerdown", "focusin", "wheel", "touchstart"].forEach((ev) => root.addEventListener(ev, () => clearInterval(timer), { passive: true }));
    }
    if (center) requestAnimationFrame(() => { track.style.scrollBehavior = "auto"; go(0); track.style.scrollBehavior = ""; });
    sync();
    return { go };
  }

  // ---------- maps (Leaflet, loaded only when a map is shown) ----------
  let leafletReady;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    leafletReady = leafletReady || new Promise((res, rej) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "vendor/leaflet/leaflet.css";
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = "vendor/leaflet/leaflet.js";
      js.onload = () => res(window.L);
      js.onerror = rej;
      document.head.appendChild(js);
    });
    return leafletReady;
  }
  async function makeMap(el, opts = {}) {
    const L = await loadLeaflet();
    const map = L.map(el, { scrollWheelZoom: false, ...opts });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
      subdomains: "abcd",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);
    // the page keeps scrolling over the map; a click turns on wheel zoom
    el.addEventListener("click", () => map.scrollWheelZoom.enable());
    el.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());
    return map;
  }
  const pin = (label = "", cls = "") => window.L.divIcon({ className: `pin ${cls}`, html: `<span>${label}</span>`, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16] });
  const gmaps = (d) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.name + ", " + d.state)}`;

  // Broken image: hide it, the frame behind shows a gradient
  document.addEventListener("error", (e) => {
    if (e.target.tagName === "IMG") e.target.classList.add("is-broken");
  }, true);

  // ---------- toasts ----------
  function toast(msg, opts = {}) {
    const box = $("#toasts");
    if (!box) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.innerHTML = `${icon(opts.icon || "check")}<span>${esc(msg)}</span>${opts.href ? `<a href="${opts.href}">${esc(opts.label || "View")}</a>` : ""}${opts.onAction ? `<button type="button">${esc(opts.label || "Undo")}</button>` : ""}`;
    if (opts.onAction) t.querySelector("button").addEventListener("click", () => { opts.onAction(); t.remove(); });
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add("is-in"));
    setTimeout(() => {
      t.classList.remove("is-in");
      setTimeout(() => t.remove(), 300);
    }, opts.ms || 3200);
  }

  // ---------- modal ----------
  function modal(html, { cls = "", label = "Dialog" } = {}) {
    let dlg = $("#modal");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "modal";
      document.body.appendChild(dlg);
      dlg.addEventListener("click", (e) => {
        if (e.target === dlg || e.target.closest("[data-close]")) dlg.close();
      });
    }
    dlg.className = `modal ${cls}`;
    dlg.setAttribute("aria-label", label);
    dlg.innerHTML = `<div class="modal__box"><button class="icon-btn modal__x" data-close aria-label="Close">${icon("x")}</button>${html}</div>`;
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
    $(".modal__box", dlg).scrollTop = 0;
    return dlg;
  }
  const closeModal = () => $("#modal")?.open && $("#modal").close();

  // ---------- months strip ----------
  function monthStrip(months, compact = false) {
    return `<ol class="months${compact ? " months--compact" : ""}" aria-label="Best months: ${months.map((m) => MONTHS[m - 1]).join(", ")}">${MONTHS.map(
      (m, i) => `<li class="${months.includes(i + 1) ? "is-good" : ""}" title="${m}"><span>${compact ? m[0] : m}</span></li>`
    ).join("")}</ol>`;
  }

  // ---------- destination detail ----------
  function openDestination(id, level) {
    const d = DESTINATIONS.find((x) => x.id === id);
    if (!d) return;
    let lv = level || Store.get().trip.level || "mid";
    const costTable = () => {
      const c = d.cost[lv];
      return `
        <dl class="cost-grid">
          <div><dt>Room / night</dt><dd>${inr(c.stay)}</dd></div>
          <div><dt>Food / day</dt><dd>${inr(c.food)}</dd></div>
          <div><dt>Local travel</dt><dd>${inr(c.local)}</dd></div>
          <div><dt>Sights & activities</dt><dd>${inr(c.act)}</dd></div>
        </dl>
        <p class="fine">Per person per day, except rooms. About <strong>${inr(Budget.perDay(d, lv))}</strong> a day each for two sharing.</p>`;
    };
    const dlg = modal(
      `<figure class="dest-hero">${photo(d.photo, 960, 520, `${d.name}, ${d.state}`, "", true)}${creditLine(d.photo)}
        <figcaption><span class="kicker">${esc(d.state)} · ${d.types.map((t) => TYPES[t]).join(", ")}</span><h2>${esc(d.name)}</h2><p>${esc(d.tagline)}</p></figcaption>
      </figure>
      <div class="dest-body">
        <section class="dest-main">
          <p class="lead">${esc(d.overview)}</p>
          <h3>Best time to go</h3>
          ${monthStrip(d.months)}
          <h3>Getting there</h3>
          <ul class="reach">
            <li>${icon("plane")}<span>${esc(d.reach.air)}</span></li>
            <li>${icon("train-front")}<span>${esc(d.reach.rail)}</span></li>
            <li>${icon("car")}<span>${esc(d.reach.road)}</span></li>
          </ul>
          <h3>On the map</h3>
          <div class="map map--sm" id="dest-map" role="region" aria-label="Map of ${esc(d.name)}"></div>
          <p class="fine" style="margin-top:.5rem"><a href="${gmaps(d)}" target="_blank" rel="noopener">Open in Google Maps</a> for directions.</p>
          <h3>Worth your time</h3>
          <ul class="ticks">${d.things.map((t) => `<li>${icon("check")}${esc(t)}</li>`).join("")}</ul>
          <div class="two-col">
            <div class="note note--tip"><h4>${icon("lightbulb")}Local tips</h4><ul>${d.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
            <div class="note note--warn"><h4>${icon("triangle-alert")}Watch out for</h4><ul>${d.watch.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
          </div>
        </section>
        <aside class="dest-side">
          <h3>What a day costs</h3>
          <div class="seg" role="radiogroup" aria-label="Travel style">${Object.entries(LEVELS).map(([k, v]) => `<button role="radio" aria-checked="${k === lv}" data-lv="${k}">${v.label}</button>`).join("")}</div>
          <div class="cost-box">${costTable()}</div>
          <p class="fine" style="display:block">${icon("moon")} Most people stay <strong>${d.nights} night${d.nights > 1 ? "s" : ""}</strong>.</p>
          <div class="dest-actions">
            <button class="btn btn--ember btn--block" data-trip="${d.id}"></button>
            <a class="btn btn--line btn--block" href="agents.html?dest=${d.id}">${icon("message-circle")}Ask a local agent</a>
          </div>
        </aside>
      </div>`,
      { cls: "modal--wide", label: d.name }
    );
    makeMap($("#dest-map", dlg), { center: [d.lat, d.lng], zoom: 9 }).then((map) => {
      window.L.marker([d.lat, d.lng], { icon: pin("", "pin--dot") }).addTo(map).bindTooltip(d.name, { direction: "top", offset: [0, -14] });
      setTimeout(() => map.invalidateSize(), 250);
    }).catch(() => ($("#dest-map", dlg).innerHTML = `<p class="fine" style="padding:1rem">Map couldn't load. <a href="${gmaps(d)}">Open in Google Maps</a>.</p>`));
    const tripBtn = $("[data-trip]", dlg);
    const paint = () => {
      const on = Store.inTrip(d.id);
      tripBtn.innerHTML = on ? `${icon("check")}In your trip` : `${icon("plus")}Add to trip`;
      tripBtn.classList.toggle("is-on", on);
    };
    paint();
    tripBtn.addEventListener("click", () => {
      const added = Store.toggleStop(d.id);
      paint();
      toast(added ? `${d.name} added to your trip` : `${d.name} removed`, { icon: added ? "map-pin-plus" : "map-pin-minus", href: "planner.html", label: "Open planner" });
    });
    $$(".seg button", dlg).forEach((b) =>
      b.addEventListener("click", () => {
        lv = b.dataset.lv;
        $$(".seg button", dlg).forEach((x) => x.setAttribute("aria-checked", x === b));
        $(".cost-box", dlg).innerHTML = costTable();
      })
    );
  }

  // ---------- packages ----------
  const pkgById = (id) => PACKAGES.find((p) => p.id === id);
  const lineTotal = (item) => {
    const p = pkgById(item.pkgId);
    return p ? p.price * item.adults + Math.round(p.price * CHILD_PRICE) * item.children : 0;
  };
  function cartTotals(cart = Store.get().cart) {
    const sub = cart.reduce((a, it) => a + lineTotal(it), 0);
    const gst = Math.round(sub * GST);
    return { sub, gst, total: sub + gst, token: Math.round((sub + gst) * TOKEN) };
  }

  function packageCard(p) {
    const stops = p.stops.map((s) => DESTINATIONS.find((d) => d.id === s).name).join(" · ");
    const save = p.was ? Math.round((1 - p.price / p.was) * 100) : 0;
    const ag = AGENTS.find((a) => a.id === p.agent);
    return `<article class="pkg reveal">
      <div class="pkg__media">${photo(p.photo, 640, 420, p.title)}
        ${save ? `<span class="pkg__badge">Save ${save}%</span>` : ""}
        <span class="pkg__nights">${p.nights}N · ${LEVELS[p.level].label}</span>
      </div>
      <div class="pkg__body">
        <p class="pkg__stops">${icon("route")}${esc(stops)}</p>
        <h3>${esc(p.title)}</h3>
        <p class="pkg__by">${icon("badge-check")}${esc(ag.name)} · ${ag.rating}★</p>
        <div class="pkg__foot">
          <p class="price">${p.was ? `<s>${inr(p.was)}</s>` : ""}<strong>${inr(p.price)}</strong><span>per person</span></p>
          <button class="btn btn--ember btn--sm" data-book="${p.id}">Book</button>
        </div>
      </div>
    </article>`;
  }

  function openBooking(id) {
    const p = pkgById(id);
    if (!p) return;
    const min = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    const ag = AGENTS.find((a) => a.id === p.agent);
    const st = { adults: 2, children: 0 };
    const dlg = modal(
      `<div class="book">
        <div class="book__media">${photo(p.photo, 560, 640, p.title)}</div>
        <form class="book__form" novalidate>
          <span class="kicker">${p.nights} nights · ${esc(ag.name)}</span>
          <h2>${esc(p.title)}</h2>
          <div class="book__lists">
            <div><h4>Included</h4><ul class="ticks">${p.includes.map((t) => `<li>${icon("check")}${esc(t)}</li>`).join("")}</ul></div>
            <div><h4>Not included</h4><ul class="crosses">${p.excludes.map((t) => `<li>${icon("x")}${esc(t)}</li>`).join("")}</ul></div>
          </div>
          <p class="fine">${icon("shield-check")}${esc(p.cancel)}</p>
          <div class="field">
            <label for="bk-date">Start date</label>
            <input id="bk-date" type="date" min="${min}" required>
            <p class="field__err" id="bk-date-err"></p>
          </div>
          <div class="steppers">
            ${stepper("adults", "Adults", "12+ years", 2)}
            ${stepper("children", "Children", "5-11, 70% price", 0)}
          </div>
          <div class="book__total"><span>Total before GST</span><strong id="bk-total"></strong></div>
          <button class="btn btn--ember btn--block" type="submit">${icon("shopping-bag")}Add to cart</button>
        </form>
      </div>`,
      { cls: "modal--wide", label: p.title }
    );
    const total = () => ($("#bk-total", dlg).textContent = inr(lineTotal({ pkgId: id, ...st })));
    bindSteppers(dlg, st, { adults: [1, 12], children: [0, 8] }, total);
    total();
    $("form", dlg).addEventListener("submit", (e) => {
      e.preventDefault();
      const date = $("#bk-date", dlg);
      const err = $("#bk-date-err", dlg);
      if (!date.value || date.value < min) {
        err.textContent = date.value ? "Pick a date at least 5 days from today." : "Choose a start date.";
        date.setAttribute("aria-invalid", "true");
        date.focus();
        return;
      }
      Store.update((s) => s.cart.push({ key: Store.uid("C"), pkgId: id, date: date.value, ...st }));
      closeModal();
      toast("Added to cart", { icon: "shopping-bag" });
      openDrawer();
    });
    $("#bk-date", dlg).addEventListener("input", (e) => {
      e.target.removeAttribute("aria-invalid");
      $("#bk-date-err", dlg).textContent = "";
    });
  }

  function stepper(name, label, hint, val) {
    return `<div class="stepper" data-step="${name}">
      <div><span class="stepper__label">${label}</span><span class="stepper__hint">${hint}</span></div>
      <div class="stepper__ctrl">
        <button type="button" class="icon-btn" data-d="-1" aria-label="Fewer ${label.toLowerCase()}">${icon("minus")}</button>
        <output aria-live="polite">${val}</output>
        <button type="button" class="icon-btn" data-d="1" aria-label="More ${label.toLowerCase()}">${icon("plus")}</button>
      </div>
    </div>`;
  }
  function bindSteppers(root, st, limits, onChange) {
    $$("[data-step]", root).forEach((el) => {
      const k = el.dataset.step;
      const out = $("output", el);
      const paint = () => {
        out.textContent = st[k];
        $('[data-d="-1"]', el).disabled = st[k] <= limits[k][0];
        $('[data-d="1"]', el).disabled = st[k] >= limits[k][1];
      };
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-d]");
        if (!b) return;
        st[k] = Math.min(limits[k][1], Math.max(limits[k][0], st[k] + +b.dataset.d));
        paint();
        onChange(k, st[k]);
      });
      paint();
    });
  }

  // ---------- cart drawer ----------
  const fmtDate = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  function renderDrawer() {
    const body = $("#drawer-body");
    if (!body) return;
    const { cart, bookings } = Store.get();
    const tab = body.dataset.tab || "cart";
    $$("#drawer [data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tab));
    $("#drawer-cart-n").textContent = cart.length;
    $("#drawer-book-n").textContent = bookings.length;

    if (tab === "bookings") {
      body.innerHTML = bookings.length
        ? `<ul class="bookings">${bookings.slice().reverse().map((b) => `<li>
            <div class="bookings__top"><strong>${esc(b.ref)}</strong><span class="pill pill--wait">${icon("clock")}Awaiting agent</span></div>
            <p>${b.items.map((i) => esc(pkgById(i.pkgId)?.title || "")).join(", ")}</p>
            <p class="fine">Token paid ${inr(b.token)} of ${inr(b.total)} · ${esc(b.name)}</p>
          </li>`).join("")}</ul>`
        : empty("ticket", "No reservations yet", "Bookings you confirm show up here with their reference number.");
      $("#drawer-foot").innerHTML = "";
      return;
    }

    if (!cart.length) {
      body.innerHTML = empty("shopping-bag", "Your cart is empty", "Every package lists what's included and what isn't, before you add it.", `<a class="btn btn--ember btn--sm" href="packages.html">Browse packages</a>`);
      $("#drawer-foot").innerHTML = "";
      return;
    }
    body.innerHTML = `<ul class="cart">${cart.map((it) => {
      const p = pkgById(it.pkgId);
      if (!p) return "";
      return `<li class="cart__item" data-key="${it.key}">
        ${photo(p.photo, 160, 160, p.title, "cart__img")}
        <div class="cart__info">
          <h4>${esc(p.title)}</h4>
          <p class="fine">${icon("calendar")}${fmtDate(it.date)} · ${p.nights} nights</p>
          <div class="cart__row">
            <div class="mini-step" aria-label="Adults">
              <button class="icon-btn icon-btn--sm" data-adj="-1" aria-label="One fewer adult" ${it.adults <= 1 ? "disabled" : ""}>${icon("minus")}</button>
              <span>${it.adults} adult${it.adults > 1 ? "s" : ""}${it.children ? ` + ${it.children} child` : ""}</span>
              <button class="icon-btn icon-btn--sm" data-adj="1" aria-label="One more adult" ${it.adults >= 12 ? "disabled" : ""}>${icon("plus")}</button>
            </div>
            <strong>${inr(lineTotal(it))}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn--sm cart__rm" data-rm aria-label="Remove ${esc(p.title)}">${icon("trash-2")}</button>
      </li>`;
    }).join("")}</ul>`;
    const t = cartTotals(cart);
    $("#drawer-foot").innerHTML = `
      <dl class="totals">
        <div><dt>Subtotal</dt><dd>${inr(t.sub)}</dd></div>
        <div><dt>GST on tour packages (5%)</dt><dd>${inr(t.gst)}</dd></div>
        <div class="totals__grand"><dt>Total</dt><dd>${inr(t.total)}</dd></div>
        <div class="totals__token"><dt>Pay now to reserve (20%)</dt><dd>${inr(t.token)}</dd></div>
      </dl>
      <button class="btn btn--ember btn--block" id="go-checkout">${icon("lock")}Reserve with ${inr(t.token)}</button>
      <p class="fine center">The rest is paid only after the agent confirms availability.</p>`;
  }

  function empty(ic, title, text, extra = "") {
    return `<div class="empty">${icon(ic)}<h4>${title}</h4><p>${text}</p>${extra}</div>`;
  }

  function openDrawer(tab) {
    const d = $("#drawer");
    if (!d) return;
    if (tab) $("#drawer-body").dataset.tab = tab;
    renderDrawer();
    d.hidden = false;
    requestAnimationFrame(() => d.classList.add("is-open"));
    document.body.classList.add("no-scroll");
    $("#drawer .drawer__close").focus();
  }
  function closeDrawer() {
    const d = $("#drawer");
    if (!d || d.hidden) return;
    d.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    setTimeout(() => (d.hidden = true), 280);
    $("[data-open-cart]")?.focus();
  }

  function bindDrawer() {
    const d = $("#drawer");
    if (!d) return;
    d.addEventListener("click", (e) => {
      if (e.target === d || e.target.closest(".drawer__close")) return closeDrawer();
      const tab = e.target.closest("[data-tab]");
      if (tab) {
        $("#drawer-body").dataset.tab = tab.dataset.tab;
        return renderDrawer();
      }
      const item = e.target.closest("[data-key]");
      if (item && e.target.closest("[data-rm]")) {
        Store.update((s) => (s.cart = s.cart.filter((c) => c.key !== item.dataset.key)));
        return toast("Removed from cart", { icon: "trash-2" });
      }
      const adj = e.target.closest("[data-adj]");
      if (item && adj) {
        Store.update((s) => {
          const c = s.cart.find((x) => x.key === item.dataset.key);
          c.adults = Math.min(12, Math.max(1, c.adults + +adj.dataset.adj));
        });
      }
      if (e.target.closest("#go-checkout")) {
        closeDrawer();
        setTimeout(openCheckout, 200);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !d.hidden) closeDrawer();
      if (e.key === "Tab" && !d.hidden) trapFocus(e, $(".drawer__panel", d));
    });
  }

  function trapFocus(e, box) {
    const f = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', box).filter((x) => x.offsetParent);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // ---------- checkout ----------
  function openCheckout() {
    const cart = Store.get().cart;
    if (!cart.length) return;
    const t = cartTotals(cart);
    const dlg = modal(
      `<form class="checkout" novalidate>
        <span class="kicker">Step 1 of 1 · Reserve</span>
        <h2>Who's travelling?</h2>
        <p class="muted">We send these details to the agent for each package. Nothing is charged in this demo.</p>
        <div class="grid-2">
          ${field("ck-name", "Lead traveller's full name", "text", 'autocomplete="name" required minlength="3"')}
          ${field("ck-phone", "Mobile number", "tel", 'autocomplete="tel" required inputmode="numeric" placeholder="98xxxxxxxx"')}
          ${field("ck-email", "Email", "email", 'autocomplete="email" required')}
          ${field("ck-city", "Starting city", "text", 'autocomplete="address-level2" required')}
        </div>
        <div class="field"><label for="ck-notes">Anything the agent should know? <span class="opt">optional</span></label><textarea id="ck-notes" rows="2" placeholder="Dietary needs, a birthday, mobility..."></textarea></div>
        <label class="check"><input type="checkbox" id="ck-agree" required><span>I've read the cancellation rules for each package.</span></label>
        <p class="field__err" id="ck-agree-err"></p>
        <dl class="totals totals--inline">
          <div><dt>Total incl. GST</dt><dd>${inr(t.total)}</dd></div>
          <div class="totals__token"><dt>Due now</dt><dd>${inr(t.token)}</dd></div>
        </dl>
        <button class="btn btn--ember btn--block" type="submit">${icon("lock")}Confirm reservation</button>
      </form>`,
      { label: "Checkout" }
    );
    const form = $("form", dlg);
    liveValidate(form);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validate(form)) return;
      const ref = "PTK-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      const name = $("#ck-name", form).value.trim();
      Store.update((s) => {
        s.bookings.push({ ref, name, phone: $("#ck-phone", form).value.trim(), email: $("#ck-email", form).value.trim(), items: s.cart.slice(), total: t.total, token: t.token, at: Date.now() });
        s.cart = [];
      });
      modal(
        `<div class="done">
          <div class="done__stamp">${icon("ticket")}</div>
          <span class="kicker">Reservation sent</span>
          <h2>${esc(ref)}</h2>
          <p>Thanks, ${esc(name.split(" ")[0])}. Your agents have the details and usually confirm within a day. You'll pay the remaining ${inr(t.total - t.token)} only after they do.</p>
          <ol class="steps-mini"><li class="is-done">Reserved</li><li>Agent confirms</li><li>Pay balance</li><li>Travel</li></ol>
          <button class="btn btn--line" data-close>Done</button>
          <button class="btn btn--ember" data-open-cart data-tab="bookings" data-close>See my bookings</button>
        </div>`,
        { label: "Reservation confirmed" }
      );
    });
  }

  function field(id, label, type, attrs = "") {
    return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" ${attrs}><p class="field__err" id="${id}-err"></p></div>`;
  }

  // ---------- form validation ----------
  const PHONE = /^(\+91[\s-]?)?[6-9]\d{9}$/;
  function message(el) {
    const v = el.value.trim();
    if (el.type === "checkbox") return el.required && !el.checked ? "Please tick this to continue." : "";
    if (el.required && !v) {
      const label = el.labels && el.labels[0] ? el.labels[0].textContent.replace(/optional/i, "").trim() : "";
      return el.dataset.req || (label ? `Please fill in ${label.charAt(0).toLowerCase() + label.slice(1)}.` : "This is required.");
    }
    if (!v) return "";
    if (el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "That email doesn't look right.";
    if (el.type === "tel" && !PHONE.test(v.replace(/\s/g, ""))) return "Enter a 10-digit Indian mobile number.";
    if (el.minLength > 0 && v.length < el.minLength) return `At least ${el.minLength} characters.`;
    if (el.type === "date" && el.min && v < el.min) return "Pick a later date.";
    if (el.type === "number" && el.min && +v < +el.min) return `Minimum is ${el.min}.`;
    return "";
  }
  function setErr(el, msg) {
    const err = document.getElementById(`${el.id}-err`);
    if (err) err.textContent = msg;
    if (msg) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
    if (err) el.setAttribute("aria-describedby", err.id);
  }
  function validate(form) {
    let first = null;
    $$("input, select, textarea", form).forEach((el) => {
      if (!el.id) return;
      const m = message(el);
      setErr(el, m);
      if (m && !first) first = el;
    });
    if (first) first.focus();
    return !first;
  }
  function liveValidate(form) {
    form.addEventListener("focusout", (e) => {
      const el = e.target;
      if (el.id && el.matches("input, select, textarea") && el.value) setErr(el, message(el));
    });
    form.addEventListener("input", (e) => {
      if (e.target.getAttribute("aria-invalid")) setErr(e.target, message(e.target));
    });
    form.addEventListener("change", (e) => {
      if (e.target.type === "checkbox") setErr(e.target, message(e.target));
    });
  }

  // ---------- header ----------
  function bindHeader() {
    const h = $(".site-head");
    if (!h) return;
    const solid = document.body.dataset.head === "solid";
    const onScroll = () => h.classList.toggle("is-stuck", solid || window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const burger = $(".burger", h);
    burger?.addEventListener("click", () => {
      const open = h.classList.toggle("nav-open");
      burger.setAttribute("aria-expanded", open);
      burger.innerHTML = icon(open ? "x" : "menu");
      document.body.classList.toggle("no-scroll", open);
    });
    $$(".nav a", h).forEach((a) => a.addEventListener("click", () => {
      h.classList.remove("nav-open");
      if (burger) { burger.setAttribute("aria-expanded", "false"); burger.innerHTML = icon("menu"); }
      document.body.classList.remove("no-scroll");
    }));
  }

  function paintCounts() {
    const s = Store.get();
    $$("[data-count=trip]").forEach((el) => { el.textContent = s.trip.stops.length; el.hidden = !s.trip.stops.length; });
    $$("[data-count=cart]").forEach((el) => {
      const prev = el.textContent;
      el.textContent = s.cart.length;
      el.hidden = !s.cart.length;
      if (prev !== String(s.cart.length) && s.cart.length) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    });
  }

  // ---------- reveal on scroll ----------
  let io;
  function reveal(root = document) {
    const items = $$(".reveal:not(.is-in)", root);
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    io = io || new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    items.forEach((el) => io.observe(el));
  }

  // ---------- global delegation ----------
  document.addEventListener("click", (e) => {
    const t = e.target;
    const dest = t.closest("[data-dest]");
    if (dest) { e.preventDefault(); return openDestination(dest.dataset.dest); }
    const book = t.closest("[data-book]");
    if (book) return openBooking(book.dataset.book);
    const cart = t.closest("[data-open-cart]");
    if (cart) { e.preventDefault(); return setTimeout(() => openDrawer(cart.dataset.tab || "cart"), cart.hasAttribute("data-close") ? 120 : 0); }
    if (t.closest("[data-credits]")) { e.preventDefault(); return openCredits(); }
    const add = t.closest("[data-add-trip]");
    if (add) {
      const id = add.dataset.addTrip;
      const added = Store.toggleStop(id);
      const d = DESTINATIONS.find((x) => x.id === id);
      toast(added ? `${d.name} added to your trip` : `${d.name} removed from your trip`, { icon: added ? "map-pin-plus" : "map-pin-minus", href: "planner.html", label: "Open planner" });
    }
  });

  Store.on(() => {
    paintCounts();
    if (!$("#drawer")?.hidden) renderDrawer();
  });

  document.addEventListener("DOMContentLoaded", () => {
    hydrate();
    bindHeader();
    bindDrawer();
    paintCounts();
    reveal();
    const y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
    // newsletter form in the footer
    const nl = $("#newsletter");
    if (nl) {
      liveValidate(nl);
      nl.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!validate(nl)) return;
        nl.innerHTML = `<p class="nl-done">${icon("mail-check")}You're on the list. One email a month, with the season's best routes.</p>`;
      });
    }
  });

  window.UI = { carousel, makeMap, loadLeaflet, pin, gmaps, creditLine, openCredits, $, $$, esc, rich, icon, hydrate, photo, toast, modal, closeModal, monthStrip, openDestination, openBooking, packageCard, openDrawer, cartTotals, stepper, bindSteppers, validate, liveValidate, field, reveal, fmtDate, empty };
})();
