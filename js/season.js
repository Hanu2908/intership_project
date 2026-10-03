/* Season map page: a month dial and a budget slider rank every destination by season,
   cost and crowd. The 3D map (js/season-scene.js) shows the same ranking as pillars. */
(function () {
  const { $, $$, esc, icon, photo, toast, monthStrip, openDestination, hydrate } = window.UI;
  const { DESTINATIONS, MONTHS, TYPES, LEVELS, TWINS } = window.PATHIK_DATA;
  const B = window.Budget;
  const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const CROWD = ["", "Calm", "Busy", "Packed"];
  const inr = B.inr;
  const byId = B.byId;
  // which busy place each quiet twin stands in for
  const TWIN_OF = Object.fromEntries(Object.entries(TWINS).map(([a, b]) => [b, a]));

  // ---------- state, seeded from the URL so a view can be shared ----------
  const qs = new URLSearchParams(location.search);
  const clampM = (m) => (m >= 1 && m <= 12 ? m : new Date().getMonth() + 1);
  const st = {
    m: clampM(+qs.get("m")),
    budget: Math.min(12000, Math.max(1500, +qs.get("b") || 4000)),
    level: LEVELS[qs.get("lv")] ? qs.get("lv") : "mid",
    type: TYPES[qs.get("t")] ? qs.get("t") : "",
    sel: byId(qs.get("d")) ? qs.get("d") : null,
  };
  function syncUrl() {
    const p = new URLSearchParams();
    p.set("m", st.m);
    p.set("b", st.budget);
    if (st.level !== "mid") p.set("lv", st.level);
    if (st.type) p.set("t", st.type);
    if (st.sel) p.set("d", st.sel);
    history.replaceState(null, "", `${location.pathname}?${p}`);
  }

  // ---------- scoring ----------
  function fitOf(d, m = st.m) {
    if (d.months.includes(m)) return 1;
    const prev = m === 1 ? 12 : m - 1, next = m === 12 ? 1 : m + 1;
    return d.months.includes(prev) || d.months.includes(next) ? 0.45 : 0.08;
  }
  const seasonWord = (fit) => (fit === 1 ? "Best season" : fit > 0.4 ? "Shoulder month" : "Off season");
  function score(d) {
    const fit = fitOf(d);
    const cost = B.perDay(d, st.level);
    const crowd = d.crowd[st.m - 1];
    const typeOk = !st.type || d.types.includes(st.type);
    const ok = typeOk && cost <= st.budget;
    return { d, id: d.id, fit, cost, crowd, ok, rank: fit * 100 - (crowd - 1) * 18 - cost / 700 };
  }
  let scores = [];
  const scoreOf = (id) => scores.find((s) => s.id === id);

  // ---------- dial ----------
  const dial = $("#dial");
  const R = 72, CX = 100, CY = 100;
  const angleOf = (m) => ((m - 1) / 12) * Math.PI * 2 - Math.PI / 2;
  const at = (a, r) => [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
  $("#dial-ticks").innerHTML = MONTHS.map((m, i) => {
    const [x, y] = at(angleOf(i + 1), 89);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" data-m="${i + 1}">${m[0]}</text>`;
  }).join("");
  function drawDial() {
    const a = angleOf(st.m);
    const [kx, ky] = at(a, R);
    $("#dial-knob").setAttribute("transform", `translate(${kx.toFixed(1)} ${ky.toFixed(1)})`);
    const [x0, y0] = at(a - 0.26, R), [x1, y1] = at(a + 0.26, R);
    $("#dial-arc").setAttribute("d", `M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`);
    $$("#dial-ticks text").forEach((t) => t.classList.toggle("is-on", +t.dataset.m === st.m));
    $("#dial-month").textContent = MONTHS[st.m - 1];
    dial.setAttribute("aria-valuenow", st.m);
    dial.setAttribute("aria-valuetext", FULL[st.m - 1]);
    $("#sm-month-word").textContent = FULL[st.m - 1];
    $("#sm-month-short").textContent = FULL[st.m - 1];
  }
  function setMonth(m) {
    m = ((m - 1 + 12) % 12) + 1;
    if (m === st.m) return;
    st.m = m;
    update();
  }
  function monthFromPointer(e) {
    const r = dial.getBoundingClientRect();
    const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) + Math.PI / 2;
    return Math.round((((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 6)) % 12 + 1;
  }
  let dragging = false;
  dial.addEventListener("pointerdown", (e) => {
    dragging = true;
    dial.setPointerCapture(e.pointerId);
    setMonth(monthFromPointer(e));
  });
  dial.addEventListener("pointermove", (e) => dragging && setMonth(monthFromPointer(e)));
  dial.addEventListener("pointerup", () => (dragging = false));
  dial.addEventListener("pointercancel", () => (dragging = false));
  dial.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 3, PageDown: -3 }[e.key];
    if (step) { e.preventDefault(); setMonth(st.m + step); }
    if (e.key === "Home") { e.preventDefault(); setMonth(1); }
    if (e.key === "End") { e.preventDefault(); setMonth(12); }
  });

  // ---------- budget, style, type ----------
  const budget = $("#budget");
  budget.value = st.budget;
  budget.addEventListener("input", () => { st.budget = +budget.value; update(); });
  $$("#sm-level [data-level]").forEach((b) => b.addEventListener("click", () => { st.level = b.dataset.level; update(); }));
  $("#sm-types").innerHTML = [["", "All types"], ...Object.entries(TYPES)]
    .map(([k, v]) => `<button class="chip chip--dark" type="button" data-type="${k}">${v}</button>`).join("");
  $("#sm-types").addEventListener("click", (e) => {
    const b = e.target.closest("[data-type]");
    if (b) { st.type = b.dataset.type; update(); }
  });

  // ---------- ranked list ----------
  const list = $("#sm-list");
  function renderList() {
    const best = scores.filter((s) => s.ok && s.fit > 0.4).sort((a, b) => b.rank - a.rank).slice(0, 8);
    $("#sm-count").textContent = `${scores.filter((s) => s.ok && s.fit > 0.4).length} of ${scores.length} fit`;
    if (!best.length) {
      list.innerHTML = `<li class="sm-empty">${icon("info")}<span>Nothing fits ${FULL[st.m - 1]} at ${inr(st.budget)} a day. Raise the budget or try another type.</span></li>`;
      topIds = [];
      return;
    }
    list.innerHTML = best.map((s, i) => {
      const twinFor = TWIN_OF[s.id] && byId(TWIN_OF[s.id]);
      const quiet = twinFor && twinFor.crowd[st.m - 1] >= 2 && s.crowd < twinFor.crowd[st.m - 1];
      return `<li><button type="button" class="sm-item${s.id === st.sel ? " is-sel" : ""}" data-id="${s.id}">
        <span class="sm-item__n">${i + 1}</span>
        <span class="sm-item__body">
          <strong>${esc(s.d.name)}</strong>
          <span class="sm-item__meta"><i class="dot dot--${s.crowd}"></i>${CROWD[s.crowd]} · ${s.fit === 1 ? "In season" : "Shoulder"}${quiet ? ` · <em>Quieter than ${esc(twinFor.name)}</em>` : ""}</span>
        </span>
        <span class="sm-item__cost">${inr(s.cost)}<small>/day</small></span>
      </button></li>`;
    }).join("");
    topIds = best.slice(0, 5).map((s) => s.id);
  }
  list.addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]");
    if (b) select(b.dataset.id, true);
  });
  list.addEventListener("mouseover", (e) => { const b = e.target.closest("[data-id]"); hoverId = b ? b.dataset.id : null; map && map.wake(); });
  list.addEventListener("mouseleave", () => { hoverId = null; map && map.wake(); });

  // ---------- destination card ----------
  const card = $("#sm-card");
  const panel = $("#sm-panel");
  function renderCard() {
    if (!st.sel) { card.hidden = true; panel.hidden = false; return; }
    const s = scoreOf(st.sel);
    const d = s.d;
    const inTrip = Store.inTrip(d.id);
    let twinHtml = "";
    const t = d.twin && byId(d.twin);
    if (t && s.crowd >= 2) {
      const ts = scoreOf(t.id);
      const save = Math.round((1 - ts.cost / s.cost) * 100);
      twinHtml = `<div class="sm-twin">
        <p><strong>${FULL[st.m - 1]} is ${CROWD[s.crowd].toLowerCase()} in ${esc(d.name)}.</strong> Try ${esc(t.name)}: ${save >= 10 ? `${save}% cheaper a day, ` : "a similar cost, "}${CROWD[ts.crowd].toLowerCase()}, ${seasonWord(ts.fit).toLowerCase()}.</p>
        <button class="btn btn--sm sm-twin__go" type="button" data-go="${t.id}">${icon("arrow-right")}Show ${esc(t.name)}</button>
      </div>`;
    } else if (TWIN_OF[d.id]) {
      const big = byId(TWIN_OF[d.id]);
      twinHtml = `<div class="sm-twin sm-twin--soft"><p>A quieter alternative to <button class="link-btn" type="button" data-go="${big.id}">${esc(big.name)}</button>.</p></div>`;
    }
    card.innerHTML = `
      <button class="icon-btn sm-card__close" type="button" data-back aria-label="Back to the list">${icon("x")}</button>
      <div class="sm-card__media frame">${photo(d.photo, 500, 300, d.name)}</div>
      <div class="sm-card__body">
        <h3>${esc(d.name)}</h3>
        <p class="sm-card__state">${esc(d.state)} · ${esc(d.tagline)}</p>
        ${monthStrip(d.months, true)}
        <dl class="sm-stats">
          <div><dt>${MONTHS[st.m - 1]}</dt><dd>${seasonWord(s.fit)}</dd></div>
          <div><dt>Crowd</dt><dd><i class="dot dot--${s.crowd}"></i>${CROWD[s.crowd]}</dd></div>
          <div><dt>${LEVELS[st.level].label}</dt><dd>${inr(s.cost)}<small>/day</small></dd></div>
        </dl>
        ${s.cost > st.budget ? `<p class="sm-over">${inr(s.cost - st.budget)} a day over your budget.</p>` : ""}
        ${twinHtml}
        <div class="sm-card__actions">
          <button class="btn btn--ember btn--sm${inTrip ? " is-on" : ""}" type="button" data-add="${d.id}">${icon(inTrip ? "check" : "plus")}${inTrip ? "In your trip" : "Add to trip"}</button>
          <button class="btn btn--sm sm-btn-ghost" type="button" data-more="${d.id}">Details</button>
        </div>
      </div>`;
    card.hidden = false;
    panel.hidden = true;
  }
  card.addEventListener("click", (e) => {
    if (e.target.closest("[data-back]")) return select(null);
    const go = e.target.closest("[data-go]");
    if (go) return select(go.dataset.go, true);
    const add = e.target.closest("[data-add]");
    if (add) {
      const added = Store.toggleStop(add.dataset.add);
      toast(added ? `${byId(add.dataset.add).name} added to your trip` : "Removed from your trip", { icon: added ? "check" : "x" });
      return;
    }
    const more = e.target.closest("[data-more]");
    if (more) openDestination(more.dataset.more, st.level);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && st.sel && !document.querySelector(".modal[open], dialog[open]")) select(null);
  });

  function select(id, fly) {
    st.sel = id && byId(id) ? id : null;
    renderCard();
    renderList();
    syncUrl();
    if (map) {
      map.select(st.sel);
      const d = st.sel && byId(st.sel);
      const twin = d && (d.twin || TWIN_OF[d.id]);
      map.setTwin(st.sel, twin || null);
      if (st.sel && fly) map.focus(st.sel);
      if (!st.sel) map.home();
    }
  }

  // ---------- HTML labels over the pillars ----------
  const labelsEl = $("#sm-labels");
  const labels = new Map();
  let topIds = [], hoverId = null;
  function labelFor(id) {
    if (!labels.has(id)) {
      const el = document.createElement("span");
      el.className = "sm-label";
      el.textContent = byId(id).name;
      labelsEl.appendChild(el);
      labels.set(id, el);
    }
    return labels.get(id);
  }
  function placeLabels() {
    // most important first; a label that would overlap one already placed is hidden
    const order = [st.sel, hoverId, ...topIds, ...Store.get().trip.stops.map((s) => s.id)].filter(Boolean);
    const show = [...new Set(order)];
    const placed = [];
    labels.forEach((el, id) => { if (!show.includes(id)) el.classList.remove("is-on"); });
    show.forEach((id) => {
      const p = map.screenOf(id);
      const el = labelFor(id);
      if (!p) { el.classList.remove("is-on"); return; }
      const w = el.offsetWidth || 80, h = el.offsetHeight || 22;
      const box = { l: p.x - w / 2 - 3, r: p.x + w / 2 + 3, t: p.y - h - 2, b: p.y + 2 };
      const hit = placed.some((o) => box.l < o.r && box.r > o.l && box.t < o.b && box.b > o.t);
      if (hit) { el.classList.remove("is-on"); return; }
      placed.push(box);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
      el.classList.add("is-on");
      el.classList.toggle("is-sel", id === st.sel || id === hoverId);
    });
  }

  // ---------- trip route ----------
  function renderTrip() {
    const trip = Store.get().trip;
    const el = $("#sm-route");
    if (!trip.stops.length) {
      el.innerHTML = `<div class="sm-route__empty">${icon("route")}<p>Pick places on the map and press <strong>Add to trip</strong>. Each stop joins the route with a glowing arc.</p></div>`;
      return;
    }
    const est = B.estimate(trip);
    el.innerHTML = `
      <ol class="sm-legs">
        ${est.stops.map((s, i) => {
          const leg = est.legs[i - 1];
          return `${leg ? `<li class="sm-leg">${icon("arrow-right")}${leg.km.toLocaleString("en-IN")} km by ${leg.mode}, about ${Math.round(leg.hours)} h</li>` : ""}
            <li class="sm-stop"><button class="link-btn" type="button" data-show="${s.d.id}">${esc(s.d.name)}</button><span>${s.nights} night${s.nights > 1 ? "s" : ""}</span></li>`;
        }).join("")}
      </ol>
      <p class="sm-total">About <strong>${inr(est.total)}</strong> for ${est.people} ${est.people > 1 ? "people" : "person"}, ${est.nights} nights, ${LEVELS[trip.level].label.toLowerCase()} style.</p>
      <div class="sm-route__actions">
        <a class="btn btn--line btn--sm" href="planner.html">${icon("route")}Open in planner</a>
        <button class="btn btn--ember btn--sm" type="button" data-share>${icon("share-2")}Share trip link</button>
        <a class="btn btn--line btn--sm" href="agents.html">${icon("message-circle")}Send to an agent</a>
      </div>`;
  }
  $("#sm-route").addEventListener("click", (e) => {
    const show = e.target.closest("[data-show]");
    if (show) { select(show.dataset.show, true); $(".sm-stage").scrollIntoView({ behavior: "smooth" }); }
    if (e.target.closest("[data-share]")) window.UI.shareTrip();
  });

  // ---------- the 3D map ----------
  let map = null;
  function startMap() {
    if (map || !window.SeasonMap) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      map = window.SeasonMap.create($("#sm-canvas"), {
        rings: window.PATHIK_INDIA,
        places: DESTINATIONS.map((d) => ({ id: d.id, lat: d.lat, lng: d.lng })),
        reduce,
      });
    } catch (err) {
      $("#sm-fallback").hidden = false;
      return;
    }
    const narrow = matchMedia("(max-width: 760px)");
    map.setFlat(narrow.matches || reduce);
    narrow.addEventListener("change", (e) => map.setFlat(e.matches || reduce));
    map.onPick = (id) => select(id, true);
    map.onHover = (id) => { hoverId = id; };
    map.onFrame = placeLabels;
    map.setScores(scores);
    map.setRoute(Store.get().trip.stops.map((s) => s.id));
    if (st.sel) { select(st.sel, true); }
    $("#sm-home").addEventListener("click", () => select(null));
  }
  if (window.SeasonMap) startMap();
  else window.addEventListener("seasonmap:ready", startMap, { once: true });

  // ---------- update everything ----------
  function update() {
    scores = DESTINATIONS.map(score);
    drawDial();
    $("#budget-out").textContent = inr(st.budget);
    budget.style.setProperty("--p", `${((st.budget - 1500) / (12000 - 1500)) * 100}%`);
    $$("#sm-level [data-level]").forEach((b) => b.setAttribute("aria-checked", b.dataset.level === st.level));
    $$("#sm-types [data-type]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.type === st.type));
    renderList();
    renderCard();
    syncUrl();
    if (map) map.setScores(scores);
  }
  Store.on(() => {
    renderTrip();
    if (st.sel) renderCard();
    if (map) map.setRoute(Store.get().trip.stops.map((s) => s.id));
  });
  update();
  renderTrip();
  hydrate();
})();
