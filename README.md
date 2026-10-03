# Pathik

A trip planner for India, built for our internship project on tourism. It covers the steps travellers struggle with: finding a destination, learning about it, making an itinerary, planning the budget, enquiring with an agent and booking.

- Research (problems, stakeholders, requirements): [docs/RESEARCH.md](docs/RESEARCH.md)
- Project plan (design, pages, cost model): [docs/PLAN.md](docs/PLAN.md)

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | 3D hero (Three.js), destination search, categories, in-season carousel, packages, reviews, travel notes |
| `explore.html` | Photo slideshow, filter 23 destinations by month, region, type and daily budget, grid or map view; detail view with season, routes, costs, tips, scams and a location map |
| `season.html` | Season map: turn a month dial and set a daily budget; a 3D map of India lights up the places that are in season, affordable and not packed, suggests quieter alternatives and draws your trip route |
| `planner.html` | Reorder stops, set nights, travellers and style; route map, live budget breakdown, target budget meter, dated day-by-day plan, print, copy and share link |
| `packages.html` | Fixed-price packages, booking modal, cart with GST, reserve with 20% |
| `agents.html` | Registered agents, enquiry form with your trip attached, status tracker |

Everything runs in the browser. Trip, cart, bookings and enquiries are saved in `localStorage`. A trip can be shared as a link (`planner.html?trip=...`); opening it loads the same stops, nights, travellers and style.

## Run it

Open `index.html` directly, or serve the folder:

```bash
npm run serve   # python3 -m http.server 5173
```

## Edit it

HTML pages are generated from `src/pages` and `src/partials` (shared header and footer). The Three.js scenes live in `src/hero-scene.js` and `src/season-scene.js`. After changing anything in `src/`, or adding a new icon name, rebuild:

```bash
npm install
npm run build
```

`js/*.js` (except `icons.js`, `hero-scene.js`, `season-scene.js` and `india-map.js`) and `css/main.css` are edited directly. `js/india-map.js` is made by `node scripts/india-map.mjs <india-composite.geojson>`.

## Stack

HTML, CSS, vanilla JavaScript, [Three.js](https://threejs.org) r169, [Leaflet](https://leafletjs.com) 1.9 drawing India's official outline (no map tiles), [Lucide](https://lucide.dev) icons, Google Fonts (Young Serif, Instrument Sans, Caveat). Photos from Wikimedia Commons under CC licences; the site lists every author and licence under "Photo credits" in the footer.

Maps show India's boundary as published by the Survey of India, simplified from [DataMeet's India boundaries](https://github.com/datameet/maps) (CC BY 4.0). We draw the outline ourselves instead of using world map tiles, which show international boundary claims.

Costs and crowd levels are 2026 estimates. Agents, reviews and replies are sample data for the demo.
