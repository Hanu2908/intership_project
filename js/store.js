/* Pathik store: one object in localStorage, shared by every page.
   Store.update(fn) mutates a draft, saves it and notifies listeners. */
(function () {
  const KEY = "pathik:v1";
  const listeners = new Set();

  const fresh = () => ({
    trip: { stops: [], start: "", adults: 2, children: 0, level: "mid", target: 0 },
    cart: [],
    enquiries: [],
    bookings: [],
  });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const data = JSON.parse(raw);
      const base = fresh();
      return { ...base, ...data, trip: { ...base.trip, ...(data.trip || {}) } };
    } catch (e) {
      return fresh();
    }
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* private mode or full storage: keep working in memory */
    }
  }

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  const Store = {
    get: () => state,
    update(fn) {
      fn(state);
      save();
      emit();
    },
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    uid(prefix) {
      const s = Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 5);
      return `${prefix}-${s.toUpperCase()}`;
    },

    // trip helpers
    inTrip: (id) => state.trip.stops.some((s) => s.id === id),
    toggleStop(id) {
      const D = window.PATHIK_DATA.DESTINATIONS.find((d) => d.id === id);
      let added = false;
      Store.update((s) => {
        const i = s.trip.stops.findIndex((x) => x.id === id);
        if (i >= 0) s.trip.stops.splice(i, 1);
        else {
          s.trip.stops.push({ id, nights: D ? D.nights : 2 });
          added = true;
        }
      });
      return added;
    },

    // cart helpers
    cartCount: () => state.cart.length,
  };

  // keep tabs in sync
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = load();
      emit();
    }
  });

  window.Store = Store;
})();
