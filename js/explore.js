/* Explore page: filters synced to the URL, cards, detail modal */
(function () {
  const { $, $$, esc, icon, photo, monthStrip, hydrate, reveal, openDestination, empty } = window.UI;
  const { MONTHS, TYPES, REGIONS, DESTINATIONS } = window.PATHIK_DATA;
  const { perDay, inr } = window.Budget;

  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get("q") || "",
    month: params.get("month") || "",
    level: params.get("level") || Store.get().trip.level || "mid",
    max: params.get("max") || "",
    region: params.get("region") || "",
    type: params.get("type") || "",
    sort: params.get("sort") || "season",
    view: params.get("view") === "map" ? "map" : "grid",
  };

  const el = { q: $("#q"), month: $("#month"), level: $("#level"), max: $("#max"), sort: $("#sort") };
  el.month.insertAdjacentHTML("beforeend", MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join(""));

  $("#regions").innerHTML = ["", ...REGIONS].map((r) => `<button class="chip" type="button" data-region="${r}">${r || "All regions"}</button>`).join("");
  $("#types").innerHTML = ["", ...Object.keys(TYPES)].map((t) => `<button class="chip" type="button" data-type="${t}">${t ? TYPES[t] : "All types"}</button>`).join("");

  function syncInputs() {
    Object.keys(el).forEach((k) => (el[k].value = state[k]));
    $$("[data-region]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.region === state.region));
    $$("[data-type]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.type === state.type));
  }

  function matches(d) {
    const q = state.q.trim().toLowerCase();
    if (q) {
      const hay = [d.name, d.state, d.region, d.tagline, d.overview, ...d.things, ...d.types.map((t) => TYPES[t])].join(" ").toLowerCase();
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    if (state.region && d.region !== state.region) return false;
    if (state.type && !d.types.includes(state.type)) return false;
    if (state.month && !d.months.includes(+state.month)) return false;
    if (state.max && perDay(d, state.level) > +state.max) return false;
    return true;
  }

  const thisMonth = new Date().getMonth() + 1;
  function sorted(list) {
    const m = +state.month || thisMonth;
    if (state.sort === "cheap") return list.sort((a, b) => perDay(a, state.level) - perDay(b, state.level));
    if (state.sort === "name") return list.sort((a, b) => a.name.localeCompare(b.name));
    return list.sort((a, b) => (b.months.includes(m) - a.months.includes(m)) || perDay(a, state.level) - perDay(b, state.level));
  }

  function card(d) {
    const on = Store.inTrip(d.id);
    const inSeason = d.months.includes(+state.month || thisMonth);
    return `<article class="dcard reveal">
      <div class="dcard__media frame">
        ${photo(d.photo, 640, 480, `${d.name}, ${d.state}`)}
        <button class="icon-btn dcard__add${on ? " is-on" : ""}" type="button" data-add-trip="${d.id}" aria-pressed="${on}" aria-label="${on ? "Remove" : "Add"} ${esc(d.name)} ${on ? "from" : "to"} trip">${icon(on ? "check" : "plus")}</button>
        <span class="dcard__region">${d.region}</span>
      </div>
      <div class="dcard__body">
        <span class="dcard__state">${esc(d.state)}${inSeason ? ` · <span style="color:var(--good)">In season${state.month ? "" : " now"}</span>` : ""}</span>
        <h3><a href="#${d.id}" data-dest="${d.id}" style="text-decoration:none">${esc(d.name)}</a></h3>
        <p class="dcard__tag">${esc(d.tagline)}</p>
        <div class="dcard__meta">
          <span>${icon("wallet")}<strong>${inr(perDay(d, state.level))}</strong>/day</span>
          <span>${icon("moon")}${d.nights} night${d.nights > 1 ? "s" : ""}</span>
        </div>
        <div class="dcard__foot">
          ${monthStrip(d.months, true)}
          <button class="link-btn" type="button" data-dest="${d.id}">Details ${icon("arrow-right")}</button>
        </div>
      </div>
    </article>`;
  }

  function render() {
    const list = sorted(DESTINATIONS.filter(matches));
    const filtered = state.q || state.month || state.max || state.region || state.type;
    $("#count").innerHTML = `<strong>${list.length}</strong> of ${DESTINATIONS.length} destinations${state.month ? ` good in <strong>${MONTHS[state.month - 1]}</strong>` : ""}`;
    $("#clear").hidden = !filtered;
    $("#grid").innerHTML = list.length
      ? list.map(card).join("")
      : `<div style="grid-column:1/-1">${empty("search-x", "Nothing matches all of that", "Try another month or a higher daily budget. Fewer filters usually helps.", `<button class="btn btn--ember btn--sm" type="button" data-reset>Clear filters</button>`)}</div>`;
    reveal($("#grid"));
    $("#grid").hidden = state.view === "map";
    $("#map").hidden = state.view !== "map";
    $$("#view [data-view]").forEach((b) => b.setAttribute("aria-checked", b.dataset.view === state.view));
    if (state.view === "map") renderMap(list);
    const p = new URLSearchParams();
    Object.entries(state).forEach(([k, v]) => {
      if (v && !(k === "sort" && v === "season") && !(k === "level" && v === "mid") && !(k === "view" && v === "grid")) p.set(k, v);
    });
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "") + location.hash);
  }

  let t;
  el.q.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => { state.q = el.q.value; render(); }, 120);
  });
  ["month", "level", "max", "sort"].forEach((k) => el[k].addEventListener("change", () => {
    state[k] = el[k].value;
    if (k === "level") Store.update((s) => (s.trip.level = state.level));
    render();
  }));
  document.addEventListener("click", (e) => {
    const r = e.target.closest("[data-region]");
    if (r) { state.region = r.dataset.region; syncInputs(); render(); }
    const ty = e.target.closest("[data-type]");
    if (ty) { state.type = ty.dataset.type; syncInputs(); render(); }
    if (e.target.closest("#clear, [data-reset]")) {
      Object.assign(state, { q: "", month: "", max: "", region: "", type: "" });
      syncInputs();
      render();
    }
  });

  // repaint the add buttons when the trip changes (here or in the modal)
  Store.on(() => {
    if (state.view === "map" && map) renderMap(sorted(DESTINATIONS.filter(matches)));
    $$("[data-add-trip]").forEach((b) => {
      const on = Store.inTrip(b.dataset.addTrip);
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on);
      b.innerHTML = icon(on ? "check" : "plus");
    });
  });

  // ---- map view ----
  let map, layer;
  async function renderMap(list) {
    if (!map) {
      try {
        map = await window.UI.makeMap($("#map"));
      } catch (e) {
        $("#map").innerHTML = `<p class="fine" style="padding:1.5rem">The map couldn't load. Check your connection, or use the grid view.</p>`;
        return;
      }
      layer = window.L.layerGroup().addTo(map);
    }
    layer.clearLayers();
    const pts = [];
    list.forEach((d) => {
      const on = Store.inTrip(d.id);
      pts.push([d.lat, d.lng]);
      window.L.marker([d.lat, d.lng], { icon: window.UI.pin(on ? "✓" : "", on ? "pin--on" : "pin--dot"), title: d.name })
        .addTo(layer)
        .bindPopup(`<div class="pop">
          ${photo(d.photo, 330, 180, d.name, "pop__img")}
          <strong>${esc(d.name)}</strong>
          <span>${esc(d.state)} · ${inr(perDay(d, state.level))}/day</span>
          <div class="pop__actions">
            <button class="btn btn--ember btn--sm" type="button" data-dest="${d.id}">Details</button>
            <button class="btn btn--line btn--sm" type="button" data-add-trip="${d.id}">${on ? "In trip" : "Add to trip"}</button>
          </div>
        </div>`, { maxWidth: 260, minWidth: 220 });
    });
    setTimeout(() => {
      map.invalidateSize();
      // every place on show: frame the whole country, not just the pins
      if (pts.length >= 12) map.fitBounds(window.UI.INDIA_BOUNDS, { padding: [12, 12] });
      else if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 7 });
      else if (pts.length === 1) map.setView(pts[0], 7);
    }, 60);
  }
  $("#view").addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (!b) return;
    state.view = b.dataset.view;
    render();
  });

  // ---- header slideshow ----
  const slideIds = ["leh", "pichola", "alleppey", "hampi", "andaman", "spiti", "jaisalmer", "teahills"];
  const slideDest = { pichola: "udaipur", spiti: null, teahills: "munnar" };
  const { PHOTOS } = window.PATHIK_DATA;
  const sTrack = $("#slides-track");
  sTrack.innerHTML = slideIds.map((k, i) => `<figure class="slide${i === 0 ? " is-on" : ""}" aria-hidden="${i !== 0}">${photo(k, 1920, 1080, PHOTOS[k].title, "", i === 0)}</figure>`).join("");
  const slides = $$(".slide", sTrack);
  let si = 0;
  function showSlide(i) {
    si = (i + slides.length) % slides.length;
    slides.forEach((f, j) => { f.classList.toggle("is-on", j === si); f.setAttribute("aria-hidden", j !== si); });
    const k = slideIds[si];
    const dest = slideDest[k] === undefined ? k : slideDest[k];
    const cap = $("#slides-caption");
    cap.innerHTML = `${icon("map-pin")}<span>${esc(PHOTOS[k].title)}</span>${dest ? `<em>View ${icon("arrow-right")}</em>` : ""}`;
    cap.dataset.slideDest = dest || "";
    cap.disabled = !dest;
    $("#slides-count").textContent = `${si + 1} / ${slides.length}`;
  }
  $("#slides-caption").addEventListener("click", (e) => { const id = e.currentTarget.dataset.slideDest; if (id) openDestination(id, state.level); });
  let slideTimer;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const restart = () => { clearInterval(slideTimer); if (!reduce) slideTimer = setInterval(() => !document.hidden && showSlide(si + 1), 6000); };
  $("#slides-prev").addEventListener("click", () => { showSlide(si - 1); restart(); });
  $("#slides-next").addEventListener("click", () => { showSlide(si + 1); restart(); });
  showSlide(0);
  restart();

  syncInputs();
  render();
  hydrate();

  // deep link: explore.html#goa opens the detail
  const hash = location.hash.slice(1);
  if (hash && DESTINATIONS.some((d) => d.id === hash)) openDestination(hash, state.level);
})();
