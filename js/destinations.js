/* Destination dataset — shared across Home and Services pages.
   'code' mirrors the nearest airport code, used as the postmark label on each stamp card. */
const DESTINATIONS = [
  { code: "JAI", name: "Jaipur", region: "North", state: "Rajasthan", tagline: "The Pink City's forts at golden hour", days: "3–4 days", budget: "Mid-range", tags: ["heritage","city"], featured: true, image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&h=400&fit=crop&auto=format" },
  { code: "UDR", name: "Udaipur", region: "North", state: "Rajasthan", tagline: "Lake palaces and marble ghats", days: "2–3 days", budget: "Premium", tags: ["heritage","romantic"], image: "https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?w=600&h=400&fit=crop&auto=format" },
  { code: "JSA", name: "Jaisalmer", region: "North", state: "Rajasthan", tagline: "Golden dunes and a living sandstone fort", days: "2–3 days", budget: "Mid-range", tags: ["desert","heritage"], image: "https://images.unsplash.com/photo-1622712376732-f4424a95160f?w=600&h=400&fit=crop&auto=format" },
  { code: "AGR", name: "Agra", region: "North", state: "Uttar Pradesh", tagline: "Sunrise at the Taj Mahal", days: "1–2 days", budget: "Budget", tags: ["heritage","icon"], image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&h=400&fit=crop&auto=format" },
  { code: "VNS", name: "Varanasi", region: "North", state: "Uttar Pradesh", tagline: "Dawn boat rides along the ghats", days: "2–3 days", budget: "Budget", tags: ["spiritual","river"], featured: true, image: "https://images.unsplash.com/photo-1627938823193-fd13c1c867dd?w=600&h=400&fit=crop&auto=format" },
  { code: "DED", name: "Rishikesh", region: "North", state: "Uttarakhand", tagline: "Yoga, rapids, and the Ganga aarti", days: "3–4 days", budget: "Budget", tags: ["adventure","spiritual"], image: "https://images.unsplash.com/photo-1718528565878-7fd7c72f5196?w=600&h=400&fit=crop&auto=format" },
  { code: "IXL", name: "Leh–Ladakh", region: "North", state: "Ladakh", tagline: "High-altitude passes and monasteries", days: "6–7 days", budget: "Premium", tags: ["mountain","adventure"], featured: true, image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&h=400&fit=crop&auto=format" },
  { code: "SXR", name: "Srinagar", region: "North", state: "Kashmir", tagline: "Houseboats on Dal Lake", days: "4–5 days", budget: "Premium", tags: ["mountain","romantic"], image: "https://plus.unsplash.com/premium_photo-1697729690458-2d64ca777c04?w=600&h=400&fit=crop&auto=format" },
  { code: "ATQ", name: "Amritsar", region: "North", state: "Punjab", tagline: "Golden Temple langar at dusk", days: "1–2 days", budget: "Budget", tags: ["spiritual","heritage"], image: "https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=600&h=400&fit=crop&auto=format" },
  { code: "IXB", name: "Darjeeling", region: "East", state: "West Bengal", tagline: "Tea gardens and toy-train switchbacks", days: "3–4 days", budget: "Mid-range", tags: ["mountain","tea"], image: "https://plus.unsplash.com/premium_photo-1697729733902-f8c92710db07?w=600&h=400&fit=crop&auto=format" },
  { code: "GOI", name: "Goa", region: "West", state: "Goa", tagline: "Beach shacks and Portuguese lanes", days: "3–5 days", budget: "Mid-range", tags: ["beach","nightlife"], featured: true, image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&h=400&fit=crop&auto=format" },
  { code: "HBX", name: "Hampi", region: "South", state: "Karnataka", tagline: "Boulder-strewn ruins of Vijayanagara", days: "2–3 days", budget: "Budget", tags: ["heritage","ruins"], image: "https://images.unsplash.com/photo-1722934804353-0d9f6a55ab5e?w=600&h=400&fit=crop&auto=format" },
  { code: "MYQ", name: "Mysore", region: "South", state: "Karnataka", tagline: "Palace lights on a Sunday evening", days: "1–2 days", budget: "Budget", tags: ["heritage","city"], image: "https://images.unsplash.com/photo-1579429223126-29d2f6f9c1ac?w=600&h=400&fit=crop&auto=format" },
  { code: "COK", name: "Alleppey", region: "South", state: "Kerala", tagline: "Houseboats drifting the backwaters", days: "2–3 days", budget: "Premium", tags: ["backwater","romantic"], image: "https://images.unsplash.com/photo-1593417033942-bcdf26b74700?w=600&h=400&fit=crop&auto=format" },
  { code: "COK", name: "Munnar", region: "South", state: "Kerala", tagline: "Mist over rolling tea estates", days: "2–3 days", budget: "Mid-range", tags: ["mountain","tea"], image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop&auto=format" },
  { code: "IXZ", name: "Andaman Islands", region: "Island", state: "Andaman", tagline: "Reef diving off Havelock", days: "5–6 days", budget: "Premium", tags: ["beach","diving"], featured: true, image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop&auto=format" },
];

/* Hero collage images — curated high-res Unsplash */
const HERO_IMAGES = [
  { src: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&h=1000&fit=crop&auto=format", alt: "Jaipur fort at golden hour" },
  { src: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&h=1000&fit=crop&auto=format", alt: "Varanasi ghats at dawn" },
  { src: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&h=1000&fit=crop&auto=format", alt: "Leh-Ladakh mountain passes" },
];

/* Curated multi-stop routes */
const ROUTES = [
  {
    name: "Rajasthan Royal Circuit",
    stops: ["Jaipur", "Udaipur", "Jaisalmer"],
    duration: "8–10 days",
    image: "https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?w=1200&h=600&fit=crop&auto=format",
    tagline: "Forts, lakes, and golden dunes"
  },
  {
    name: "Kerala Backwater Trail",
    stops: ["Alleppey", "Munnar"],
    duration: "5–6 days",
    image: "https://images.unsplash.com/photo-1593417033942-bcdf26b74700?w=1200&h=600&fit=crop&auto=format",
    tagline: "Houseboats and misty tea estates"
  },
  {
    name: "Spiritual North",
    stops: ["Varanasi", "Rishikesh", "Amritsar"],
    duration: "7–8 days",
    image: "https://images.unsplash.com/photo-1627938823193-fd13c1c867dd?w=1200&h=600&fit=crop&auto=format",
    tagline: "Ghats, aartis, and the Golden Temple"
  },
  {
    name: "Himalayan Edge",
    stops: ["Leh–Ladakh", "Srinagar"],
    duration: "9–11 days",
    image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&h=600&fit=crop&auto=format",
    tagline: "High passes and houseboats"
  },
  {
    name: "Heritage Triangle",
    stops: ["Agra", "Jaipur", "Varanasi"],
    duration: "6–7 days",
    image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200&h=600&fit=crop&auto=format",
    tagline: "Taj sunrise to Ganga aarti"
  }
];
