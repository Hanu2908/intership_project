/* Pathik data. Costs are 2026 estimates in INR.
   cost[level] = { stay: per room per night (2 share), food / local / act: per person per day } */
(function () {
  /* Photos from Wikimedia Commons. path = commons hash path; w/h = original size. */
  const PHOTOS = {
    jaipur: { path: "4/40/Amber_Fort_Jaipur_01.jpg", w: 5184, h: 3456, by: "Rijin S", lic: "CC BY-SA 4.0", title: "Amer Fort, Jaipur" },
    udaipur: { path: "c/c2/City_Palace_by_lake_Pichola%2C_Udaipur.jpg", w: 2242, h: 1380, by: "tommy", lic: "CC BY-SA 2.0", title: "City Palace on Lake Pichola, Udaipur" },
    jaisalmer: { path: "f/f2/Panoramic_view_of_Jaisalmer_Fort.jpg", w: 4032, h: 1616, by: "Karanchawla30", lic: "CC BY-SA 4.0", title: "Jaisalmer Fort" },
    agra: { path: "b/bd/Taj_Mahal%2C_Agra%2C_India_edit3.jpg", w: 3144, h: 2173, by: "Yann, edited by King of Hearts and Jbarta", lic: "CC BY-SA 3.0", title: "Taj Mahal, Agra" },
    varanasi: { path: "1/1b/Morning_at_Varanasi_ghats.JPG", w: 2157, h: 1618, by: "Ilya Mauter", lic: "CC BY 3.0", title: "Morning on the Varanasi ghats" },
    rishikesh: { path: "3/37/Ganges_at_Rishikesh_from_Lakshman_Jhula.jpg", w: 1306, h: 841, by: "Sudhanshu", lic: "CC BY-SA 4.0", title: "The Ganga at Rishikesh" },
    leh: { path: "8/8b/Pangong_Tso_2.jpg", w: 4327, h: 2093, by: "KennyOMG", lic: "CC BY-SA 4.0", title: "Pangong Tso, Ladakh" },
    amritsar: { path: "4/4d/Hamandir_Sahib_%28Golden_Temple%29.jpg", w: 5184, h: 3456, by: "Oleg Yunakov", lic: "CC BY-SA 3.0", title: "Golden Temple, Amritsar" },
    goa: { path: "f/f4/Palolem_beach%2CGoa_-_panoramio.jpg", w: 4288, h: 2848, by: "Biswajit Majumdar", lic: "CC BY-SA 3.0", title: "Palolem beach, Goa" },
    hampi: { path: "e/e2/Hampi%2C_Vittala_Temple%2C_chariot_%286337304059%29.jpg", w: 4272, h: 2848, by: "Arian Zwegers", lic: "CC BY 2.0", title: "Stone chariot, Vittala temple, Hampi" },
    mysuru: { path: "3/3f/Mysore_Palace_with_Gardens.jpg", w: 2048, h: 1394, by: "Bikashrd", lic: "CC BY-SA 4.0", title: "Mysuru Palace" },
    alleppey: { path: "7/70/Kerala_backwaters%2C_Houseboats_2%2C_India.jpg", w: 4032, h: 2688, by: "Vyacheslav Argenberg", lic: "CC BY 4.0", title: "Houseboats on the Kerala backwaters" },
    munnar: { path: "0/09/View_of_Munnar_Tea_Plantation.jpg", w: 5184, h: 3456, by: "Shameemadhikarath", lic: "CC BY-SA 4.0", title: "Tea estates, Munnar" },
    andaman: { path: "f/f1/Radhanagar_Beach%2C_Havelock_Island%2C_Andaman%2C_India.jpg", w: 4608, h: 3015, by: "Mvbellad", lic: "CC BY-SA 4.0", title: "Radhanagar beach, Havelock" },
    nubra: { path: "8/81/Sand_dunes_in_Nubra_Valley%2C_Ladakh.jpg", w: 4000, h: 3000, by: "Yuvraj Anand", lic: "CC BY-SA 4.0", title: "Sand dunes, Nubra Valley" },
    teahills: { path: "9/92/Munnar_Tea_Gardens.jpg", w: 3648, h: 2056, by: "Ruben Joseph", lic: "CC BY-SA 3.0", title: "Tea gardens near Munnar" },
    thar: { path: "d/de/Camel_rides_in_Jaisalmer%2C_Thar_Desert_15.jpg", w: 4080, h: 1836, by: "Pinakpani", lic: "CC BY 4.0", title: "Camels in the Thar desert" },
    pichola: { path: "1/1a/Udaipur_Lake_Pichola_Sunset.jpg", w: 3888, h: 2090, by: "Pallav.journo", lic: "CC BY-SA 4.0", title: "Sunset over Lake Pichola" },
    spiti: { path: "f/f5/Kee_monastery_Spiti_Valley_%28edited%29.jpg", w: 3181, h: 2370, by: "Kulbhushan Singh Suryawanshi, edited by Aristeas", lic: "CC BY-SA 4.0", title: "Key monastery, Spiti Valley" },
  };
  const BUCKETS = [330, 500, 960, 1280, 1920];
  const BASE = "https://upload.wikimedia.org/wikipedia/commons/";
  // Smallest standard Commons thumbnail that is at least `w` wide
  const img = (key, w = 960) => {
    const p = PHOTOS[key];
    if (!p) return "";
    const b = BUCKETS.find((x) => x >= w) || 1920;
    if (b >= p.w) return BASE + p.path;
    return `${BASE}thumb/${p.path}/${b}px-${p.path.split("/").pop()}`;
  };
  const credit = (key) => {
    const p = PHOTOS[key];
    return p ? { ...p, page: "https://commons.wikimedia.org/wiki/File:" + decodeURIComponent(p.path.split("/").pop()) } : null;
  };

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const TYPES = {
    heritage: "Heritage",
    mountains: "Mountains",
    beaches: "Beaches & islands",
    spiritual: "Spiritual",
    adventure: "Adventure",
    backwaters: "Backwaters & tea",
    desert: "Desert",
  };

  const REGIONS = ["North", "South", "West", "Islands"];

  const LEVELS = {
    budget: { label: "Backpacker", note: "Hostels, sleeper trains, street food", perKm: 2.2 },
    mid: { label: "Comfort", note: "3-star stays, AC chair car, sit-down meals", perKm: 5.5 },
    premium: { label: "Premium", note: "Heritage hotels, flights or private cab", perKm: 12 },
  };

  const DESTINATIONS = [
    {
      id: "jaipur", name: "Jaipur", state: "Rajasthan", region: "North", lat: 26.91, lng: 75.79,
      types: ["heritage"], photo: "jaipur", nights: 3,
      tagline: "Forts on the ridge, bazaars in the old walled city",
      overview: "Rajasthan's capital packs Amer Fort, the City Palace, Jantar Mantar and Hawa Mahal into one city. The old town is laid out on a grid, which makes it easy to cover on foot early in the morning before the heat and traffic build up.",
      months: [10, 11, 12, 1, 2, 3],
      reach: { air: "Jaipur International (JAI), 13 km from the old city", rail: "Jaipur Junction, Vande Bharat and Shatabdi from Delhi in about 4.5 h", road: "5-6 h from Delhi on NH48" },
      things: ["Amer Fort at opening time (8 am)", "Composite ticket covers 8 monuments for 2 days", "Nahargarh at sunset", "Block printing in Bagru village"],
      tips: ["Buy the composite ticket at the first monument you visit.", "Most bazaars in the walled city close on Sunday."],
      watch: ["Anyone offering a deal on gems to 'resell abroad' is running a known scam.", "Auto drivers who offer a cheap day tour usually stop at commission shops."],
      cost: { budget: { stay: 1400, food: 500, local: 300, act: 400 }, mid: { stay: 4200, food: 1100, local: 900, act: 700 }, premium: { stay: 12500, food: 2600, local: 2200, act: 1500 } },
    },
    {
      id: "udaipur", name: "Udaipur", state: "Rajasthan", region: "North", lat: 24.58, lng: 73.71,
      types: ["heritage"], photo: "udaipur", nights: 2,
      tagline: "Lake Pichola, palace walls and rooftop dinners",
      overview: "Udaipur is built around a chain of artificial lakes. The City Palace runs along the east bank of Lake Pichola, and the old town climbs uphill behind it. It is slower than Jaipur and good for two unhurried days.",
      months: [9, 10, 11, 12, 1, 2, 3],
      reach: { air: "Maharana Pratap Airport (UDR), 22 km", rail: "Udaipur City station, overnight trains from Delhi and Jaipur", road: "6-7 h from Jaipur" },
      things: ["City Palace museum", "Sunset boat on Lake Pichola", "Bagore ki Haveli dance show (7 pm)", "Day trip to Kumbhalgarh fort"],
      tips: ["The lake level drops before the monsoon. Boat routes can be shorter in May and June.", "Rooftop restaurants on Lal Ghat have the best palace views."],
      watch: ["Buy boat tickets only at the official jetty counters.", "'Art school' visits often end in a hard sell of miniature paintings."],
      cost: { budget: { stay: 1500, food: 550, local: 300, act: 500 }, mid: { stay: 4800, food: 1200, local: 800, act: 900 }, premium: { stay: 16000, food: 3000, local: 2000, act: 2000 } },
    },
    {
      id: "jaisalmer", name: "Jaisalmer", state: "Rajasthan", region: "North", lat: 26.92, lng: 70.91,
      types: ["desert", "heritage"], photo: "jaisalmer", nights: 2,
      tagline: "A sandstone fort people still live inside",
      overview: "Jaisalmer Fort is one of the few living forts in India, with homes, temples and guesthouses inside its walls. The Thar dunes start about 40 km out at Sam and Khuri, where most visitors spend one night in a desert camp.",
      months: [10, 11, 12, 1, 2],
      reach: { air: "Jaisalmer Airport (JSA) has seasonal flights. Jodhpur (JDH) is 285 km away", rail: "Jaisalmer station, overnight trains from Delhi and Jaipur", road: "5 h from Jodhpur" },
      things: ["Walk the fort lanes at dawn", "Patwon ki Haveli", "Sunset at Sam or Khuri dunes", "Kuldhara abandoned village"],
      tips: ["Khuri is quieter than Sam if you want a calmer desert night.", "Nights in December and January drop close to 5°C. Pack a fleece."],
      watch: ["Camp quality varies a lot. Ask for photos of the actual tent and toilet before paying.", "'Non-touristic' camel safaris sold in town are often the same route at double the price."],
      cost: { budget: { stay: 1200, food: 500, local: 250, act: 900 }, mid: { stay: 3800, food: 1000, local: 700, act: 1800 }, premium: { stay: 11000, food: 2400, local: 1800, act: 3500 } },
    },
    {
      id: "agra", name: "Agra", state: "Uttar Pradesh", region: "North", lat: 27.18, lng: 78.02,
      types: ["heritage"], photo: "agra", nights: 1,
      tagline: "The Taj at sunrise, then Agra Fort before the crowds",
      overview: "Most people do Agra as a day trip from Delhi and regret rushing it. One night lets you see the Taj Mahal at sunrise, Agra Fort in the morning and Mehtab Bagh across the river at sunset.",
      months: [10, 11, 12, 1, 2, 3],
      reach: { air: "Delhi IGI (DEL) is 230 km. Agra Airport (AGR) has a few flights", rail: "Agra Cantt, Gatimaan Express from Delhi in about 1 h 40 min", road: "3-4 h from Delhi on the Yamuna Expressway" },
      things: ["Taj Mahal at sunrise", "Agra Fort", "Itmad-ud-Daulah ('Baby Taj')", "Mehtab Bagh at sunset"],
      tips: ["The Taj Mahal is closed on Fridays.", "Book tickets on the ASI website to skip the ticket queue."],
      watch: ["Touts near the gate claim the Taj is closed and offer a 'better' tour.", "Only hire guides who show an ASI or government guide card."],
      cost: { budget: { stay: 1200, food: 450, local: 300, act: 1300 }, mid: { stay: 3800, food: 1000, local: 800, act: 1500 }, premium: { stay: 14000, food: 2500, local: 2000, act: 2500 } },
    },
    {
      id: "varanasi", name: "Varanasi", state: "Uttar Pradesh", region: "North", lat: 25.32, lng: 83.01,
      types: ["spiritual", "heritage"], photo: "varanasi", nights: 2,
      tagline: "Dawn on the ghats, aarti after dark",
      overview: "Eighty-odd ghats line the west bank of the Ganga. Mornings are for boat rides and the lanes behind Dashashwamedh, evenings for the Ganga aarti. Sarnath, where the Buddha first taught, is 10 km away.",
      months: [10, 11, 12, 1, 2, 3],
      reach: { air: "Lal Bahadur Shastri Airport (VNS), 25 km", rail: "Varanasi Junction, Vande Bharat from Delhi in about 8 h", road: "3 h from Prayagraj" },
      things: ["Sunrise boat from Assi to Manikarnika", "Evening aarti at Dashashwamedh", "Sarnath museum and stupa", "Kachori breakfast in the old lanes"],
      tips: ["Fix the boat price before you board. ₹300-500 per person for a shared hour is normal.", "Ghats flood in August and September. Boat rides may stop."],
      watch: ["At Manikarnika, people ask for 'wood donations' for the cremations. This is a scam.", "Silk shop 'factory visits' are commission stops."],
      cost: { budget: { stay: 1000, food: 400, local: 250, act: 400 }, mid: { stay: 3500, food: 900, local: 700, act: 800 }, premium: { stay: 11000, food: 2200, local: 1800, act: 1800 } },
    },
    {
      id: "rishikesh", name: "Rishikesh", state: "Uttarakhand", region: "North", lat: 30.09, lng: 78.27,
      types: ["spiritual", "adventure", "mountains"], photo: "rishikesh", nights: 3,
      tagline: "Rafting by day, yoga and the river by evening",
      overview: "Rishikesh sits where the Ganga leaves the hills. It is known for yoga schools and ashrams, and for white-water rafting on the stretch above town. Alcohol and meat are not sold in the town.",
      months: [2, 3, 4, 5, 9, 10, 11],
      reach: { air: "Jolly Grant Airport, Dehradun (DED), 20 km", rail: "Yog Nagari Rishikesh, or Haridwar Junction 25 km away", road: "6-7 h from Delhi" },
      things: ["Rafting from Shivpuri (16 km stretch)", "Beatles Ashram", "Aarti at Triveni Ghat", "Neer Garh waterfall hike"],
      tips: ["Rafting stops in the monsoon, usually July to mid-September.", "Laxman Jhula is closed to foot traffic. Use Ram Jhula or the new bridge."],
      watch: ["Raft only with operators who show a valid Uttarakhand tourism licence.", "The river is cold and fast. Don't swim off the ghats."],
      cost: { budget: { stay: 900, food: 450, local: 250, act: 900 }, mid: { stay: 3200, food: 900, local: 600, act: 1500 }, premium: { stay: 12000, food: 2200, local: 1500, act: 3000 } },
    },
    {
      id: "leh", name: "Leh-Ladakh", state: "Ladakh", region: "North", lat: 34.15, lng: 77.58,
      types: ["mountains", "adventure"], photo: "leh", nights: 6,
      tagline: "High passes, monasteries and Pangong's blue",
      overview: "Leh is at 3,500 m, so the first two days are for doing nothing. After that, the classic loop is Nubra Valley over Khardung La and Pangong Tso over Chang La, with monasteries like Thiksey and Hemis closer to town.",
      months: [5, 6, 7, 8, 9],
      reach: { air: "Kushok Bakula Rimpochee Airport (IXL), 4 km", rail: "No railway. Jammu Tawi is the nearest station", road: "Manali-Leh and Srinagar-Leh highways, open about June to October" },
      things: ["Thiksey monastery morning prayer", "Nubra Valley via Khardung La", "Pangong Tso overnight", "Leh Palace and Shanti Stupa"],
      tips: ["Rest 36-48 hours before going above Leh. Altitude sickness is the most common reason trips go wrong.", "Prepaid SIMs from other states do not work in Ladakh. Carry a postpaid SIM."],
      watch: ["You need an Inner Line Permit for Nubra and Pangong. Apply online on the LAHDC portal.", "ATMs outside Leh are rare. Carry cash."],
      cost: { budget: { stay: 1600, food: 600, local: 1200, act: 500 }, mid: { stay: 4500, food: 1200, local: 2500, act: 800 }, premium: { stay: 13000, food: 2800, local: 4500, act: 1500 } },
    },
    {
      id: "amritsar", name: "Amritsar", state: "Punjab", region: "North", lat: 31.63, lng: 74.87,
      types: ["spiritual", "heritage"], photo: "amritsar", nights: 2,
      tagline: "The Golden Temple, langar and the Wagah ceremony",
      overview: "The Golden Temple is open almost all night, and its kitchen serves free meals to tens of thousands of people a day. Jallianwala Bagh is a five minute walk away, and the Attari-Wagah border ceremony is 30 km out.",
      months: [10, 11, 12, 1, 2, 3],
      reach: { air: "Sri Guru Ram Dass Jee International (ATQ), 11 km", rail: "Amritsar Junction, Shatabdi from Delhi in about 6 h", road: "8 h from Delhi" },
      things: ["Golden Temple at 4 am and after dark", "Volunteer in the langar kitchen", "Jallianwala Bagh", "Attari-Wagah retreat ceremony"],
      tips: ["Cover your head and remove shoes inside the temple complex. Free scarves are available.", "Reach Wagah 2 hours before the ceremony. Seats fill fast."],
      watch: ["Touts sell 'VIP seats' at Wagah. Seating is free and first come, first served.", "Taxi prices to Wagah double after 3 pm. Book a shared cab in the morning."],
      cost: { budget: { stay: 1100, food: 300, local: 250, act: 300 }, mid: { stay: 3500, food: 800, local: 700, act: 600 }, premium: { stay: 10000, food: 2000, local: 1600, act: 1200 } },
    },
    {
      id: "goa", name: "Goa", state: "Goa", region: "West", lat: 15.49, lng: 73.83,
      types: ["beaches"], photo: "goa", nights: 4,
      tagline: "Beach shacks up north, quiet coves down south",
      overview: "North Goa (Baga, Anjuna, Vagator) is busy and loud. South Goa (Palolem, Agonda, Cola) is calmer and cleaner. Old Goa's churches and the Latin Quarter in Panjim are worth a day away from the sand.",
      months: [11, 12, 1, 2, 3],
      reach: { air: "Dabolim (GOI) for the south, Mopa (GOX) for the north", rail: "Madgaon or Thivim on the Konkan Railway", road: "10-12 h from Mumbai" },
      things: ["Fontainhas walk in Panjim", "Basilica of Bom Jesus, Old Goa", "Kayaking at Sal backwaters", "Butterfly Beach by boat from Palolem"],
      tips: ["Mopa and Dabolim are 75 km apart. Book the airport closest to where you are staying.", "Prices double over Christmas and New Year. Book stays by October."],
      watch: ["Check the rental scooter's papers and photograph any damage before you ride.", "Ask for the menu price before ordering seafood sold 'by weight'."],
      cost: { budget: { stay: 1500, food: 600, local: 450, act: 500 }, mid: { stay: 5000, food: 1400, local: 900, act: 900 }, premium: { stay: 15000, food: 3200, local: 2200, act: 2000 } },
    },
    {
      id: "hampi", name: "Hampi", state: "Karnataka", region: "South", lat: 15.34, lng: 76.46,
      types: ["heritage", "adventure"], photo: "hampi", nights: 2,
      tagline: "Ruins of Vijayanagara among giant boulders",
      overview: "Hampi was the capital of the Vijayanagara empire. Its temples, bazaars and royal enclosures are spread over 40 sq km of boulder hills along the Tungabhadra. Rent a bicycle or e-rickshaw and give it two full days.",
      months: [10, 11, 12, 1, 2],
      reach: { air: "Jindal Vidyanagar (VDY) 40 km, or Hubli (HBX) 160 km", rail: "Hosapete Junction, 13 km", road: "Overnight bus from Bengaluru, about 7 h" },
      things: ["Virupaksha temple", "Stone chariot at Vittala temple", "Sunset from Matanga hill", "Coracle ride on the Tungabhadra"],
      tips: ["Start by 7 am. By noon the rocks are too hot to climb.", "The Hampi Bazaar side has no alcohol and limited meat."],
      watch: ["Crossing the river after dark is unsafe. Last boats run around 5:30 pm.", "Climbing guides at the bouldering spots are unregulated. Check gear yourself."],
      cost: { budget: { stay: 1000, food: 400, local: 300, act: 300 }, mid: { stay: 3000, food: 800, local: 700, act: 600 }, premium: { stay: 11000, food: 2000, local: 1500, act: 1500 } },
    },
    {
      id: "mysuru", name: "Mysuru", state: "Karnataka", region: "South", lat: 12.3, lng: 76.65,
      types: ["heritage"], photo: "mysuru", nights: 2,
      tagline: "A palace lit by 97,000 bulbs on Sunday nights",
      overview: "Mysuru is a calm royal city with a big palace, Devaraja market and Chamundi Hill. It is a good base for Srirangapatna and the Ranganathittu bird sanctuary. During Dasara in Sept-Oct the whole city is lit up.",
      months: [10, 11, 12, 1, 2, 3],
      reach: { air: "Bengaluru (BLR), 170 km. Mysuru Airport (MYQ) has few flights", rail: "Mysuru Junction, about 2 h from Bengaluru", road: "3 h on the Bengaluru-Mysuru Expressway" },
      things: ["Mysuru Palace", "Devaraja market early morning", "Chamundi Hill steps (1,000 of them)", "Ranganathittu bird sanctuary by boat"],
      tips: ["The palace is lit 7 to 7:45 pm on Sundays and public holidays.", "Dasara books out months ahead. Plan early if you want it."],
      watch: ["Much of the 'pure sandalwood' oil sold near the palace is fake. Buy from the government emporium.", "Photography inside the palace is not allowed."],
      cost: { budget: { stay: 1100, food: 400, local: 300, act: 300 }, mid: { stay: 3400, food: 900, local: 700, act: 600 }, premium: { stay: 10000, food: 2200, local: 1600, act: 1200 } },
    },
    {
      id: "alleppey", name: "Alappuzha", state: "Kerala", region: "South", lat: 9.5, lng: 76.34,
      types: ["backwaters"], photo: "alleppey", nights: 2,
      tagline: "A night on a houseboat in the backwaters",
      overview: "Alappuzha (Alleppey) is the gateway to Kerala's backwaters: canals, paddy fields and lakes below sea level. Most people take an overnight houseboat. Shared ferries and canoes reach the quieter canals for a fraction of the price.",
      months: [8, 9, 10, 11, 12, 1, 2, 3],
      reach: { air: "Cochin International (COK), 85 km", rail: "Alappuzha station", road: "1.5-2 h from Kochi" },
      things: ["Overnight houseboat on Vembanad", "Canoe through the narrow canals", "Government ferry to Kottayam (₹30)", "Nehru Trophy boat race in August"],
      tips: ["Houseboats must anchor by 5:30 pm. The cruising part of an overnight trip is only about 5 hours.", "Ask for a boat with a closed AC bedroom if you visit in April or May."],
      watch: ["Check the boat has a Kerala Tourism classification certificate.", "Agents at the jetty quote 'today only' prices. Book the evening before and compare."],
      cost: { budget: { stay: 1500, food: 500, local: 300, act: 600 }, mid: { stay: 7500, food: 1000, local: 600, act: 900 }, premium: { stay: 18000, food: 2400, local: 1500, act: 1800 } },
    },
    {
      id: "munnar", name: "Munnar", state: "Kerala", region: "South", lat: 10.09, lng: 77.06,
      types: ["backwaters", "mountains"], photo: "munnar", nights: 2,
      tagline: "Tea estates and misty hairpin roads",
      overview: "Munnar sits at 1,600 m in the Western Ghats, surrounded by tea estates. Eravikulam National Park is home to the Nilgiri tahr. The roads are slow, so plan fewer sights per day than you think.",
      months: [9, 10, 11, 12, 1, 2, 3, 4, 5],
      reach: { air: "Cochin International (COK), 110 km", rail: "Aluva, 110 km", road: "4 h from Kochi" },
      things: ["Eravikulam National Park", "Tea factory and museum", "Top Station viewpoint", "Kolukkumalai sunrise jeep"],
      tips: ["Eravikulam closes for the tahr calving season, usually February to March.", "Carry a light jacket. Evenings are 12-15°C most of the year."],
      watch: ["Leeches are common on trails in the monsoon. Wear socks and carry salt.", "Jeep 'packages' to Kolukkumalai vary widely. Agree the rate including waiting time."],
      cost: { budget: { stay: 1200, food: 450, local: 500, act: 400 }, mid: { stay: 3800, food: 950, local: 1100, act: 700 }, premium: { stay: 12000, food: 2300, local: 2200, act: 1400 } },
    },
    {
      id: "andaman", name: "Andaman Islands", state: "Andaman & Nicobar", region: "Islands", lat: 11.62, lng: 92.73,
      types: ["beaches", "adventure"], photo: "andaman", nights: 5,
      tagline: "Reef snorkelling off Havelock and Neil",
      overview: "Flights land in Sri Vijaya Puram (Port Blair). From there, fast ferries reach Swaraj Dweep (Havelock) and Shaheed Dweep (Neil), where the beaches and reefs are. The Cellular Jail light show covers the islands' colonial history.",
      months: [11, 12, 1, 2, 3, 4],
      reach: { air: "Veer Savarkar International (IXZ), Sri Vijaya Puram", rail: "No railway", road: "Private and government ferries between islands, 1.5-2.5 h" },
      things: ["Radhanagar beach at sunset", "Snorkel or dive at Elephant beach", "Natural bridge at Neil", "Cellular Jail light and sound show"],
      tips: ["Book inter-island ferries as soon as your flights are fixed. They sell out in peak season.", "Mobile data is weak on the islands. Download maps offline."],
      watch: ["Carry cash. Card machines on Havelock fail often.", "Only dive with PADI or SSI certified centres."],
      cost: { budget: { stay: 2000, food: 700, local: 700, act: 1200 }, mid: { stay: 6000, food: 1500, local: 1500, act: 2500 }, premium: { stay: 18000, food: 3200, local: 3000, act: 5000 } },
    },
  ];

  const CATEGORIES = [
    { type: "heritage", label: "Heritage trails", photo: "jaipur" },
    { type: "mountains", label: "Mountain escapes", photo: "spiti" },
    { type: "beaches", label: "Beaches & islands", photo: "andaman" },
    { type: "spiritual", label: "River towns", photo: "varanasi" },
    { type: "backwaters", label: "Backwaters & tea", photo: "alleppey" },
    { type: "desert", label: "Desert nights", photo: "thar" },
  ];

  const PACKAGES = [
    {
      id: "pk-rajput", title: "Jaipur and Agra in five nights", stops: ["jaipur", "agra"], nights: 5,
      price: 18900, was: 21500, photo: "agra", agent: "ag-sandstone", level: "mid",
      includes: ["3-star hotels with breakfast", "AC sedan with driver for all transfers", "Licensed guide at Amer Fort and the Taj", "Delhi pickup and drop"],
      excludes: ["Monument tickets (about ₹2,300)", "Lunch and dinner", "Train or flight to Delhi"],
      cancel: "Full refund up to 15 days before. 50% after that.",
    },
    {
      id: "pk-ladakh", title: "Ladakh, Nubra and Pangong", stops: ["leh"], nights: 7,
      price: 32500, photo: "nubra", agent: "ag-highpass", level: "mid",
      includes: ["Guesthouses in Leh, camps at Nubra and Pangong", "Breakfast and dinner daily", "Innova with driver for the whole loop", "Inner Line Permits and oxygen cylinder in car"],
      excludes: ["Flights to Leh", "Lunch", "Monastery entry fees"],
      cancel: "Full refund up to 21 days before. 25% after that.",
    },
    {
      id: "pk-kerala", title: "Kerala backwaters and tea hills", stops: ["munnar", "alleppey"], nights: 5,
      price: 24800, was: 27900, photo: "teahills", agent: "ag-kayal", level: "mid",
      includes: ["3 nights in Munnar, 1 night houseboat, 1 night Alappuzha", "All meals on the houseboat", "Kochi airport transfers", "Eravikulam entry"],
      excludes: ["Flights to Kochi", "Lunch outside the houseboat", "Ayurveda treatments"],
      cancel: "Full refund up to 10 days before. Houseboat deposit is non-refundable.",
    },
    {
      id: "pk-goa", title: "A slow week in South Goa", stops: ["goa"], nights: 6,
      price: 16400, photo: "goa", agent: "ag-konkan", level: "budget",
      includes: ["Beach huts at Agonda and Palolem", "Breakfast daily", "Scooter for 6 days with helmet", "Sal backwater kayak trip"],
      excludes: ["Train or flight to Goa", "Fuel", "Lunch and dinner"],
      cancel: "Free cancellation up to 7 days before.",
    },
    {
      id: "pk-river", title: "Varanasi to Rishikesh by rail", stops: ["varanasi", "rishikesh"], nights: 6,
      price: 19900, was: 22400, photo: "rishikesh", agent: "ag-ghat", level: "mid",
      includes: ["Riverside hotels with breakfast", "AC 2-tier train Varanasi to Haridwar", "Sunrise boat and aarti seating in Varanasi", "16 km rafting trip in Rishikesh"],
      excludes: ["Travel to Varanasi", "Lunch and dinner", "Yoga classes"],
      cancel: "Full refund up to 14 days before. 50% after that.",
    },
    {
      id: "pk-andaman", title: "Havelock and Neil islands", stops: ["andaman"], nights: 5,
      price: 38500, photo: "andaman", agent: "ag-reef", level: "mid",
      includes: ["Beach resorts on Havelock and Neil", "All inter-island ferries", "One guided shore dive at Elephant beach", "Airport and jetty transfers"],
      excludes: ["Flights to Sri Vijaya Puram", "Lunch and dinner", "Extra dives"],
      cancel: "Full refund up to 21 days before. Ferry tickets are non-refundable after booking.",
    },
    {
      id: "pk-deccan", title: "Hampi and Mysuru", stops: ["hampi", "mysuru"], nights: 5,
      price: 17200, photo: "hampi", agent: "ag-deccan", level: "budget",
      includes: ["Homestays with breakfast", "Overnight sleeper bus Bengaluru to Hampi", "E-rickshaw with guide for one day in Hampi", "Mysuru palace entry"],
      excludes: ["Return to Bengaluru", "Lunch and dinner", "Coracle ride"],
      cancel: "Full refund up to 7 days before.",
    },
    {
      id: "pk-desert", title: "Udaipur lakes to Jaisalmer dunes", stops: ["udaipur", "jaisalmer"], nights: 7,
      price: 29900, photo: "thar", agent: "ag-sandstone", level: "premium",
      includes: ["Heritage hotels in Udaipur and Jaisalmer", "One night in a Khuri desert camp", "Private car with driver", "Lake Pichola sunset boat"],
      excludes: ["Flights", "Lunch", "Camel ride"],
      cancel: "Full refund up to 21 days before. 50% after that.",
    },
  ];

  /* Sample agents for the demo. Registration numbers are illustrative. */
  const AGENTS = [
    { id: "ag-sandstone", covers: ["jaipur", "udaipur", "jaisalmer", "agra"], name: "Sandstone Trails", city: "Jaipur", regions: ["North"], speciality: "Rajasthan forts and desert camps", reply: 25, rating: 4.8, reviews: 412, langs: ["Hindi", "English", "French"], reg: "RJ-TA-0412", since: 2011 },
    { id: "ag-highpass", covers: ["leh"], name: "High Pass Expeditions", city: "Leh", regions: ["North"], speciality: "Ladakh road trips and permits", reply: 40, rating: 4.9, reviews: 268, langs: ["Hindi", "English", "Ladakhi"], reg: "LA-TO-0087", since: 2014 },
    { id: "ag-kayal", covers: ["alleppey", "munnar"], name: "Kayal Holidays", city: "Kochi", regions: ["South"], speciality: "Houseboats, Munnar, Ayurveda stays", reply: 15, rating: 4.7, reviews: 530, langs: ["Malayalam", "English", "Hindi"], reg: "KL-DOT-2231", since: 2009 },
    { id: "ag-konkan", covers: ["goa"], name: "Konkan Coast Co.", city: "Panaji", regions: ["West"], speciality: "Goa stays, scooters, slow travel", reply: 30, rating: 4.6, reviews: 189, langs: ["Konkani", "English", "Hindi"], reg: "GA-TA-1190", since: 2016 },
    { id: "ag-ghat", covers: ["varanasi", "rishikesh", "amritsar", "agra"], name: "Ghat to Ganga Tours", city: "Varanasi", regions: ["North"], speciality: "River towns, rail journeys, pilgrimages", reply: 45, rating: 4.7, reviews: 301, langs: ["Hindi", "English"], reg: "UP-TA-0763", since: 2012 },
    { id: "ag-reef", covers: ["andaman"], name: "Reef & Ferry Andaman", city: "Sri Vijaya Puram", regions: ["Islands"], speciality: "Island hopping and dive trips", reply: 60, rating: 4.8, reviews: 154, langs: ["Hindi", "English", "Bengali"], reg: "AN-TO-0034", since: 2015 },
    { id: "ag-deccan", covers: ["hampi", "mysuru"], name: "Deccan Plateau Travel", city: "Bengaluru", regions: ["South"], speciality: "Karnataka heritage on a budget", reply: 20, rating: 4.5, reviews: 97, langs: ["Kannada", "English", "Hindi", "Tamil"], reg: "KA-TA-3305", since: 2018 },
  ];

  const TESTIMONIALS = [
    { name: "Ananya R.", from: "Pune", trip: "Ladakh, 7 nights", text: "The budget page said ₹41k each. We spent ₹43k, and the extra was a pashmina I didn't need. I've never had an estimate that close before.", rating: 5 },
    { name: "Farhan & Zoya", from: "Hyderabad", trip: "Kerala, 5 nights", text: "We sent one enquiry with our trip attached instead of explaining it on WhatsApp to five agents. Kayal replied in twenty minutes with a quote that matched.", rating: 5 },
    { name: "Meera Iyer", from: "Chennai", trip: "Varanasi and Rishikesh", text: "The season warning stopped me from booking rafting in August. I moved the trip to October and the river was open.", rating: 4 },
    { name: "Rohit Sharma", from: "Indore", trip: "Jaipur and Agra", text: "I liked that the package listed what wasn't included. Monument tickets came to ₹2,300 like it said. No surprises at the gate.", rating: 5 },
    { name: "Priya & family", from: "Kolkata", trip: "Andaman, 5 nights", text: "Four of us, two kids. Rooms were split properly in the budget, so the per-person cost actually made sense for a family.", rating: 4 },
  ];

  const ARTICLES = [
    {
      id: "scams", title: "Six tourist scams you'll meet in India, and what to say", date: "2026-09-12", read: 5, photo: "agra", tag: "Safety",
      body: [
        "Most scams in Indian tourist towns are not dangerous. They cost you money and an afternoon. They also follow scripts, so once you know the script you can step out of it politely.",
        "**'The monument is closed today.'** A friendly stranger near the gate says the Taj, the fort or the temple is shut, and offers to take you somewhere else. Walk to the gate and check. The only regular closure is the Taj Mahal on Fridays.",
        "**Gems to resell abroad.** In Jaipur and Agra, someone suggests you carry gems home and sell them for a profit. The gems are worthless and the buyer never appears. There is no version of this that works.",
        "**Wood donation at the cremation ghat.** At Manikarnika in Varanasi a man explains the cremations and then asks for money 'for wood for the poor'. Cremations are paid for by families. Say no and keep walking.",
        "**Commission stops.** An auto driver offers a full-day tour for ₹200 and then spends half of it at textile and gem shops. Agree the stops in advance and say you won't shop.",
        "**VIP seats at Wagah.** Seating at the Attari-Wagah ceremony is free and first come, first served. Arrive two hours early instead.",
        "**Unlicensed rafting and guides.** Ask to see a state tourism licence or ASI guide card. Real ones carry it.",
      ],
    },
    {
      id: "altitude", title: "Ladakh's first 48 hours: how to not get altitude sick", date: "2026-08-03", read: 4, photo: "leh", tag: "Health",
      body: [
        "Leh is at 3,500 m. If you fly in from the plains, your body has had about an hour to adjust to air with roughly a third less oxygen. Acute mountain sickness (AMS) is common and usually mild, but it can end a trip.",
        "**Day one: do nothing.** Check in, drink water, sleep. Skip the market walk. Headache and poor sleep on the first night are normal.",
        "**Day two: short and slow.** Walk to Shanti Stupa or the old town. No alcohol. If your headache gets worse, stay put.",
        "**Day three onwards: go higher.** Khardung La (5,359 m) and Chang La (5,360 m) are passes, not places to stop for long. Twenty minutes for photos, then keep moving down.",
        "Talk to a doctor before the trip about acetazolamide (Diamox). It helps some people but is not a substitute for rest.",
        "Warning signs that mean you go down: confusion, breathlessness at rest, a wet cough, or not being able to walk in a straight line. Leh's SNM Hospital treats AMS daily.",
      ],
    },
    {
      id: "budget", title: "Where your trip budget actually goes", date: "2026-07-21", read: 3, photo: "goa", tag: "Money",
      body: [
        "When people go over budget, it's rarely because of the hotel. The room was booked and paid. The overrun is in the small things nobody adds up.",
        "**Getting between places.** A 600 km leg can cost ₹700 in a sleeper or ₹7,000 by flight. Decide this first, because it changes everything else.",
        "**Entry tickets.** Indian monuments usually cost ₹35-50 for Indian citizens and far more for foreigners. Add camera fees, guides and parking and a heritage day can reach ₹1,500 per person.",
        "**Local transport.** Autos, cabs to viewpoints, waiting charges. In hill stations this can cost more than food.",
        "**The forgotten 10%.** Tips, water, a SIM card, laundry, the extra night when a road closes. Our planner adds a 10% buffer for these, and most people use it.",
        "Rule of thumb: decide your travel style once (backpacker, comfort or premium) and stick with it for transport, rooms and food. Mixing a premium hotel with backpacker transport rarely saves money.",
      ],
    },
  ];

  window.PATHIK_DATA = { img, credit, PHOTOS, MONTHS, TYPES, REGIONS, LEVELS, DESTINATIONS, CATEGORIES, PACKAGES, AGENTS, TESTIMONIALS, ARTICLES };
})();
