/* Packages page: filter, sort, book (modal), cart lives in the shared drawer */
(function () {
  const { $, $$, packageCard, hydrate, reveal, empty, openBooking } = window.UI;
  const { PACKAGES, DESTINATIONS, REGIONS } = window.PATHIK_DATA;
  const st = { region: "", len: "", sort: "price" };
  const regionOf = (p) => DESTINATIONS.find((d) => d.id === p.stops[0]).region;

  $("#pk-region").innerHTML = ["", ...REGIONS].map((r) => `<button class="chip" type="button" data-r="${r}" aria-pressed="${r === st.region}">${r || "Everywhere"}</button>`).join("");

  function render() {
    let list = PACKAGES.filter((p) => (!st.region || regionOf(p) === st.region) && (!st.len || (st.len === "short" ? p.nights <= 5 : p.nights >= 6)));
    const save = (p) => (p.was ? p.was - p.price : 0);
    list.sort({
      price: (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      nights: (a, b) => a.nights - b.nights,
      deal: (a, b) => save(b) - save(a),
    }[st.sort]);
    $("#pk-count").textContent = `${list.length} package${list.length === 1 ? "" : "s"} · prices per adult, before 5% GST`;
    $("#pk-grid").innerHTML = list.length ? list.map(packageCard).join("") : `<div style="grid-column:1/-1">${empty("package-open", "No packages here yet", "Try another region, or build your own trip in the planner and ask an agent to quote it.", `<a class="btn btn--ember btn--sm" href="planner.html">Open planner</a>`)}</div>`;
    reveal($("#pk-grid"));
  }

  $("#pk-region").addEventListener("click", (e) => {
    const b = e.target.closest("[data-r]");
    if (!b) return;
    st.region = b.dataset.r;
    $$("#pk-region .chip").forEach((c) => c.setAttribute("aria-pressed", c === b));
    render();
  });
  $("#pk-len").addEventListener("change", (e) => { st.len = e.target.value; render(); });
  $("#pk-sort").addEventListener("change", (e) => { st.sort = e.target.value; render(); });

  render();
  hydrate();
  const hash = location.hash.slice(1);
  if (PACKAGES.some((p) => p.id === hash)) openBooking(hash);
})();
