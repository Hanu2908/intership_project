# Pathik

A trip planner for India, built for our internship project on tourism. It covers the steps travellers struggle with: finding a destination, learning about it, making an itinerary, planning the budget, enquiring with an agent and booking.

- Research (problems, stakeholders, requirements): [docs/RESEARCH.md](docs/RESEARCH.md)
- Project plan (design, pages, cost model): [docs/PLAN.md](docs/PLAN.md)

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | 3D hero (Three.js), destination search, categories, packages, reviews, travel notes |
| `explore.html` | Filter 14 destinations by month, region, type and daily budget; detail view with season, routes, costs, tips and scams |
| `planner.html` | Reorder stops, set nights, travellers and style; live budget breakdown, target budget meter, dated day-by-day plan, print and copy |
| `packages.html` | Fixed-price packages, booking modal, cart with GST, reserve with 20% |
| `agents.html` | Registered agents, enquiry form with your trip attached, status tracker |

Everything runs in the browser. Trip, cart, bookings and enquiries are saved in `localStorage`.

## Run it

Open `index.html` directly, or serve the folder:

```bash
npm run serve   # python3 -m http.server 5173
```

## Edit it

HTML pages are generated from `src/pages` and `src/partials` (shared header and footer). The Three.js scene lives in `src/hero-scene.js`. After changing anything in `src/`, or adding a new icon name, rebuild:

```bash
npm install
npm run build
```

`js/*.js` (except `icons.js` and `hero-scene.js`) and `css/main.css` are edited directly.

## Stack

HTML, CSS, vanilla JavaScript, [Three.js](https://threejs.org) r169, [Lucide](https://lucide.dev) icons, Google Fonts (Young Serif, Instrument Sans, Caveat). Photos from Unsplash.

Costs are 2026 estimates. Agents, reviews and replies are sample data for the demo.
