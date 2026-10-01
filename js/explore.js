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
    const p = new URLSearchParams();
    Object.entries(state).forEach(([k, v]) => {
      if (v && !(k === "sort" && v === "season") && !(k === "level" && v === "mid")) p.set(k, v);
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
    $$("[data-add-trip]").forEach((b) => {
      const on = Store.inTrip(b.dataset.addTrip);
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on);
      b.innerHTML = icon(on ? "check" : "plus");
    });
  });

  syncInputs();
  render();
  hydrate();

  // deep link: explore.html#goa opens the detail
  const hash = location.hash.slice(1);
  if (hash && DESTINATIONS.some((d) => d.id === hash)) openDestination(hash, state.level);
})();
