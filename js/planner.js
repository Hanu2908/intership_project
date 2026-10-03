/* Planner: route editing, live budget, day-by-day itinerary */
(function () {
  const { $, $$, esc, icon, photo, toast, stepper, bindSteppers, hydrate, empty, fmtDate } = window.UI;
  const { DESTINATIONS, LEVELS, MONTHS } = window.PATHIK_DATA;
  const { itinerary, inr, byId } = window.Budget;

  const QUICK = [
    { label: "Rajasthan loop", stops: ["jaipur", "udaipur", "jaisalmer"] },
    { label: "Kerala hills and water", stops: ["munnar", "alleppey"] },
    { label: "River towns", stops: ["varanasi", "rishikesh"] },
    { label: "Taj and the Pink City", stops: ["agra", "jaipur"] },
    { label: "Karnataka ruins", stops: ["hampi", "mysuru"] },
  ];
  const BARS = [
    ["stay", "Stay", "var(--violet-2)"],
    ["food", "Food", "var(--ember)"],
    ["local", "Local transport", "var(--rose)"],
    ["act", "Sights & activities", "var(--sun)"],
    ["travel", "Between stops", "var(--violet)"],
  ];

  // default start date: 30 days out
  if (!Store.get().trip.start) {
    const d = new Date(Date.now() + 30 * 864e5);
    Store.update((s) => (s.trip.start = d.toISOString().slice(0, 10)));
  }

  const trip = () => Store.get().trip;
  let moved = null;

  // ---- static controls ----
  $("#start").value = trip().start;
  $("#start").min = new Date().toISOString().slice(0, 10);
  $("#start").addEventListener("change", (e) => Store.update((s) => (s.trip.start = e.target.value)));

  $("#style").innerHTML = Object.entries(LEVELS).map(([k, v]) => `<button type="button" role="radio" data-lv="${k}">${v.label}</button>`).join("");
  $("#style").addEventListener("click", (e) => {
    const b = e.target.closest("[data-lv]");
    if (b) Store.update((s) => (s.trip.level = b.dataset.lv));
  });

  $("#people").innerHTML = stepper("adults", "Adults", "12+ years", trip().adults) + stepper("children", "Children", "Share parents' room", trip().children);
  const ppl = { adults: trip().adults, children: trip().children };
  bindSteppers($("#people"), ppl, { adults: [1, 12], children: [0, 6] }, (k, v) => Store.update((s) => (s.trip[k] = v)));

  $("#target").value = trip().target || "";
  $("#target").addEventListener("input", (e) => Store.update((s) => (s.trip.target = Math.max(0, +e.target.value || 0))));

  // ---- route ----
  function renderAddSelect() {
    const left = DESTINATIONS.filter((d) => !Store.inTrip(d.id));
    $("#add-stop").innerHTML = `<option value="">+ Add a stop</option>` + left.map((d) => `<option value="${d.id}">${esc(d.name)}, ${esc(d.state)}</option>`).join("");
  }
  $("#add-stop").addEventListener("change", (e) => {
    if (!e.target.value) return;
    const d = byId(e.target.value);
    Store.toggleStop(d.id);
    moved = d.id;
    toast(`${d.name} added`, { icon: "map-pin-plus" });
  });

  function renderRoute(est, warnings) {
    const { stops } = trip();
    if (!stops.length) {
      $("#route").innerHTML = empty("map", "No stops yet", "Pick a ready-made route to start, or add places from Explore.",
        `<div class="quick">${QUICK.map((q, i) => `<button class="chip" type="button" data-quick="${i}">${esc(q.label)}</button>`).join("")}</div>
         <a class="btn btn--ember btn--sm" href="explore.html" style="margin-top:.6rem">${icon("compass")}Browse destinations</a>`);
      return;
    }
    const warnIds = new Set(warnings.map((w) => w.stop.id));
    $("#route").innerHTML = stops.map((s, i) => {
      const d = byId(s.id);
      if (!d) return "";
      const leg = i > 0 ? est.legs[i - 1] : null;
      return `${leg ? `<div class="leg">${icon(leg.mode === "flight" ? "plane" : leg.mode === "train" ? "train-front" : "car")}<span><strong>${leg.km.toLocaleString("en-IN")} km</strong> by ${leg.mode}, about ${Math.round(leg.hours * 2) / 2} h · ${inr(leg.cost)}</span></div>` : ""}
      <div class="stop${moved === s.id ? " is-moved" : ""}" data-id="${s.id}">
        ${photo(d.photo, 128, 128, d.name, "stop__img")}
        <div>
          <button class="stop__name" type="button" data-dest="${d.id}">${esc(d.name)}</button>
          <div class="stop__sub">${esc(d.state)} · ${inr(window.Budget.perDay(d, trip().level))} a day each</div>
          ${warnIds.has(d.id) ? `<div class="stop__warn">${icon("cloud-rain")}Off season on these dates</div>` : ""}
        </div>
        <div class="stop__ctrl">
          <div class="nights" aria-label="Nights in ${esc(d.name)}">
            <button class="icon-btn icon-btn--sm" type="button" data-n="-1" aria-label="One night fewer in ${esc(d.name)}" ${s.nights <= 1 ? "disabled" : ""}>${icon("minus")}</button>
            <output>${s.nights} night${s.nights > 1 ? "s" : ""}</output>
            <button class="icon-btn icon-btn--sm" type="button" data-n="1" aria-label="One more night in ${esc(d.name)}" ${s.nights >= 14 ? "disabled" : ""}>${icon("plus")}</button>
          </div>
          <button class="icon-btn icon-btn--sm" type="button" data-mv="-1" aria-label="Move ${esc(d.name)} earlier" ${i === 0 ? "disabled" : ""}>${icon("arrow-up")}</button>
          <button class="icon-btn icon-btn--sm" type="button" data-mv="1" aria-label="Move ${esc(d.name)} later" ${i === stops.length - 1 ? "disabled" : ""}>${icon("arrow-down")}</button>
          <button class="icon-btn icon-btn--sm" type="button" data-rm aria-label="Remove ${esc(d.name)}">${icon("x")}</button>
        </div>
      </div>`;
    }).join("");
    moved = null;
  }

  $("#route").addEventListener("click", (e) => {
    const q = e.target.closest("[data-quick]");
    if (q) {
      const r = QUICK[+q.dataset.quick];
      Store.update((s) => (s.trip.stops = r.stops.map((id) => ({ id, nights: byId(id).nights }))));
      return toast(`${r.label} loaded. Adjust it however you like.`, { icon: "route" });
    }
    const row = e.target.closest(".stop");
    if (!row) return;
    const id = row.dataset.id;
    const n = e.target.closest("[data-n]");
    const mv = e.target.closest("[data-mv]");
    if (n) Store.update((s) => { const st = s.trip.stops.find((x) => x.id === id); st.nights = Math.min(14, Math.max(1, st.nights + +n.dataset.n)); });
    if (mv) {
      moved = id;
      Store.update((s) => {
        const i = s.trip.stops.findIndex((x) => x.id === id);
        const j = i + +mv.dataset.mv;
        [s.trip.stops[i], s.trip.stops[j]] = [s.trip.stops[j], s.trip.stops[i]];
      });
      $(`.stop[data-id="${id}"] [data-mv="${mv.dataset.mv}"]`)?.focus();
    }
    if (e.target.closest("[data-rm]")) {
      const name = byId(id).name;
      const backup = Store.get().trip.stops.slice();
      Store.update((s) => (s.trip.stops = s.trip.stops.filter((x) => x.id !== id)));
      toast(`${name} removed`, { icon: "map-pin-minus", label: "Undo", onAction: () => Store.update((s) => (s.trip.stops = backup)), ms: 5000 });
    }
  });

  // ---- summary ----
  function renderSummary(est) {
    const t = trip();
    $("#total").textContent = inr(est.total);
    $("#mbar-total").textContent = inr(est.total);
    $("#mbar").hidden = !est.stops.length;
    $("#pp").textContent = est.stops.length
      ? `${inr(est.perPerson)} per person · ${est.nights} night${est.nights > 1 ? "s" : ""} · ${est.people} traveller${est.people > 1 ? "s" : ""} · ${est.rooms} room${est.rooms > 1 ? "s" : ""}`
      : "Add a stop to see the estimate";
    const max = Math.max(1, ...Object.values(est.lines));
    $("#bars").innerHTML = BARS.map(([k, label, c]) => `<div class="bar" style="--c:${c}"><span>${label}</span><strong>${inr(est.lines[k])}</strong><div class="bar__track"><div class="bar__fill" data-w="${(est.lines[k] / max) * 100}"></div></div></div>`).join("") +
      `<div class="bar" style="--c:var(--lilac)"><span>Buffer for extras (10%)</span><strong>${inr(est.buffer)}</strong></div>`;
    requestAnimationFrame(() => $$(".bar__fill").forEach((f) => (f.style.width = f.dataset.w + "%")));

    const meter = $("#meter"), msg = $("#target-msg");
    if (t.target > 0 && est.total > 0) {
      const ratio = est.total / t.target;
      meter.firstElementChild.style.width = Math.min(100, ratio * 100) + "%";
      meter.classList.toggle("is-over", ratio > 1);
      if (ratio > 1) {
        const priciest = est.stops.slice().sort((a, b) => b.d.cost[t.level].stay - a.d.cost[t.level].stay)[0];
        const cheaper = t.level === "premium" ? "Comfort" : t.level === "mid" ? "Backpacker" : null;
        msg.className = "target__msg is-over";
        msg.textContent = `${inr(est.total - t.target)} over. ${cheaper ? `Switching to ${cheaper} or d` : "D"}ropping a night in ${priciest.d.name} would help most.`;
      } else {
        msg.className = "target__msg is-ok";
        msg.textContent = `${inr(t.target - est.total)} to spare.`;
      }
    } else {
      meter.firstElementChild.style.width = "0";
      msg.textContent = "";
    }
    $("#send").classList.toggle("is-disabled", !est.stops.length);
    $("#style-note").textContent = LEVELS[t.level].note + ".";
    $$("#style [data-lv]").forEach((b) => b.setAttribute("aria-checked", b.dataset.lv === t.level));
  }

  // ---- itinerary ----
  function renderDays(days, warnings) {
    $("#warnings").innerHTML = warnings.map((w) => `<p class="warning">${icon("triangle-alert")}<span>${esc(w.text)}</span></p>`).join("");
    $("#days-pill").textContent = days.length ? `${days.length} days` : "";
    $("#days").innerHTML = days.length
      ? days.map((d) => `<li class="day${/ to |Arrive|Head home/.test(d.title) ? " is-travel" : ""}">
          <div class="day__date"><span class="day__n">${d.n}</span>${d.date ? `<small>${d.date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</small>` : ""}</div>
          <div class="day__body"><h4>${esc(d.title)}</h4><ul>${d.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        </li>`).join("")
      : `<li>${empty("calendar-days", "Your days will appear here", "Each stop gets dated days with the main sights spread across them.")}</li>`;
  }

  // ---- route map ----
  let map, layer, mapBusy;
  async function renderMap(est) {
    const panel = $("#map-panel");
    panel.hidden = !est.stops.length;
    if (!est.stops.length) return;
    const km = est.legs.reduce((a, l) => a + l.km, 0);
    $("#map-km").textContent = km ? `${km.toLocaleString("en-IN")} km between stops` : "";
    if (!map) {
      if (mapBusy) return;
      mapBusy = true;
      try {
        map = await window.UI.makeMap($("#route-map"), { center: [22.5, 80], zoom: 5 });
        layer = window.L.layerGroup().addTo(map);
      } catch (e) {
        $("#route-map").innerHTML = `<p class="fine" style="padding:1.5rem">The map couldn't load.</p>`;
        return;
      } finally { mapBusy = false; }
    }
    const L = window.L;
    layer.clearLayers();
    const pts = est.stops.map((s) => [s.d.lat, s.d.lng]);
    if (pts.length > 1) L.polyline(pts, { color: "#ef7d42", weight: 3, dashArray: "6 8", opacity: 0.9 }).addTo(layer);
    est.stops.forEach((s, i) => {
      L.marker([s.d.lat, s.d.lng], { icon: window.UI.pin(i + 1), title: s.d.name }).addTo(layer)
        .bindTooltip(`${i + 1}. ${s.d.name} · ${s.nights}N`, { direction: "top", offset: [0, -14] });
    });
    setTimeout(() => {
      map.invalidateSize();
      if (pts.length > 1) map.fitBounds(pts, { padding: [36, 36], maxZoom: 8 });
      else map.setView(pts[0], 8);
    }, 60);
  }

  function render() {
    const { est, days, warnings } = itinerary(trip());
    renderMap(est);
    renderAddSelect();
    renderRoute(est, warnings);
    renderSummary(est);
    renderDays(days, warnings);
  }

  // ---- actions ----
  $("#print").addEventListener("click", () => window.print());
  $("#copy").addEventListener("click", async () => {
    const { est, days } = itinerary(trip());
    if (!est.stops.length) return toast("Add a stop first", { icon: "info" });
    const t = trip();
    const text = [
      `My Pathik trip (${LEVELS[t.level].label}, ${est.people} travellers)`,
      ...days.map((d) => `Day ${d.n}${d.date ? ` (${fmtDate(d.date.toISOString().slice(0, 10))})` : ""}: ${d.title}`),
      `Estimated total: ${inr(est.total)} (${inr(est.perPerson)} per person)`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = Object.assign(document.createElement("textarea"), { value: text });
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast("Trip summary copied", { icon: "copy" });
  });
  $("#share").addEventListener("click", () => window.UI.shareTrip());
  $("#reset").addEventListener("click", () => {
    if (!trip().stops.length) return;
    if (!confirm("Remove every stop from this trip?")) return;
    Store.update((s) => (s.trip.stops = []));
  });

  Store.on(render);
  render();
  hydrate();
})();
