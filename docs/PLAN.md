# Project plan: Pathik

Pathik (पथिक, "wayfarer") is a trip planner for India. One site covers the six problems in [RESEARCH.md](RESEARCH.md): find, learn, plan, budget, enquire, book.

## Tech stack
- HTML, CSS, vanilla JavaScript (no framework).
- Three.js for the hero scene: layered mountain ridges at dusk with birds and drifting dust. Bundled with esbuild into one classic script so the site also opens from `file://`.
- Lucide icons. Only the icons we use are compiled into `js/icons.js`.
- Leaflet with OpenStreetMap data (Esri light grey canvas tiles, no API key needed) for the explore map, the location map in each destination and the planner's route map. Loaded only when a map is on screen.
- Photos from Wikimedia Commons. They show the actual places, the links are stable, and the licences allow reuse with credit.
- Google Fonts: Young Serif (display), Instrument Sans (body), Caveat (handwritten labels).

## Design direction
- **Layout** follows the travel-agency references: full-bleed hero with nav, headline, two CTAs and a search bar; a staggered row of category photo cards; offer cards; testimonial carousel; article cards.
- **Look** follows the "Visite" illustration: dusk violet to peach sky, deep indigo ink, a warm orange accent, a heavy serif for headlines, white outlined buttons on dark.

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#1c1638` | text, footer, dark sections |
| `--violet` | `#4a3a8f` | links, secondary fills |
| `--lilac` | `#b9a8e6` | soft accents on dark |
| `--ember` | `#ef7d42` | primary accent, CTAs |
| `--sun` | `#ffc46b` | highlights, ratings |
| `--paper` | `#f8f4ee` | page background |

## Pages
| Page | Solves | Key interactions |
| --- | --- | --- |
| `index.html` Home | Overview, inspiration | 3D hero, search bar that deep-links into Explore, categories, in-season destination carousel, packages with add-to-cart, testimonial carousel, article reader modal, newsletter form |
| `explore.html` Explore | F1, F2 | Photo slideshow, text search, region, type, month and budget filters synced to the URL, sort, grid or map view, destination detail modal with a location map, add to trip |
| `planner.html` Plan | F3, F4 | Route map, reorder stops, nights stepper, start date, travellers, comfort level, budget breakdown bars, target budget meter, day-by-day plan, season warnings, print, copy summary |
| `packages.html` Book | F6 | Package filters, booking modal (date, travellers), cart drawer, GST line, checkout form with validation, reservation reference |
| `agents.html` Enquire | F5 | Agent filter, enquiry form with trip attached, validation, enquiry tracker with status timeline |

## JavaScript modules
- `js/data.js` destinations, packages, agents, articles, testimonials.
- `js/icons.js` generated Lucide SVG paths and an `icon()` helper.
- `js/store.js` `localStorage` state (trip, cart, enquiries, bookings) with change events.
- `js/ui.js` shared header, cart drawer, trip counter, toasts, modals, destination detail, reveal-on-scroll.
- `js/budget.js` cost model shared by Explore, Plan and the agent form.
- one script per page.
- `src/hero-scene.js` Three.js source, built to `js/hero-scene.js`.

## Cost model (estimates)
- Each destination stores a per-person daily cost at three comfort levels, split into stay, food, local transport and activities.
- Stay is per room (2 people share), so it is divided by the group size, rounded up to rooms.
- Travel between stops uses straight-line distance × 1.3 road factor × a per-km rate for the comfort level.
- A 10% buffer is added for things people forget (tips, entry tickets, SIM, laundry).

## Performance budget
- No render-blocking JS. All scripts use `defer`.
- Hero shows an SVG illustration first; the Three.js bundle loads on idle and fades in. Rendering pauses when the hero is off-screen or the tab is hidden. Reduced-motion users get one static frame.
- Images: `loading="lazy"`, explicit sizes, the smallest standard Commons thumbnail that fits (330 to 1920 px) with a 2x `srcset`, a coloured placeholder if an image fails.
- Leaflet (about 42 KB gzipped) loads on demand.

## Done when
- All five pages work on phone and desktop.
- Forms validate and give feedback; cart, trip and enquiry counters update everywhere.
- Lighthouse performance is good on the home page and nothing blocks first paint.
