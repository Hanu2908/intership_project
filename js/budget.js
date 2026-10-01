/* Cost model and itinerary generator. Shared by Explore, Plan and the agent form.
   Assumptions are listed in docs/PLAN.md. */
(function () {
  const { DESTINATIONS, LEVELS, MONTHS } = window.PATHIK_DATA;
  const byId = (id) => DESTINATIONS.find((d) => d.id === id);

  const CHILD = 0.6; // children's share of food and activities
  const ROAD = 1.3; // straight line to road distance
  const BUFFER = 0.1;

  function km(a, b) {
    const R = 6371;
    const rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)) * ROAD);
  }

  // islands need a flight whatever the travel style
  function legMode(a, b, level, dist) {
    if (a.region === "Islands" || b.region === "Islands") return { mode: "flight", hours: 2 + dist / 750 };
    if (level === "premium" && dist > 600) return { mode: "flight", hours: 1.5 + dist / 750 };
    if (dist > 450) return { mode: "train", hours: dist / 55 };
    return { mode: "road", hours: dist / 45 };
  }

  function estimate(trip) {
    const level = trip.level || "mid";
    const adults = Math.max(1, +trip.adults || 1);
    const children = Math.max(0, +trip.children || 0);
    const people = adults + children;
    const eaters = adults + children * CHILD;
    const rooms = Math.max(1, Math.ceil(adults / 2));
    const lines = { stay: 0, food: 0, local: 0, act: 0, travel: 0 };
    const legs = [];
    const stops = trip.stops.map((s) => ({ ...s, d: byId(s.id) })).filter((s) => s.d);

    stops.forEach((s, i) => {
      const c = s.d.cost[level];
      const n = Math.max(1, s.nights);
      lines.stay += c.stay * rooms * n;
      lines.food += c.food * eaters * n;
      lines.local += c.local * people * n;
      lines.act += c.act * eaters * n;
      if (i > 0) {
        const prev = stops[i - 1].d;
        const dist = km(prev, s.d);
        const m = legMode(prev, s.d, level, dist);
        const rate = m.mode === "flight" ? Math.max(LEVELS[level].perKm, 5.5) : LEVELS[level].perKm;
        const cost = Math.round(dist * rate * people);
        lines.travel += cost;
        legs.push({ from: prev, to: s.d, km: dist, cost, ...m });
      }
    });

    const sub = Object.values(lines).reduce((a, b) => a + b, 0);
    const buffer = Math.round(sub * BUFFER);
    const total = sub + buffer;
    const nights = stops.reduce((a, s) => a + Math.max(1, s.nights), 0);
    return { lines, buffer, total, perPerson: total / people, people, rooms, nights, legs, stops };
  }

  // Simple per-destination daily cost for cards (2 adults sharing)
  function perDay(d, level = "mid") {
    const c = d.cost[level];
    return Math.round(c.stay / 2 + c.food + c.local + c.act);
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function itinerary(trip) {
    const est = estimate(trip);
    const start = trip.start ? new Date(trip.start + "T00:00:00") : null;
    const days = [];
    const warnings = [];
    let day = 0;

    est.stops.forEach((s, i) => {
      const n = Math.max(1, s.nights);
      const arrive = start ? addDays(start, day) : null;
      if (arrive && !s.d.months.includes(arrive.getMonth() + 1)) {
        const good = s.d.months.map((m) => MONTHS[m - 1]).join(", ");
        warnings.push({ stop: s.d, text: `${s.d.name} in ${MONTHS[arrive.getMonth()]} is outside its best season (${good}).` });
      }
      const leg = i > 0 ? est.legs[i - 1] : null;
      const things = s.d.things.slice();
      for (let k = 0; k < n; k++) {
        const items = [];
        let title;
        if (k === 0) {
          title = i === 0 ? `Arrive in ${s.d.name}` : `${leg.from.name} to ${s.d.name}`;
          if (leg) items.push(`${cap(leg.mode)}, about ${fmtHours(leg.hours)} (${leg.km.toLocaleString("en-IN")} km)`);
          else items.push(s.d.reach.air.split(",")[0]);
          items.push(things.length > 2 && n > 1 ? "Settle in, short walk nearby" : things.shift() || "Settle in");
        } else {
          title = `${s.d.name}, day ${k + 1}`;
          const take = Math.max(1, Math.ceil(things.length / (n - k)));
          items.push(...things.splice(0, take));
          if (!items.length) items.push("Free day. Rest, or revisit a favourite spot");
        }
        days.push({ n: day + 1, date: start ? addDays(start, day) : null, title, items, stop: s.d });
        day++;
      }
    });
    if (days.length) {
      days.push({ n: day + 1, date: start ? addDays(start, day) : null, title: "Head home", items: ["Check out and travel back"], stop: est.stops[est.stops.length - 1].d });
    }
    return { est, days, warnings };
  }

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function fmtHours(h) {
    if (h < 1) return `${Math.round(h * 60)} min`;
    const r = Math.round(h * 2) / 2;
    return `${r} h`;
  }

  const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

  window.Budget = { estimate, itinerary, perDay, km, inr, byId };
})();
