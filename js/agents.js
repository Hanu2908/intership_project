/* Agents page: list, enquiry form with trip attached, simulated status tracker */
(function () {
  const { $, $$, esc, icon, toast, validate, liveValidate, hydrate, empty, fmtDate } = window.UI;
  const { AGENTS, REGIONS, DESTINATIONS, LEVELS } = window.PATHIK_DATA;
  const { estimate, inr, byId } = window.Budget;

  const params = new URLSearchParams(location.search);
  const COLORS = ["#4a3a8f", "#ef7d42", "#2f8a63", "#b5541c", "#6a57b8", "#c0577a", "#1c1638"];
  const SEEN_AFTER = 20e3;
  const QUOTE_AFTER = 60e3;
  const st = { region: "", sort: "reply", picked: "", contact: "WhatsApp" };

  // ---- best match: the agent covering the trip's first region, fastest reply ----
  function bestFor(region, destId) {
    const local = AGENTS.filter((a) => a.covers.includes(destId));
    const pool = local.length ? local : AGENTS.filter((a) => !region || a.regions.includes(region));
    return (pool.length ? pool : AGENTS).slice().sort((a, b) => a.reply - b.reply)[0];
  }
  const firstStop = () => {
    const first = Store.get().trip.stops[0];
    return first ? byId(first.id) : null;
  };

  // ---- agents list ----
  $("#ag-region").innerHTML = ["", ...REGIONS].map((r) => `<button class="chip" type="button" data-r="${r}" aria-pressed="${!r}">${r || "All regions"}</button>`).join("");
  function renderAgents() {
    const list = AGENTS.filter((a) => !st.region || a.regions.includes(st.region)).sort({
      reply: (a, b) => a.reply - b.reply,
      rating: (a, b) => b.rating - a.rating,
      reviews: (a, b) => b.reviews - a.reviews,
    }[st.sort]);
    $("#agents").innerHTML = list.map((a) => {
      const i = AGENTS.indexOf(a);
      return `<article class="agent${st.picked === a.id ? " is-picked" : ""}" data-agent="${a.id}">
        <span class="agent__logo" style="background:${COLORS[i % COLORS.length]}" aria-hidden="true">${esc(a.name.split(" ").filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join("").slice(0, 2))}</span>
        <div>
          <h3>${esc(a.name)} ${icon("badge-check")}</h3>
          <p class="agent__spec">${esc(a.speciality)} · ${esc(a.city)}</p>
          <div class="agent__facts">
            <span>${icon("timer")}Replies in ~${a.reply} min</span>
            <span>${icon("star")}${a.rating} (${a.reviews})</span>
            <span>${icon("languages")}${a.langs.join(", ")}</span>
            <span>${icon("file-badge")}Reg. ${esc(a.reg)} · since ${a.since}</span>
          </div>
        </div>
        <button class="btn ${st.picked === a.id ? "btn--ember" : "btn--line"} btn--sm" type="button" data-pick="${a.id}">${st.picked === a.id ? `${icon("check")}Chosen` : "Choose"}</button>
      </article>`;
    }).join("");
  }
  $("#ag-region").addEventListener("click", (e) => {
    const b = e.target.closest("[data-r]");
    if (!b) return;
    st.region = b.dataset.r;
    $$("#ag-region .chip").forEach((c) => c.setAttribute("aria-pressed", c === b));
    renderAgents();
  });
  $("#ag-sort").addEventListener("change", (e) => { st.sort = e.target.value; renderAgents(); });
  $("#agents").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pick]");
    if (!b) return;
    pick(b.dataset.pick);
    if (matchMedia("(max-width: 980px)").matches) $("#enquiry").scrollIntoView({ behavior: "smooth", block: "start" });
    else $("#e-name").focus({ preventScroll: true });
  });

  function pick(id) {
    st.picked = id;
    $("#e-agent").value = id;
    $("#e-agent").removeAttribute("aria-invalid");
    $("#e-agent-err").textContent = "";
    renderAgents();
  }

  // ---- form ----
  const sel = $("#e-agent");
  sel.innerHTML = `<option value="">Choose an agent</option>` + AGENTS.map((a) => `<option value="${a.id}">${esc(a.name)} (${esc(a.city)})</option>`).join("");
  sel.addEventListener("change", () => { st.picked = sel.value; renderAgents(); });

  function renderAttached() {
    const t = Store.get().trip;
    if (!t.stops.length) {
      $("#attached").innerHTML = `<div class="attached"><div class="attached__head"><span>${icon("paperclip")} No trip attached</span><a class="link-btn" href="planner.html">Plan one ${icon("arrow-right")}</a></div><p class="fine" style="margin-top:.3rem">Agents reply faster when they can see your stops and nights.</p></div>`;
      return;
    }
    const est = estimate(t);
    $("#attached").innerHTML = `<div class="attached">
      <div class="attached__head"><label class="check"><input type="checkbox" id="e-attach" checked><span>Attach my trip</span></label><strong>${inr(est.total)}</strong></div>
      <ol>${t.stops.map((s) => `<li>${esc(byId(s.id).name)} · ${s.nights}N</li>`).join("")}</ol>
      <p class="fine" style="margin-top:.4rem">${est.people} travellers · ${LEVELS[t.level].label}${t.start ? ` · from ${fmtDate(t.start)}` : ""}</p>
    </div>`;
  }

  const form = $("#enq-form");
  const minDate = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  $("#e-date").min = minDate;
  $("#e-date").value = Store.get().trip.start && Store.get().trip.start >= minDate ? Store.get().trip.start : "";
  liveValidate(form);

  $("#e-contact").addEventListener("click", (e) => {
    const b = e.target.closest("[data-c]");
    if (!b) return;
    st.contact = b.dataset.c;
    $$("#e-contact [data-c]").forEach((x) => x.setAttribute("aria-checked", x === b));
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const attach = $("#e-attach")?.checked;
    const msg = $("#e-msg");
    // without a trip, the message is the only context the agent gets
    msg.required = !attach;
    msg.minLength = attach ? 0 : 15;
    msg.dataset.req = "Tell the agent where and roughly what you want.";
    if (!validate(form)) return;

    const trip = attach ? JSON.parse(JSON.stringify(Store.get().trip)) : null;
    const est = trip ? estimate(trip) : null;
    const adults = trip ? est.people : 2;
    const id = Store.uid("ENQ");
    // a deterministic quote within ±6% of our estimate, or from the stated budget
    const jitter = 0.94 + (parseInt(id.slice(-3), 36) % 120) / 1000;
    const quote = Math.round(((est ? est.total : +$("#e-budget").value * adults) * jitter) / 100) * 100;
    const agent = AGENTS.find((a) => a.id === $("#e-agent").value);

    Store.update((s) => s.enquiries.push({
      id, agent: agent.id, name: $("#e-name").value.trim(), phone: $("#e-phone").value.trim(), email: $("#e-email").value.trim(),
      date: $("#e-date").value, budget: +$("#e-budget").value, contact: st.contact, msg: msg.value.trim(),
      stops: trip ? trip.stops : [], quote, at: Date.now(), status: "open",
    }));
    toast(`Sent to ${agent.name}`, { icon: "send" });
    msg.value = "";
    renderTickets();
    $("#tracker").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---- tracker ----
  function stage(q) {
    if (q.status === "accepted") return 3;
    const dt = Date.now() - q.at;
    return dt > QUOTE_AFTER ? 3 : dt > SEEN_AFTER ? 2 : 1;
  }
  function renderTickets() {
    const list = Store.get().enquiries.slice().reverse();
    if (!list.length) {
      $("#tickets").innerHTML = `<div class="panel">${empty("inbox", "No enquiries yet", "Send one from the form and it will show up here with its status.")}</div>`;
      return;
    }
    $("#tickets").innerHTML = list.map((q) => {
      const a = AGENTS.find((x) => x.id === q.agent);
      const s = stage(q);
      const steps = ["Sent", "Seen by agent", "Quote ready"];
      return `<article class="ticket" data-q="${q.id}">
        <div class="ticket__head">
          <div><strong>${esc(a.name)}</strong><p class="fine">${esc(q.id)} · ${new Date(q.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · via ${esc(q.contact)}</p></div>
          ${q.status === "accepted" ? `<span class="pill pill--good">${icon("check")}Accepted</span>` : s === 3 ? `<span class="pill pill--good">${icon("mail-check")}Quote in</span>` : `<span class="pill pill--wait">${icon("clock")}Waiting</span>`}
        </div>
        ${q.stops.length ? `<p class="fine">${icon("route")}${q.stops.map((x) => esc(byId(x.id)?.name || x.id) + " " + x.nights + "N").join(" → ")}${q.date ? ` · from ${fmtDate(q.date)}` : ""}</p>` : q.msg ? `<p class="fine">${icon("message-square")}${esc(q.msg.slice(0, 120))}</p>` : ""}
        <ol class="track">${steps.map((t, i) => `<li class="${i < s ? "is-done" : ""}${i === s - 1 && s < 3 ? " is-now" : ""}">${t}</li>`).join("")}</ol>
        ${s === 3 ? `<div class="quote-box"><div><span class="fine">Quote from ${esc(a.name)}</span><br><strong>${inr(q.quote)}</strong> <span class="fine">all travellers, incl. GST</span></div>
          ${q.status === "accepted" ? `<span class="fine">${icon("phone")}${esc(a.name.split(" ")[0])} will ${q.contact === "Email" ? "email" : "call"} you to confirm.</span>` : `<div style="display:flex;gap:.5rem"><button class="btn btn--line btn--sm" type="button" data-withdraw>Decline</button><button class="btn btn--ember btn--sm" type="button" data-accept>Accept</button></div>`}
        </div>` : `<div style="display:flex;justify-content:flex-end"><button class="link-btn" type="button" data-withdraw style="color:var(--muted)">${icon("x")}Withdraw</button></div>`}
      </article>`;
    }).join("");
  }
  $("#tickets").addEventListener("click", (e) => {
    const t = e.target.closest("[data-q]");
    if (!t) return;
    const id = t.dataset.q;
    if (e.target.closest("[data-accept]")) {
      Store.update((s) => (s.enquiries.find((q) => q.id === id).status = "accepted"));
      toast("Quote accepted. The agent will contact you to confirm.", { icon: "check" });
    }
    if (e.target.closest("[data-withdraw]")) {
      Store.update((s) => (s.enquiries = s.enquiries.filter((q) => q.id !== id)));
      toast("Enquiry removed", { icon: "trash-2" });
    }
  });
  // advance statuses while the page is open
  setInterval(() => {
    if (!document.hidden && Store.get().enquiries.some((q) => q.status !== "accepted" && Date.now() - q.at < QUOTE_AFTER + 6e3)) renderTickets();
  }, 3000);

  Store.on(() => { renderAttached(); renderTickets(); });

  // ---- prefill from links ----
  const dest = DESTINATIONS.find((d) => d.id === params.get("dest"));
  if (dest) {
    $("#e-msg").value = `Hi, I'd like to visit ${dest.name} for about ${dest.nights} nights. Could you suggest an itinerary and quote?`;
    pick(bestFor(dest.region, dest.id).id);
  } else if (firstStop()) {
    pick(bestFor(firstStop().region, firstStop().id).id);
  }
  renderAgents();
  renderAttached();
  renderTickets();
  hydrate();
})();
