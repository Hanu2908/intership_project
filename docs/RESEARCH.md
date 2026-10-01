# Research: why planning a trip is still hard

Topic: tourists and tourism. Focus market: domestic and inbound travellers planning trips inside India.

## 1. What the numbers say

| Finding | Source |
| --- | --- |
| Travellers view 141 pages of travel content in the 45 days before booking (277 for US travellers) and spend about 303 minutes on it. | Expedia Group and Luth Research, "Path to purchase" study |
| An older Expedia Media Solutions study put the count at 38 different websites before booking. | Expedia Media Solutions |
| 44% of travellers worry about overspending. 51% pick a destination based on price. Planning itself (23%) and packing (26%) are named pain points too. | Go City, Trip Planning Consumer Survey 2024 |
| The average American spends close to 18 hours researching, comparing prices, finding packages and booking. | Go City, 2024 |
| About 1 in 5 travellers run into out-of-date information while planning. | TripAdvisor data, summarised by K. Sandburg |
| Indian travel decisions happen on WhatsApp. A message to a small agency can sit unread for 3 to 4 hours, and the traveller books elsewhere. | GreenTick, WhatsApp API guide for Indian tour operators (2026) |
| The Ministry of Tourism receives complaints about deficient services, overcharging and misleading packages from agents. | Summarised in GuavaTrips, "15 travel agency red flags" |

## 2. Problems, in the order a traveller meets them

1. **Finding a destination.** Inspiration is spread across Instagram, blogs and OTAs. None of them answer "where can I go in December for under ₹4,000 a day?" in one place.
2. **Knowing about the place.** Best season, how to get there, what a day actually costs, which scams to expect. This lives in forum threads and is often stale.
3. **Making an itinerary.** People copy plans from blogs, then discover that the stops are 900 km apart or that the hill station is shut by snow that month.
4. **Planning the budget.** Package prices hide transfers, entry fees and GST. "Planned ₹40K, spent ₹60K" is a common story. Nobody shows a breakdown before you commit.
5. **Enquiring with agents.** Enquiries go out on WhatsApp or a contact form and disappear. The traveller re-types the same trip details to five agents and cannot tell which ones are registered.
6. **Booking.** Prices are "on request", inclusions are vague, and many agents want full payment upfront before confirming anything.

## 3. Stakeholders

| Stakeholder | What they want | What hurts today |
| --- | --- | --- |
| Independent traveller (students, young professionals) | Cheap, flexible trips, honest costs | Hidden costs, too many tabs, stale info |
| Family traveller | Safe, comfortable, everything arranged | Hard to compare packages, unclear inclusions |
| First-time or foreign tourist | Trustworthy local help | Scams, unregistered agents, language |
| Travel agent / tour operator | Qualified leads with complete details | Vague enquiries, slow back-and-forth, lost leads |
| Hotels, homestays, transport providers | Steady bookings across the season | Peak-season crowding, empty off-season |
| Local communities and guides | Fair income from tourism | Middlemen take most of the margin |
| State tourism boards / Ministry of Tourism | Spread tourists across regions and seasons, fewer complaints | Overcrowded icons, under-visited places |
| Our team (site owners) | A working product that shows the full journey | Scope: static site, no backend |

## 4. Requirements

### Functional
- **F1 Discover.** Search destinations by name, region, trip type, month and daily budget. Results update as filters change and the URL keeps the filter state.
- **F2 Learn.** Each destination has: best months, how to reach, cost per day at three comfort levels, top things to do, local tips, and scams or watch-outs.
- **F3 Itinerary.** Add destinations to a trip, reorder them, set nights per stop, pick a start date and get a dated day-by-day plan. Warn when a stop is visited outside its season.
- **F4 Budget.** Live cost breakdown (stay, food, local transport, activities, travel between stops, buffer) for the chosen comfort level and group size. Compare against a target budget.
- **F5 Enquire.** Pick a verified agent, send one enquiry with the trip attached, and track its status (sent, seen, quote ready) without re-typing anything.
- **F6 Book.** Fixed-price packages with every inclusion, exclusion and the cancellation rule listed. Cart with traveller counts, GST shown as a line item, and a reservation that only takes a token amount until the agent confirms.

### Non-functional
- Works without a server. State lives in `localStorage`.
- Fast on a mid-range phone: no framework, 3D scene loaded only after the page is usable, images lazy-loaded.
- Accessible: keyboard reachable, visible focus, labelled form fields, respects `prefers-reduced-motion`.
- Responsive from 360 px phones to desktop.
- Open-source libraries only (Three.js, Lucide icons).

## 5. What we will not build
- Real payments or real agent accounts. The booking flow stops at a reservation reference.
- Live prices. All costs are estimates, labelled as such on the site.
