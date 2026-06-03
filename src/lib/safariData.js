// ─────────────────────────────────────────────────────────────────────────────
//  Safari Data Library
//  Comprehensive reference data for East African safaris:
//  • National Parks (with entry fees per category)
//  • Accommodations (lodges, camps, resorts with seasonal pricing)
//  • Activities (game drives, treks, cultural, water, aerial, etc.)
//
//  All prices in USD. Data is reference-only — verify with suppliers/parks
//  before quoting to guests.
// ─────────────────────────────────────────────────────────────────────────────

export const COUNTRIES = ['All', 'Tanzania', 'Kenya', 'Uganda', 'Rwanda', 'Zanzibar'];

export const REGIONS = [
  'Serengeti', 'Ngorongoro', 'Tarangire', 'Lake Manyara', 'Arusha',
  'Ruaha', 'Nyerere / Selous', 'Katavi', 'Mahale', 'Gombe',
  'Kilimanjaro', 'Mt Meru', 'Mikumi', 'Udzungwa',
  'Masai Mara', 'Amboseli', 'Tsavo', 'Samburu', 'Lake Nakuru', 'Meru', 'Aberdare', 'Mt Kenya', 'Laikipia',
  'Queen Elizabeth', 'Murchison Falls', 'Bwindi', 'Kibale', 'Mgahinga', 'Kidepo',
  'Volcanoes', 'Akagera', 'Nyungwe',
  'Zanzibar Stone Town', 'Zanzibar North', 'Zanzibar East', 'Pemba',
];

export const ACCOMMODATION_CATEGORIES = [
  { id: 'luxury',       label: 'Luxury' },
  { id: 'mid_range',    label: 'Mid-Range' },
  { id: 'budget',       label: 'Budget' },
  { id: 'beach_resort', label: 'Beach Resort' },
];

export const ACTIVITY_CATEGORIES = [
  { id: 'game_drive', label: 'Game Drive' },
  { id: 'trekking',   label: 'Trekking' },
  { id: 'cultural',   label: 'Cultural' },
  { id: 'water',      label: 'Water' },
  { id: 'aerial',     label: 'Aerial' },
  { id: 'walking',    label: 'Walking Safari' },
  { id: 'specialist', label: 'Specialist' },
  { id: 'dining',     label: 'Dining' },
];

// ─── Image helper ────────────────────────────────────────────────────────────
const img = (id, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&auto=format&fit=crop`;

// ─── NATIONAL PARKS ──────────────────────────────────────────────────────────

export const NATIONAL_PARKS = [
  // ─── Tanzania ────────────────────────────────────────────────────────────
  {
    id: 'serengeti',
    name: 'Serengeti National Park',
    country: 'Tanzania',
    region: 'Serengeti',
    area_km2: 14750,
    best_time: 'Jun–Oct, Jan–Feb (calving)',
    image: img('1547471080-7cc2caa01a7e'),
    description: 'Home to the Great Migration — over two million wildebeest, zebra, and gazelle in an endless pursuit of rain. The Serengeti is one of the most biodiverse places on earth with the Big Five and exceptional predator density.',
    highlights: [
      'The Great Wildebeest Migration',
      'Big Five game viewing year-round',
      'Hot-air balloon safaris over the plains',
      'Exceptional big-cat sightings (lion, leopard, cheetah)',
      'Kopjes — ancient granite outcrops',
    ],
    tags: ['Big Five', 'Migration', 'UNESCO', 'Balloon Safari'],
    fees: {
      non_resident_adult: 83.78,
      non_resident_child: 23.60,
      resident_adult: 11.80,
      resident_child: 2.36,
      vehicle_fee: 41.30,
      extra_fees: [
        { name: 'Concession Fee (per person / night)', amount: 60 },
        { name: 'Camping Fee (public campsite)', amount: 41.30 },
        { name: 'Balloon Safari Fee', amount: 599 },
      ],
    },
  },
  {
    id: 'ngorongoro',
    name: 'Ngorongoro Conservation Area',
    country: 'Tanzania',
    region: 'Ngorongoro',
    area_km2: 8292,
    best_time: 'Jun–Oct (dry), year-round',
    image: img('1516426122078-c23e76319801'),
    description: 'The world\'s largest unbroken volcanic caldera — a natural amphitheatre teeming with wildlife. Home to black rhino, dense predator populations, and the Maasai people who share this UNESCO World Heritage site.',
    highlights: [
      'Ngorongoro Crater — natural wildlife sanctuary',
      'Reliable black rhino sightings',
      'Olduvai Gorge — cradle of mankind',
      'Maasai cultural interaction',
      'Empakaai & Olmoti craters for hiking',
    ],
    tags: ['UNESCO', 'Big Five', 'Rhino', 'Culture'],
    fees: {
      non_resident_adult: 70.80,
      non_resident_child: 23.60,
      resident_adult: 11.80,
      resident_child: 2.36,
      vehicle_fee: 295,
      extra_fees: [
        { name: 'Crater Service Fee (6-hr descent)', amount: 295 },
        { name: 'Concession Fee (per person / night)', amount: 60 },
      ],
    },
  },
  {
    id: 'tarangire',
    name: 'Tarangire National Park',
    country: 'Tanzania',
    region: 'Tarangire',
    area_km2: 2850,
    best_time: 'Jun–Oct',
    image: img('1534188753412-3e26d0d618d6'),
    description: 'Famous for its enormous elephant herds and ancient baobab trees, Tarangire offers one of the highest density of wildlife in the dry season, concentrated along the Tarangire River.',
    highlights: [
      'Large elephant herds (up to 300)',
      'Iconic baobab-dotted landscapes',
      'Excellent bird-watching (550+ species)',
      'Off-the-beaten-path game drives',
      'Night game drives in private concessions',
    ],
    tags: ['Elephants', 'Baobab', 'Birding'],
    fees: {
      non_resident_adult: 53.10,
      non_resident_child: 17.70,
      resident_adult: 5.90,
      resident_child: 2.36,
      vehicle_fee: 41.30,
    },
  },
  {
    id: 'lake_manyara',
    name: 'Lake Manyara National Park',
    country: 'Tanzania',
    region: 'Lake Manyara',
    area_km2: 330,
    best_time: 'Jul–Oct, Jan–Feb',
    image: img('1549366021-9f761d040a94'),
    description: 'A compact park of surprising diversity — from groundwater forest to alkaline lake. Known for tree-climbing lions, flocks of flamingoes, and a scenic Rift Valley escarpment backdrop.',
    highlights: [
      'Tree-climbing lions (rare behaviour)',
      'Thousands of flamingoes on the lake',
      'Canopy walkway through the forest',
      'Hippo pools and baboon troops',
    ],
    tags: ['Flamingo', 'Lion', 'Birding'],
    fees: {
      non_resident_adult: 53.10,
      non_resident_child: 17.70,
      resident_adult: 5.90,
      resident_child: 2.36,
      vehicle_fee: 41.30,
    },
  },
  {
    id: 'arusha',
    name: 'Arusha National Park',
    country: 'Tanzania',
    region: 'Arusha',
    area_km2: 552,
    best_time: 'Jun–Feb',
    image: img('1549366021-9f761d040a94'),
    description: 'Often overlooked gem near the town of Arusha — Mt Meru\'s forested slopes, the Momella Lakes, and Ngurdoto Crater offer walking safaris, canoeing, and exceptional giraffe and buffalo viewing.',
    highlights: [
      'Mt Meru summit trek (4,566 m)',
      'Canoeing on Momella Lakes',
      'Walking safaris with armed ranger',
      'Colobus monkey forest',
    ],
    tags: ['Walking', 'Canoeing', 'Meru'],
    fees: {
      non_resident_adult: 53.10,
      non_resident_child: 17.70,
      resident_adult: 5.90,
      resident_child: 2.36,
      vehicle_fee: 41.30,
    },
  },
  {
    id: 'ruaha',
    name: 'Ruaha National Park',
    country: 'Tanzania',
    region: 'Ruaha',
    area_km2: 20226,
    best_time: 'Jun–Oct',
    image: img('1516426122078-c23e76319801'),
    description: 'Tanzania\'s largest national park and one of Africa\'s best-kept secrets. Vast, wild, and uncrowded with huge elephant herds, large lion prides, and the unique meeting point of East & Southern African ecosystems.',
    highlights: [
      '10% of the world\'s lion population',
      'Huge, uncrowded wilderness',
      'Exceptional wild dog sightings',
      'Great River Ruaha game concentrations',
    ],
    tags: ['Lion', 'Wild Dog', 'Remote'],
    fees: {
      non_resident_adult: 35.40,
      non_resident_child: 11.80,
      resident_adult: 3.54,
      resident_child: 1.18,
      vehicle_fee: 41.30,
    },
  },
  {
    id: 'nyerere',
    name: 'Nyerere National Park (Selous)',
    country: 'Tanzania',
    region: 'Nyerere / Selous',
    area_km2: 30893,
    best_time: 'Jun–Oct',
    image: img('1534188753412-3e26d0d618d6'),
    description: 'Africa\'s largest protected wilderness area offering unique experiences: boat safaris on the Rufiji River, walking safaris, and fly-camping. Home to elephants, wild dogs, and massive crocodiles.',
    highlights: [
      'Boat safaris on the Rufiji River',
      'Walking safaris with professional guides',
      'Africa\'s largest wild dog population',
      'Fly-camping under the stars',
    ],
    tags: ['Boat Safari', 'Walking', 'Wild Dog', 'UNESCO'],
    fees: {
      non_resident_adult: 82.60,
      non_resident_child: 23.60,
      resident_adult: 11.80,
      resident_child: 2.36,
      vehicle_fee: 41.30,
      extra_fees: [
        { name: 'Boat Safari Fee', amount: 30 },
        { name: 'Walking Safari Fee', amount: 25 },
      ],
    },
  },
  {
    id: 'katavi',
    name: 'Katavi National Park',
    country: 'Tanzania',
    region: 'Katavi',
    area_km2: 4471,
    best_time: 'Aug–Oct',
    image: img('1547471080-7cc2caa01a7e'),
    description: 'Remote and raw, Katavi offers Africa as it once was. In the late dry season massive buffalo herds, hippo gatherings, and huge crocodiles concentrate around shrinking waterholes.',
    highlights: [
      'Largest buffalo herds in Africa (1,000+)',
      'Hundreds of hippos in mud pools',
      'True wilderness — near zero vehicles',
    ],
    tags: ['Remote', 'Buffalo', 'Hippo'],
    fees: {
      non_resident_adult: 35.40,
      non_resident_child: 11.80,
      resident_adult: 3.54,
      resident_child: 1.18,
      vehicle_fee: 41.30,
    },
  },
  {
    id: 'mahale',
    name: 'Mahale Mountains National Park',
    country: 'Tanzania',
    region: 'Mahale',
    area_km2: 1613,
    best_time: 'Jul–Oct',
    image: img('1564868207840-fd02cfd53a96'),
    description: 'Accessible only by boat or plane, Mahale is the world\'s premier chimpanzee tracking destination. Rugged mountains sweep down to the white-sand shores of Lake Tanganyika.',
    highlights: [
      'Chimpanzee tracking (~60 habituated)',
      'Snorkelling in Lake Tanganyika',
      'Mountain hiking & forest walks',
      'Remote and exclusive',
    ],
    tags: ['Chimpanzee', 'Lake', 'Remote'],
    fees: {
      non_resident_adult: 94.40,
      non_resident_child: 29.50,
      resident_adult: 11.80,
      resident_child: 2.36,
      extra_fees: [
        { name: 'Chimpanzee Tracking Permit', amount: 150 },
      ],
    },
  },
  {
    id: 'kilimanjaro',
    name: 'Kilimanjaro National Park',
    country: 'Tanzania',
    region: 'Kilimanjaro',
    area_km2: 1688,
    best_time: 'Jan–Mar, Jun–Oct',
    image: img('1589308078059-be1415eab4c3'),
    description: 'Africa\'s highest peak (5,895 m) and the world\'s tallest free-standing mountain. Multiple routes take climbers through five ecological zones from rainforest to arctic summit.',
    highlights: [
      'Uhuru Peak — roof of Africa',
      'Machame, Marangu, Lemosho, Rongai routes',
      'Five climatic zones on one mountain',
      'Glaciers at the summit',
    ],
    tags: ['Trekking', 'UNESCO', 'Summit'],
    fees: {
      non_resident_adult: 70.80,
      non_resident_child: 23.60,
      resident_adult: 5.90,
      resident_child: 2.36,
      extra_fees: [
        { name: 'Camping Fee (per person / night)', amount: 70.80 },
        { name: 'Rescue Fee (one-off)', amount: 23.60 },
        { name: 'Guide/Porter Entrance', amount: 2.36 },
      ],
    },
  },

  // ─── Kenya ───────────────────────────────────────────────────────────────
  {
    id: 'masai_mara',
    name: 'Masai Mara National Reserve',
    country: 'Kenya',
    region: 'Masai Mara',
    area_km2: 1510,
    best_time: 'Jul–Oct (migration), year-round',
    image: img('1516426122078-c23e76319801'),
    description: 'Kenya\'s flagship reserve and the northern stage of the Great Migration. Rolling savannah, big cats galore, dramatic river crossings on the Mara River, and warm Maasai hospitality.',
    highlights: [
      'Wildebeest river crossings (Jul–Oct)',
      'Exceptional lion, leopard & cheetah density',
      'Balloon safaris at sunrise',
      'Maasai village visits',
    ],
    tags: ['Big Five', 'Migration', 'Balloon'],
    fees: {
      non_resident_adult: 100,
      non_resident_child: 50,
      resident_adult: 23,
      resident_child: 11,
      vehicle_fee: 15,
      extra_fees: [
        { name: 'Mara Triangle (separate conservancy)', amount: 90 },
        { name: 'Conservancy Fees (varies)', amount: 80 },
      ],
    },
  },
  {
    id: 'amboseli',
    name: 'Amboseli National Park',
    country: 'Kenya',
    region: 'Amboseli',
    area_km2: 392,
    best_time: 'Jun–Oct, Jan–Feb',
    image: img('1534188753412-3e26d0d618d6'),
    description: 'Iconic for postcard-perfect views of Mt Kilimanjaro rising behind elephant herds. Shallow lakes attract waterbirds; the short grass plains make wildlife viewing exceptional.',
    highlights: [
      'Kilimanjaro backdrop photography',
      'Massive tuskers (bulls with huge ivory)',
      'Wetlands with 600+ bird species',
      'Observation Hill viewpoint',
    ],
    tags: ['Elephant', 'Kilimanjaro View', 'Birding'],
    fees: {
      non_resident_adult: 70,
      non_resident_child: 35,
      resident_adult: 13,
      resident_child: 5,
      vehicle_fee: 15,
    },
  },
  {
    id: 'tsavo_east',
    name: 'Tsavo East National Park',
    country: 'Kenya',
    region: 'Tsavo',
    area_km2: 13747,
    best_time: 'Jun–Oct, Jan–Feb',
    image: img('1547471080-7cc2caa01a7e'),
    description: 'One of the world\'s largest game reserves, famous for its red-dust-covered "red elephants", the Yatta Plateau, and Lugard\'s Falls. Vast open plains in a wild, uncrowded setting.',
    highlights: [
      'Red-dusted elephants',
      'Yatta Plateau — world\'s longest lava flow',
      'Aruba Dam game viewing',
      'Lugard\'s Falls on the Galana River',
    ],
    tags: ['Elephant', 'Wilderness'],
    fees: {
      non_resident_adult: 60,
      non_resident_child: 35,
      resident_adult: 13,
      resident_child: 5,
      vehicle_fee: 15,
    },
  },
  {
    id: 'tsavo_west',
    name: 'Tsavo West National Park',
    country: 'Kenya',
    region: 'Tsavo',
    area_km2: 9065,
    best_time: 'Jun–Oct',
    image: img('1534188753412-3e26d0d618d6'),
    description: 'More varied than its eastern counterpart — Mzima Springs\' crystal pools, lava flows, and the rhino sanctuary at Ngulia make Tsavo West a diverse safari destination.',
    highlights: [
      'Mzima Springs (underwater hippo viewing)',
      'Ngulia Rhino Sanctuary',
      'Shetani Lava Flows',
      'Chaimu Crater hike',
    ],
    tags: ['Rhino', 'Springs', 'Lava'],
    fees: {
      non_resident_adult: 60,
      non_resident_child: 35,
      resident_adult: 13,
      resident_child: 5,
      vehicle_fee: 15,
    },
  },
  {
    id: 'samburu',
    name: 'Samburu National Reserve',
    country: 'Kenya',
    region: 'Samburu',
    area_km2: 165,
    best_time: 'Jun–Oct, Dec–Mar',
    image: img('1516426122078-c23e76319801'),
    description: 'Arid northern Kenya wilderness with unique "Samburu Special Five" — Grevy\'s zebra, reticulated giraffe, Beisa oryx, gerenuk, and Somali ostrich. Rich Samburu culture adds depth.',
    highlights: [
      'Samburu Special Five (rare arid species)',
      'Ewaso Nyiro River game viewing',
      'Samburu cultural visits',
      'Elephant matriarchs',
    ],
    tags: ['Special Five', 'Culture', 'Arid'],
    fees: {
      non_resident_adult: 70,
      non_resident_child: 40,
      resident_adult: 11,
      resident_child: 6,
      vehicle_fee: 15,
    },
  },
  {
    id: 'lake_nakuru',
    name: 'Lake Nakuru National Park',
    country: 'Kenya',
    region: 'Lake Nakuru',
    area_km2: 188,
    best_time: 'Jun–Mar',
    image: img('1549366021-9f761d040a94'),
    description: 'Famous pink-shores of flamingoes with both black and white rhino in the same park. A compact, high-yield safari stop on the Rift Valley floor.',
    highlights: [
      'Flamingo flocks (seasonal)',
      'Both black & white rhino',
      'Rothschild\'s giraffe',
      'Baboon Cliff viewpoint',
    ],
    tags: ['Flamingo', 'Rhino', 'Birding'],
    fees: {
      non_resident_adult: 60,
      non_resident_child: 35,
      resident_adult: 11,
      resident_child: 5,
      vehicle_fee: 15,
    },
  },
  {
    id: 'meru',
    name: 'Meru National Park',
    country: 'Kenya',
    region: 'Meru',
    area_km2: 870,
    best_time: 'Jun–Oct, Dec–Mar',
    image: img('1547471080-7cc2caa01a7e'),
    description: 'Lush, wild and uncrowded — made famous by Joy Adamson\'s "Born Free" story. Fed by numerous streams that create a tropical-feeling oasis for elephant, buffalo and rhino.',
    highlights: [
      'Rhino Sanctuary (black & white)',
      'Elsa the lioness legacy',
      '13 rivers and lush riverine forest',
      'Uncrowded game drives',
    ],
    tags: ['Rhino', 'Born Free', 'Lush'],
    fees: {
      non_resident_adult: 60,
      non_resident_child: 35,
      resident_adult: 11,
      resident_child: 5,
      vehicle_fee: 15,
    },
  },

  // ─── Uganda ──────────────────────────────────────────────────────────────
  {
    id: 'bwindi',
    name: 'Bwindi Impenetrable National Park',
    country: 'Uganda',
    region: 'Bwindi',
    area_km2: 331,
    best_time: 'Jun–Aug, Dec–Feb',
    image: img('1564868207840-fd02cfd53a96'),
    description: 'Home to nearly half the world\'s mountain gorillas. This ancient, biologically diverse rainforest rewards trekkers with an unforgettable hour in the presence of a habituated gorilla family.',
    highlights: [
      'Mountain gorilla trekking (4 sectors)',
      '1 hour with a habituated gorilla family',
      'Batwa cultural trail',
      '350+ bird species (23 Albertine Rift endemics)',
    ],
    tags: ['Gorilla', 'UNESCO', 'Trekking'],
    fees: {
      non_resident_adult: 40,
      non_resident_child: 20,
      resident_adult: 15,
      resident_child: 5,
      extra_fees: [
        { name: 'Gorilla Trekking Permit (foreign)', amount: 800 },
        { name: 'Gorilla Habituation Experience', amount: 1500 },
        { name: 'EA Resident Gorilla Permit', amount: 700 },
      ],
    },
  },
  {
    id: 'queen_elizabeth',
    name: 'Queen Elizabeth National Park',
    country: 'Uganda',
    region: 'Queen Elizabeth',
    area_km2: 1978,
    best_time: 'Jun–Sep, Dec–Feb',
    image: img('1516426122078-c23e76319801'),
    description: 'Uganda\'s most visited park, straddling the equator and famous for tree-climbing lions in Ishasha, boat cruises on the Kazinga Channel, and chimpanzees in Kyambura Gorge.',
    highlights: [
      'Tree-climbing lions in Ishasha',
      'Kazinga Channel boat safari',
      'Kyambura Gorge chimp tracking',
      '600+ bird species',
    ],
    tags: ['Lion', 'Chimp', 'Boat'],
    fees: {
      non_resident_adult: 40,
      non_resident_child: 20,
      resident_adult: 15,
      resident_child: 5,
      extra_fees: [
        { name: 'Kazinga Channel Boat Cruise', amount: 30 },
        { name: 'Chimp Tracking Kyambura', amount: 50 },
      ],
    },
  },
  {
    id: 'murchison',
    name: 'Murchison Falls National Park',
    country: 'Uganda',
    region: 'Murchison Falls',
    area_km2: 3840,
    best_time: 'Dec–Feb, Jun–Sep',
    image: img('1547471080-7cc2caa01a7e'),
    description: 'Uganda\'s largest park, centred on the explosive Murchison Falls where the Nile forces itself through a 7-metre gap. Rich in game — lion, elephant, giraffe — along the riverbanks.',
    highlights: [
      'Top of the Falls hike',
      'Nile boat cruise to the falls',
      'Rothschild\'s giraffe herds',
      'Sport fishing (Nile perch)',
    ],
    tags: ['Falls', 'Nile', 'Giraffe'],
    fees: {
      non_resident_adult: 40,
      non_resident_child: 20,
      resident_adult: 15,
      resident_child: 5,
      extra_fees: [
        { name: 'Boat Cruise to Falls', amount: 30 },
      ],
    },
  },
  {
    id: 'kibale',
    name: 'Kibale Forest National Park',
    country: 'Uganda',
    region: 'Kibale',
    area_km2: 795,
    best_time: 'Jun–Sep, Dec–Feb',
    image: img('1564868207840-fd02cfd53a96'),
    description: 'The primate capital of East Africa, with 13 species including over 1,500 chimpanzees. Tropical rainforest trails offer exceptional primate tracking and bird-watching.',
    highlights: [
      'Chimp tracking (habituated community)',
      'Chimpanzee Habituation Experience (full day)',
      '13 primate species',
      'Bigodi Wetland birding walk',
    ],
    tags: ['Chimp', 'Forest', 'Primates'],
    fees: {
      non_resident_adult: 40,
      non_resident_child: 20,
      resident_adult: 15,
      resident_child: 5,
      extra_fees: [
        { name: 'Chimpanzee Tracking Permit', amount: 200 },
        { name: 'Chimp Habituation Experience', amount: 250 },
      ],
    },
  },
  {
    id: 'mgahinga',
    name: 'Mgahinga Gorilla National Park',
    country: 'Uganda',
    region: 'Mgahinga',
    area_km2: 34,
    best_time: 'Jun–Sep, Dec–Feb',
    image: img('1564868207840-fd02cfd53a96'),
    description: 'Uganda\'s smallest national park, set at the foot of three Virunga volcanoes, with mountain gorilla tracking and golden monkey encounters.',
    highlights: [
      'Mountain gorilla tracking (Nyakagezi)',
      'Golden monkey tracking',
      'Virunga volcano hikes (Muhavura, Sabyinyo, Gahinga)',
      'Batwa forest experience',
    ],
    tags: ['Gorilla', 'Golden Monkey', 'Volcano'],
    fees: {
      non_resident_adult: 40,
      non_resident_child: 20,
      resident_adult: 15,
      resident_child: 5,
      extra_fees: [
        { name: 'Gorilla Permit', amount: 800 },
        { name: 'Golden Monkey Tracking', amount: 100 },
      ],
    },
  },
  {
    id: 'kidepo',
    name: 'Kidepo Valley National Park',
    country: 'Uganda',
    region: 'Kidepo',
    area_km2: 1442,
    best_time: 'Sep–Mar',
    image: img('1547471080-7cc2caa01a7e'),
    description: 'Uganda\'s most remote park in the far north, rated by CNN as one of Africa\'s best. True wilderness with big cat sightings and unique Karamojong cultural experiences.',
    highlights: [
      'Huge buffalo herds',
      'Cheetah and wild dog',
      'Karamojong cultural visits',
      'Mt Morungole & IK people',
    ],
    tags: ['Remote', 'Wilderness', 'Culture'],
    fees: {
      non_resident_adult: 40,
      non_resident_child: 20,
      resident_adult: 15,
      resident_child: 5,
    },
  },

  // ─── Rwanda ──────────────────────────────────────────────────────────────
  {
    id: 'volcanoes',
    name: 'Volcanoes National Park',
    country: 'Rwanda',
    region: 'Volcanoes',
    area_km2: 160,
    best_time: 'Jun–Sep, Dec–Feb',
    image: img('1564868207840-fd02cfd53a96'),
    description: 'Rwanda\'s premier gorilla tracking destination, made famous by Dian Fossey. Bamboo forests on volcanic slopes harbour 12 habituated gorilla families and endemic golden monkeys.',
    highlights: [
      'Mountain gorilla tracking (12 families)',
      'Golden monkey tracking',
      'Dian Fossey grave hike',
      'Bisoke & Karisimbi volcano climbs',
    ],
    tags: ['Gorilla', 'Volcano', 'Dian Fossey'],
    fees: {
      non_resident_adult: 100,
      non_resident_child: 50,
      resident_adult: 50,
      resident_child: 25,
      extra_fees: [
        { name: 'Gorilla Permit (foreign)', amount: 1500 },
        { name: 'Golden Monkey Permit', amount: 100 },
        { name: 'Dian Fossey Hike', amount: 75 },
      ],
    },
  },
  {
    id: 'akagera',
    name: 'Akagera National Park',
    country: 'Rwanda',
    region: 'Akagera',
    area_km2: 1122,
    best_time: 'Jun–Sep, Dec–Feb',
    image: img('1516426122078-c23e76319801'),
    description: 'Rwanda\'s only Big Five destination, a conservation success story with reintroduced lion and rhino. Savannah, lakes and wetlands create a classic safari experience in East Africa\'s greenest country.',
    highlights: [
      'Big Five game viewing',
      'Boat safari on Lake Ihema',
      'Night game drives',
      'Successful conservation story',
    ],
    tags: ['Big Five', 'Rhino', 'Boat'],
    fees: {
      non_resident_adult: 50,
      non_resident_child: 25,
      resident_adult: 25,
      resident_child: 12,
      vehicle_fee: 10,
      extra_fees: [
        { name: 'Boat Trip (Lake Ihema)', amount: 40 },
        { name: 'Night Game Drive', amount: 40 },
      ],
    },
  },
  {
    id: 'nyungwe',
    name: 'Nyungwe Forest National Park',
    country: 'Rwanda',
    region: 'Nyungwe',
    area_km2: 1020,
    best_time: 'Jun–Sep, Dec–Feb',
    image: img('1564868207840-fd02cfd53a96'),
    description: 'One of Africa\'s oldest rainforests with 13 primate species including chimpanzees and troops of 400+ colobus monkeys. Famed canopy walkway offers an aerial forest view.',
    highlights: [
      'Chimpanzee tracking',
      'Colobus monkey troops',
      'Canopy walkway (60m suspension)',
      '310+ bird species',
    ],
    tags: ['Chimp', 'Forest', 'Canopy'],
    fees: {
      non_resident_adult: 50,
      non_resident_child: 25,
      resident_adult: 25,
      resident_child: 12,
      extra_fees: [
        { name: 'Chimp Trekking Permit', amount: 150 },
        { name: 'Canopy Walk', amount: 60 },
      ],
    },
  },
];

// ─── ACCOMMODATIONS ──────────────────────────────────────────────────────────

export const ACCOMMODATIONS = [
  // ─── Serengeti ───────────────────────────────────────────────────────────
  {
    id: 'four_seasons_serengeti',
    name: 'Four Seasons Safari Lodge Serengeti',
    category: 'luxury',
    type: 'Lodge',
    country: 'Tanzania',
    region: 'Serengeti',
    park_id: 'serengeti',
    rating: 5,
    image: img('1566073771259-6a8506099945'),
    images: [img('1566073771259-6a8506099945'), img('1582719478250-c89cae4dc85b'), img('1551882547-ff40c63fe5fa')],
    description: 'Set on a natural waterhole in the central Serengeti, this lodge combines award-winning luxury with front-row wildlife viewing. Each suite features a private balcony overlooking the plains.',
    amenities: ['Infinity Pool', 'Spa', 'Wi-Fi', 'Discovery Centre', 'Waterhole View', 'Air-Con', 'Restaurant', 'Bar'],
    room_types: [
      { name: 'Savannah Room', capacity: 2 },
      { name: 'Premium Pool Room', capacity: 2 },
      { name: 'One-Bedroom Suite', capacity: 2 },
      { name: 'Two-Bedroom Suite', capacity: 4 },
    ],
    meal_plans: ['Full Board', 'All-Inclusive'],
    pricing: {
      low_season: { pps: 850, single_supplement: 450 },
      high_season: { pps: 1450, single_supplement: 750 },
      peak_season: { pps: 2100, single_supplement: 1100 },
    },
  },
  {
    id: 'singita_mara',
    name: 'Singita Mara River Tented Camp',
    category: 'luxury',
    type: 'Tented Camp',
    country: 'Tanzania',
    region: 'Serengeti',
    park_id: 'serengeti',
    rating: 5,
    image: img('1551882547-ff40c63fe5fa'),
    images: [img('1551882547-ff40c63fe5fa'), img('1566073771259-6a8506099945')],
    description: 'An exclusive eco-tented camp on the banks of the Mara River, perfectly positioned for Great Migration river crossings. Just 6 tents ensure an intimate, exclusive experience.',
    amenities: ['River View', 'Private Deck', 'Solar Power', 'Wi-Fi', 'All-Inclusive', 'Fitness Gallery'],
    room_types: [{ name: 'Luxury Tent', capacity: 2 }, { name: 'Family Tent', capacity: 4 }],
    meal_plans: ['All-Inclusive'],
    pricing: {
      low_season: { pps: 1800, single_supplement: 800 },
      high_season: { pps: 2800, single_supplement: 1400 },
      peak_season: { pps: 3800, single_supplement: 1900 },
    },
  },
  {
    id: 'serengeti_serena',
    name: 'Serengeti Serena Safari Lodge',
    category: 'mid_range',
    type: 'Lodge',
    country: 'Tanzania',
    region: 'Serengeti',
    park_id: 'serengeti',
    rating: 4,
    image: img('1520637836862-4d197d17c55a'),
    description: 'Inspired by traditional African villages, perched on a hill with panoramic Serengeti views. Reliable comfort at an accessible price point.',
    amenities: ['Pool', 'Wi-Fi', 'Bar', 'Restaurant', 'Panoramic Deck', 'Boutique'],
    room_types: [{ name: 'Standard Room', capacity: 2 }, { name: 'Suite', capacity: 2 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 280, single_supplement: 120 },
      high_season: { pps: 420, single_supplement: 180 },
      peak_season: { pps: 620, single_supplement: 280 },
    },
  },
  {
    id: 'serengeti_heritage',
    name: 'Serengeti Heritage Camp',
    category: 'mid_range',
    type: 'Tented Camp',
    country: 'Tanzania',
    region: 'Serengeti',
    park_id: 'serengeti',
    rating: 4,
    image: img('1582719478250-c89cae4dc85b'),
    description: 'A mobile-style tented camp that relocates seasonally to follow the migration. Classic safari atmosphere with en-suite tents and hot bucket showers.',
    amenities: ['Ensuite Bathrooms', 'Mess Tent', 'Campfire', 'Solar Lighting'],
    room_types: [{ name: 'Classic Safari Tent', capacity: 2 }, { name: 'Family Tent', capacity: 4 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 320, single_supplement: 120 },
      high_season: { pps: 480, single_supplement: 180 },
      peak_season: { pps: 680, single_supplement: 260 },
    },
  },
  {
    id: 'serengeti_tukaone',
    name: 'Serengeti Tukaone Tented Camp',
    category: 'budget',
    type: 'Tented Camp',
    country: 'Tanzania',
    region: 'Serengeti',
    park_id: 'serengeti',
    rating: 3,
    image: img('1518005020951-eccb494ad742'),
    description: 'Simple, comfortable public-campsite tented accommodation for budget safaris. Full-board meals, shared bathrooms — the authentic safari experience.',
    amenities: ['Mess Tent', 'Campfire', 'Shared Bathrooms', 'Full Board'],
    room_types: [{ name: 'Safari Tent (twin)', capacity: 2 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 120, single_supplement: 40 },
      high_season: { pps: 160, single_supplement: 60 },
      peak_season: { pps: 220, single_supplement: 80 },
    },
  },

  // ─── Ngorongoro ──────────────────────────────────────────────────────────
  {
    id: 'andbeyond_ngorongoro',
    name: '&Beyond Ngorongoro Crater Lodge',
    category: 'luxury',
    type: 'Lodge',
    country: 'Tanzania',
    region: 'Ngorongoro',
    park_id: 'ngorongoro',
    rating: 5,
    image: img('1522708323590-d24dbb6b0267'),
    images: [img('1522708323590-d24dbb6b0267'), img('1566073771259-6a8506099945')],
    description: 'A baroque-meets-Maasai fantasy on the crater rim. Hand-crafted Zulu-style cottages with antiques, silver service dining and unobstructed crater views.',
    amenities: ['Butler Service', 'Fireplace', 'Crater View', 'Wi-Fi', 'Silver Service Dining', 'Boutique'],
    room_types: [{ name: 'Suite', capacity: 2 }, { name: 'Honeymoon Suite', capacity: 2 }],
    meal_plans: ['All-Inclusive'],
    pricing: {
      low_season: { pps: 1900, single_supplement: 900 },
      high_season: { pps: 2900, single_supplement: 1400 },
      peak_season: { pps: 3900, single_supplement: 1900 },
    },
  },
  {
    id: 'ngorongoro_serena',
    name: 'Ngorongoro Serena Safari Lodge',
    category: 'mid_range',
    type: 'Lodge',
    country: 'Tanzania',
    region: 'Ngorongoro',
    park_id: 'ngorongoro',
    rating: 4,
    image: img('1520637836862-4d197d17c55a'),
    description: 'Built of local river stone to blend into the crater rim. Every room has a crater view and evenings are warmed by open fires in the lounge.',
    amenities: ['Crater View', 'Fireplace', 'Wi-Fi', 'Spa', 'Restaurant', 'Bar'],
    room_types: [{ name: 'Standard Room', capacity: 2 }, { name: 'Suite', capacity: 2 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 260, single_supplement: 120 },
      high_season: { pps: 400, single_supplement: 180 },
      peak_season: { pps: 580, single_supplement: 260 },
    },
  },
  {
    id: 'rhino_lodge',
    name: 'Rhino Lodge Ngorongoro',
    category: 'budget',
    type: 'Lodge',
    country: 'Tanzania',
    region: 'Ngorongoro',
    park_id: 'ngorongoro',
    rating: 3,
    image: img('1518005020951-eccb494ad742'),
    description: 'A modest, community-owned lodge on the crater rim with comfortable rooms and a warm atmosphere. Exceptional value for Ngorongoro.',
    amenities: ['Restaurant', 'Bar', 'Crater Rim', 'Fireplace'],
    room_types: [{ name: 'Standard Twin', capacity: 2 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 160, single_supplement: 50 },
      high_season: { pps: 210, single_supplement: 70 },
      peak_season: { pps: 280, single_supplement: 100 },
    },
  },

  // ─── Tarangire ───────────────────────────────────────────────────────────
  {
    id: 'tarangire_treetops',
    name: 'Tarangire Treetops',
    category: 'luxury',
    type: 'Tree Lodge',
    country: 'Tanzania',
    region: 'Tarangire',
    park_id: 'tarangire',
    rating: 5,
    image: img('1564501049412-61c2a3083791'),
    description: 'Suspended among baobab and marula trees, each sumptuous suite sits in the canopy. Game drives and bush walks in the private Randilen Wildlife Management Area.',
    amenities: ['Pool', 'Treetop Suites', 'Spa', 'Wi-Fi', 'Night Drives', 'Bush Walks'],
    room_types: [{ name: 'Treehouse Suite', capacity: 2 }, { name: 'Family Suite', capacity: 4 }],
    meal_plans: ['All-Inclusive'],
    pricing: {
      low_season: { pps: 750, single_supplement: 350 },
      high_season: { pps: 1200, single_supplement: 550 },
      peak_season: { pps: 1600, single_supplement: 750 },
    },
  },
  {
    id: 'tarangire_sopa',
    name: 'Tarangire Sopa Lodge',
    category: 'mid_range',
    type: 'Lodge',
    country: 'Tanzania',
    region: 'Tarangire',
    park_id: 'tarangire',
    rating: 4,
    image: img('1520637836862-4d197d17c55a'),
    description: 'A landmark lodge with vast family-sized suites, swimming pool, and a prime location within the park for game drives at first light.',
    amenities: ['Pool', 'Wi-Fi', 'Restaurant', 'Bar', 'Kids Welcome'],
    room_types: [{ name: 'Standard Suite', capacity: 3 }, { name: 'Family Suite', capacity: 4 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 240, single_supplement: 100 },
      high_season: { pps: 360, single_supplement: 150 },
      peak_season: { pps: 500, single_supplement: 220 },
    },
  },
  {
    id: 'tarangire_safari_lodge',
    name: 'Tarangire Safari Lodge',
    category: 'budget',
    type: 'Tented Lodge',
    country: 'Tanzania',
    region: 'Tarangire',
    park_id: 'tarangire',
    rating: 3,
    image: img('1518005020951-eccb494ad742'),
    description: 'The oldest lodge in Tarangire, perched on a bluff with spectacular game-viewing from the dining terrace. Simple tented rooms, great value.',
    amenities: ['Pool', 'Bar', 'Restaurant', 'Panoramic Deck'],
    room_types: [{ name: 'Safari Tent', capacity: 2 }, { name: 'Chalet', capacity: 2 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 180, single_supplement: 60 },
      high_season: { pps: 240, single_supplement: 80 },
      peak_season: { pps: 320, single_supplement: 120 },
    },
  },

  // ─── Lake Manyara ────────────────────────────────────────────────────────
  {
    id: 'manyara_treelodge',
    name: '&Beyond Lake Manyara Tree Lodge',
    category: 'luxury',
    type: 'Tree Lodge',
    country: 'Tanzania',
    region: 'Lake Manyara',
    park_id: 'lake_manyara',
    rating: 5,
    image: img('1564501049412-61c2a3083791'),
    description: 'Tanzania\'s only true treehouse lodge, nestled in a mahogany forest. Ten suites raised on stilts offer a forest canopy experience unlike any other.',
    amenities: ['Treehouse Rooms', 'Pool', 'Butler Service', 'Forest Walks', 'All-Inclusive'],
    room_types: [{ name: 'Tree House Suite', capacity: 2 }],
    meal_plans: ['All-Inclusive'],
    pricing: {
      low_season: { pps: 1100, single_supplement: 500 },
      high_season: { pps: 1700, single_supplement: 800 },
      peak_season: { pps: 2300, single_supplement: 1100 },
    },
  },
  {
    id: 'manyara_serena',
    name: 'Lake Manyara Serena Safari Lodge',
    category: 'mid_range',
    type: 'Lodge',
    country: 'Tanzania',
    region: 'Lake Manyara',
    park_id: 'lake_manyara',
    rating: 4,
    image: img('1520637836862-4d197d17c55a'),
    description: 'Perched on the Rift Valley escarpment with commanding views over the lake. Family-friendly with cultural performances and an infinity pool.',
    amenities: ['Pool', 'Wi-Fi', 'Cultural Performances', 'Restaurant', 'Spa'],
    room_types: [{ name: 'Double Room', capacity: 2 }, { name: 'Suite', capacity: 2 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 240, single_supplement: 100 },
      high_season: { pps: 360, single_supplement: 150 },
      peak_season: { pps: 520, single_supplement: 230 },
    },
  },

  // ─── Masai Mara (Kenya) ──────────────────────────────────────────────────
  {
    id: 'angama_mara',
    name: 'Angama Mara',
    category: 'luxury',
    type: 'Tented Suite',
    country: 'Kenya',
    region: 'Masai Mara',
    park_id: 'masai_mara',
    rating: 5,
    image: img('1566073771259-6a8506099945'),
    images: [img('1566073771259-6a8506099945'), img('1582719478250-c89cae4dc85b')],
    description: 'Perched on the Oloololo Escarpment 300m above the Mara plains. Glass-fronted tents with breathtaking views that inspired the film "Out of Africa".',
    amenities: ['Pool', 'Spa', 'Photo Studio', 'Wi-Fi', 'Tennis', 'Cultural Visits', 'Escarpment View'],
    room_types: [{ name: 'Suite', capacity: 2 }, { name: 'Family Suite', capacity: 4 }],
    meal_plans: ['All-Inclusive'],
    pricing: {
      low_season: { pps: 1400, single_supplement: 700 },
      high_season: { pps: 2100, single_supplement: 1000 },
      peak_season: { pps: 2900, single_supplement: 1400 },
    },
  },
  {
    id: 'governors_camp',
    name: 'Governors\' Camp',
    category: 'luxury',
    type: 'Tented Camp',
    country: 'Kenya',
    region: 'Masai Mara',
    park_id: 'masai_mara',
    rating: 5,
    image: img('1582719478250-c89cae4dc85b'),
    description: 'A legendary tented camp on a bend of the Mara River, frontline for migration river crossings. Classic "Out of Africa" atmosphere with modern comforts.',
    amenities: ['River View', 'Wi-Fi', 'Bar', 'Balloon Safaris', 'Walking Safaris', 'Full Board'],
    room_types: [{ name: 'Luxury Tent', capacity: 2 }, { name: 'Family Tent', capacity: 4 }],
    meal_plans: ['Full Board', 'All-Inclusive'],
    pricing: {
      low_season: { pps: 780, single_supplement: 380 },
      high_season: { pps: 1280, single_supplement: 580 },
      peak_season: { pps: 1780, single_supplement: 880 },
    },
  },
  {
    id: 'mara_serena',
    name: 'Mara Serena Safari Lodge',
    category: 'mid_range',
    type: 'Lodge',
    country: 'Kenya',
    region: 'Masai Mara',
    park_id: 'masai_mara',
    rating: 4,
    image: img('1520637836862-4d197d17c55a'),
    description: 'On a hill overlooking the Mara River with 360° views of the reserve. Classic lodge with pool, spa, and central location for migration viewing.',
    amenities: ['Pool', 'Wi-Fi', 'Spa', 'Restaurant', '360° Views'],
    room_types: [{ name: 'Standard', capacity: 2 }, { name: 'Family Room', capacity: 4 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 280, single_supplement: 120 },
      high_season: { pps: 420, single_supplement: 180 },
      peak_season: { pps: 600, single_supplement: 260 },
    },
  },
  {
    id: 'mara_intrepids',
    name: 'Mara Intrepids Camp',
    category: 'mid_range',
    type: 'Tented Camp',
    country: 'Kenya',
    region: 'Masai Mara',
    park_id: 'masai_mara',
    rating: 4,
    image: img('1582719478250-c89cae4dc85b'),
    description: 'Thirty tents set beside the Talek River at the heart of the Mara. Excellent for families with a Young Rangers programme.',
    amenities: ['Pool', 'Kids Programme', 'Wi-Fi', 'Bar', 'Bush Meals'],
    room_types: [{ name: 'Luxury Tent', capacity: 2 }, { name: 'Family Tent', capacity: 4 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 360, single_supplement: 150 },
      high_season: { pps: 520, single_supplement: 220 },
      peak_season: { pps: 720, single_supplement: 300 },
    },
  },
  {
    id: 'mara_sidai',
    name: 'Mara Sidai Camp',
    category: 'budget',
    type: 'Tented Camp',
    country: 'Kenya',
    region: 'Masai Mara',
    park_id: 'masai_mara',
    rating: 3,
    image: img('1518005020951-eccb494ad742'),
    description: 'A simple, Maasai-owned camp just outside the reserve with basic but comfortable tents and authentic cultural atmosphere.',
    amenities: ['Mess Tent', 'Campfire', 'Cultural Visits', 'Full Board'],
    room_types: [{ name: 'Safari Tent', capacity: 2 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 140, single_supplement: 40 },
      high_season: { pps: 190, single_supplement: 60 },
      peak_season: { pps: 260, single_supplement: 90 },
    },
  },

  // ─── Amboseli ────────────────────────────────────────────────────────────
  {
    id: 'tortilis_amboseli',
    name: 'Tortilis Camp',
    category: 'luxury',
    type: 'Tented Camp',
    country: 'Kenya',
    region: 'Amboseli',
    park_id: 'amboseli',
    rating: 5,
    image: img('1566073771259-6a8506099945'),
    description: 'Named after the umbrella thorn acacias that shade each tent. Unrivalled Kilimanjaro views from a private conservancy bordering Amboseli.',
    amenities: ['Pool', 'Kilimanjaro View', 'Wi-Fi', 'Private Conservancy', 'Walking Safaris', 'All-Inclusive'],
    room_types: [{ name: 'Family Tent', capacity: 4 }, { name: 'Luxury Tent', capacity: 2 }, { name: 'Private Suite', capacity: 2 }],
    meal_plans: ['All-Inclusive'],
    pricing: {
      low_season: { pps: 650, single_supplement: 280 },
      high_season: { pps: 950, single_supplement: 420 },
      peak_season: { pps: 1350, single_supplement: 580 },
    },
  },
  {
    id: 'amboseli_serena',
    name: 'Amboseli Serena Safari Lodge',
    category: 'mid_range',
    type: 'Lodge',
    country: 'Kenya',
    region: 'Amboseli',
    park_id: 'amboseli',
    rating: 4,
    image: img('1520637836862-4d197d17c55a'),
    description: 'Set within an oasis of springs, papyrus and palms inside the park. Guaranteed Kilimanjaro vista from the lounge terrace.',
    amenities: ['Pool', 'Wi-Fi', 'Restaurant', 'Spa', 'Kilimanjaro View'],
    room_types: [{ name: 'Standard', capacity: 2 }, { name: 'Family Room', capacity: 4 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 260, single_supplement: 100 },
      high_season: { pps: 400, single_supplement: 170 },
      peak_season: { pps: 560, single_supplement: 240 },
    },
  },

  // ─── Bwindi (Uganda) ─────────────────────────────────────────────────────
  {
    id: 'sanctuary_gorilla_forest',
    name: 'Sanctuary Gorilla Forest Camp',
    category: 'luxury',
    type: 'Tented Camp',
    country: 'Uganda',
    region: 'Bwindi',
    park_id: 'bwindi',
    rating: 5,
    image: img('1564868207840-fd02cfd53a96'),
    description: 'The only lodge inside Bwindi Impenetrable National Park. Eight luxurious tents where gorillas sometimes wander through camp.',
    amenities: ['Spa', 'Wi-Fi', 'In-Park', 'Fireplace', 'All-Inclusive', 'Boutique'],
    room_types: [{ name: 'Safari Tent', capacity: 2 }, { name: 'Family Tent', capacity: 4 }],
    meal_plans: ['All-Inclusive'],
    pricing: {
      low_season: { pps: 680, single_supplement: 300 },
      high_season: { pps: 980, single_supplement: 450 },
      peak_season: { pps: 1280, single_supplement: 600 },
    },
  },
  {
    id: 'bwindi_lodge',
    name: 'Bwindi Lodge',
    category: 'luxury',
    type: 'Lodge',
    country: 'Uganda',
    region: 'Bwindi',
    park_id: 'bwindi',
    rating: 5,
    image: img('1566073771259-6a8506099945'),
    description: 'On the edge of the forest, this stylish lodge offers a perfect base for gorilla trekking at Buhoma. Private balconies overlook the forest canopy.',
    amenities: ['Spa', 'Wi-Fi', 'Fireplace', 'Yoga Deck', 'Full Board', 'Boutique'],
    room_types: [{ name: 'Forest Bandas', capacity: 2 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 620, single_supplement: 280 },
      high_season: { pps: 880, single_supplement: 400 },
      peak_season: { pps: 1180, single_supplement: 550 },
    },
  },
  {
    id: 'silverback_lodge',
    name: 'Silverback Lodge',
    category: 'mid_range',
    type: 'Lodge',
    country: 'Uganda',
    region: 'Bwindi',
    park_id: 'bwindi',
    rating: 4,
    image: img('1520637836862-4d197d17c55a'),
    description: 'Overlooking the impenetrable forest with comfortable cottages and solid gorilla-tracking logistics at an accessible price.',
    amenities: ['Restaurant', 'Bar', 'Fireplace', 'Full Board', 'Wi-Fi'],
    room_types: [{ name: 'Cottage', capacity: 2 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 220, single_supplement: 80 },
      high_season: { pps: 320, single_supplement: 120 },
      peak_season: { pps: 440, single_supplement: 160 },
    },
  },
  {
    id: 'buhoma_community',
    name: 'Buhoma Community Rest Camp',
    category: 'budget',
    type: 'Bandas',
    country: 'Uganda',
    region: 'Bwindi',
    park_id: 'bwindi',
    rating: 3,
    image: img('1518005020951-eccb494ad742'),
    description: 'Community-run accommodation with simple bandas and campsite. Revenue supports local Batwa community development.',
    amenities: ['Restaurant', 'Community-Run', 'Shared Bathrooms Option'],
    room_types: [{ name: 'Banda', capacity: 2 }, { name: 'Campsite', capacity: 2 }],
    meal_plans: ['Half Board', 'Full Board'],
    pricing: {
      low_season: { pps: 80, single_supplement: 20 },
      high_season: { pps: 110, single_supplement: 30 },
      peak_season: { pps: 150, single_supplement: 40 },
    },
  },

  // ─── Queen Elizabeth ─────────────────────────────────────────────────────
  {
    id: 'mweya_lodge',
    name: 'Mweya Safari Lodge',
    category: 'mid_range',
    type: 'Lodge',
    country: 'Uganda',
    region: 'Queen Elizabeth',
    park_id: 'queen_elizabeth',
    rating: 4,
    image: img('1520637836862-4d197d17c55a'),
    description: 'Set on a peninsula overlooking the Kazinga Channel and Lake Edward. A perfect base for boat cruises and Kasenyi plains game drives.',
    amenities: ['Pool', 'Spa', 'Wi-Fi', 'Restaurant', 'Channel View'],
    room_types: [{ name: 'Standard Room', capacity: 2 }, { name: 'Cottage', capacity: 2 }, { name: 'Family Cottage', capacity: 4 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 240, single_supplement: 100 },
      high_season: { pps: 340, single_supplement: 140 },
      peak_season: { pps: 480, single_supplement: 200 },
    },
  },

  // ─── Volcanoes (Rwanda) ──────────────────────────────────────────────────
  {
    id: 'bisate_lodge',
    name: 'Bisate Lodge',
    category: 'luxury',
    type: 'Lodge',
    country: 'Rwanda',
    region: 'Volcanoes',
    park_id: 'volcanoes',
    rating: 5,
    image: img('1564868207840-fd02cfd53a96'),
    images: [img('1564868207840-fd02cfd53a96'), img('1566073771259-6a8506099945')],
    description: 'Six dramatic forest villas nestled within an eroded volcanic crater. One of the world\'s most luxurious gorilla trekking bases.',
    amenities: ['Spa', 'Wi-Fi', 'Fireplace', 'All-Inclusive', 'Boutique', 'Reforestation Project'],
    room_types: [{ name: 'Forest Villa', capacity: 2 }],
    meal_plans: ['All-Inclusive'],
    pricing: {
      low_season: { pps: 1850, single_supplement: 850 },
      high_season: { pps: 2500, single_supplement: 1100 },
      peak_season: { pps: 3200, single_supplement: 1400 },
    },
  },
  {
    id: 'singita_kwitonda',
    name: 'Singita Kwitonda Lodge',
    category: 'luxury',
    type: 'Lodge',
    country: 'Rwanda',
    region: 'Volcanoes',
    park_id: 'volcanoes',
    rating: 5,
    image: img('1566073771259-6a8506099945'),
    description: 'Singita\'s flagship Rwanda property with eight suites featuring private heated plunge pools, fireplaces, and uninterrupted views of the Virungas.',
    amenities: ['Private Pools', 'Spa', 'Wi-Fi', 'Fireplace', 'All-Inclusive', 'Volcano View'],
    room_types: [{ name: 'Suite', capacity: 2 }, { name: 'Family Villa', capacity: 4 }],
    meal_plans: ['All-Inclusive'],
    pricing: {
      low_season: { pps: 2200, single_supplement: 1000 },
      high_season: { pps: 3200, single_supplement: 1500 },
      peak_season: { pps: 4200, single_supplement: 2000 },
    },
  },
  {
    id: 'mountain_gorilla_view',
    name: 'Mountain Gorilla View Lodge',
    category: 'mid_range',
    type: 'Lodge',
    country: 'Rwanda',
    region: 'Volcanoes',
    park_id: 'volcanoes',
    rating: 4,
    image: img('1520637836862-4d197d17c55a'),
    description: 'Stone cottages with private fireplaces at the foot of the Virungas. Convenient for gorilla permit briefings.',
    amenities: ['Fireplace', 'Wi-Fi', 'Restaurant', 'Bar'],
    room_types: [{ name: 'Cottage', capacity: 2 }],
    meal_plans: ['Full Board'],
    pricing: {
      low_season: { pps: 200, single_supplement: 80 },
      high_season: { pps: 280, single_supplement: 110 },
      peak_season: { pps: 380, single_supplement: 150 },
    },
  },

  // ─── Zanzibar ─────────────────────────────────────────────────────────────
  {
    id: 'park_hyatt_zanzibar',
    name: 'Park Hyatt Zanzibar',
    category: 'beach_resort',
    type: 'Resort',
    country: 'Zanzibar',
    region: 'Zanzibar Stone Town',
    rating: 5,
    image: img('1540541338287-41700207dee6'),
    images: [img('1540541338287-41700207dee6'), img('1519046904884-53103b34b206')],
    description: 'Historic 17th-century Stone Town buildings transformed into a world-class seafront resort with infinity pool, spa and private beach.',
    amenities: ['Private Beach', 'Infinity Pool', 'Spa', 'Wi-Fi', 'Fine Dining', 'Sea View'],
    room_types: [{ name: 'Park King', capacity: 2 }, { name: 'Deluxe Suite', capacity: 2 }, { name: 'Presidential Suite', capacity: 4 }],
    meal_plans: ['B&B', 'Half Board', 'Full Board'],
    pricing: {
      low_season: { pps: 380, single_supplement: 180 },
      high_season: { pps: 580, single_supplement: 280 },
      peak_season: { pps: 820, single_supplement: 400 },
    },
  },
  {
    id: 'zuri_zanzibar',
    name: 'Zuri Zanzibar',
    category: 'beach_resort',
    type: 'Resort',
    country: 'Zanzibar',
    region: 'Zanzibar North',
    rating: 5,
    image: img('1519046904884-53103b34b206'),
    description: 'On the iconic Kendwa beach with thatched bungalows, a 45-metre lap pool and a spa that blends Swahili and Ayurvedic traditions.',
    amenities: ['Beach', 'Pool', 'Spa', 'Wi-Fi', 'Dive Centre', 'Kids Club'],
    room_types: [{ name: 'Garden Bungalow', capacity: 2 }, { name: 'Beachfront Villa', capacity: 2 }, { name: 'Family Suite', capacity: 4 }],
    meal_plans: ['B&B', 'Half Board', 'All-Inclusive'],
    pricing: {
      low_season: { pps: 320, single_supplement: 150 },
      high_season: { pps: 520, single_supplement: 240 },
      peak_season: { pps: 780, single_supplement: 360 },
    },
  },
  {
    id: 'breezes_zanzibar',
    name: 'Breezes Beach Club & Spa',
    category: 'beach_resort',
    type: 'Resort',
    country: 'Zanzibar',
    region: 'Zanzibar East',
    rating: 4,
    image: img('1540541338287-41700207dee6'),
    description: 'An all-inclusive east-coast favourite with Swahili-style rooms, three restaurants, an award-winning spa and kitesurfing on Bwejuu beach.',
    amenities: ['Beach', 'Pool', 'Spa', 'All-Inclusive', 'Kitesurfing', 'Wi-Fi'],
    room_types: [{ name: 'Standard Room', capacity: 2 }, { name: 'Sea Front Room', capacity: 2 }, { name: 'Suite', capacity: 4 }],
    meal_plans: ['B&B', 'Half Board', 'All-Inclusive'],
    pricing: {
      low_season: { pps: 220, single_supplement: 100 },
      high_season: { pps: 340, single_supplement: 160 },
      peak_season: { pps: 480, single_supplement: 220 },
    },
  },
  {
    id: 'kichanga_lodge',
    name: 'Kichanga Lodge',
    category: 'budget',
    type: 'Beach Lodge',
    country: 'Zanzibar',
    region: 'Zanzibar East',
    rating: 3,
    image: img('1518005020951-eccb494ad742'),
    description: 'Simple beachfront bungalows set in tropical gardens. Great value for independent travellers seeking Zanzibar beach atmosphere.',
    amenities: ['Beach', 'Pool', 'Restaurant', 'Bar'],
    room_types: [{ name: 'Garden Bungalow', capacity: 2 }, { name: 'Sea View Room', capacity: 2 }],
    meal_plans: ['B&B', 'Half Board'],
    pricing: {
      low_season: { pps: 90, single_supplement: 30 },
      high_season: { pps: 130, single_supplement: 50 },
      peak_season: { pps: 180, single_supplement: 70 },
    },
  },
];

// ─── ACTIVITIES ──────────────────────────────────────────────────────────────

export const ACTIVITIES = [
  // ─── Game Drives ─────────────────────────────────────────────────────────
  {
    id: 'full_day_game_drive',
    name: 'Full-Day Game Drive',
    category: 'game_drive',
    image: img('1516426122078-c23e76319801'),
    description: 'A full day in the park with lunch boxes, tracking wildlife at dawn and through the cooler afternoon hours for the best chance of big cat and Big Five sightings.',
    duration: '8–10 hours',
    price_per_person: 80,
    min_guests: 1,
    max_guests: 7,
    includes: ['Professional guide', 'Safari vehicle (4x4)', 'Packed lunch', 'Bottled water', 'Binoculars on request'],
    excludes: ['Park entry fees', 'Gratuities', 'Drinks'],
    park_ids: ['serengeti', 'ngorongoro', 'tarangire', 'masai_mara', 'amboseli', 'tsavo_east', 'tsavo_west', 'samburu', 'lake_nakuru', 'meru', 'queen_elizabeth', 'murchison', 'akagera', 'ruaha'],
  },
  {
    id: 'half_day_game_drive',
    name: 'Half-Day Game Drive',
    category: 'game_drive',
    image: img('1547471080-7cc2caa01a7e'),
    description: 'Morning or afternoon drive covering 3–4 hours. Ideal combined with a lodge lunch and pool time.',
    duration: '3–4 hours',
    price_per_person: 50,
    min_guests: 1,
    max_guests: 7,
    includes: ['Guide', '4x4 vehicle', 'Bottled water'],
    excludes: ['Park fees', 'Meals', 'Gratuities'],
    park_ids: ['serengeti', 'ngorongoro', 'tarangire', 'masai_mara', 'amboseli', 'lake_nakuru', 'queen_elizabeth'],
  },
  {
    id: 'night_game_drive',
    name: 'Night Game Drive',
    category: 'game_drive',
    image: img('1534188753412-3e26d0d618d6'),
    description: 'After-dark drive in private conservancies using spotlights to find nocturnal hunters — leopards, hyenas, aardvark, bushbabies and more.',
    duration: '2–3 hours',
    price_per_person: 85,
    min_guests: 2,
    max_guests: 6,
    includes: ['Ranger', 'Spotlight', 'Vehicle', 'Sundowners'],
    excludes: ['Dinner', 'Gratuities'],
    park_ids: ['tarangire', 'akagera', 'nyerere', 'queen_elizabeth'],
  },

  // ─── Walking Safaris ─────────────────────────────────────────────────────
  {
    id: 'walking_safari',
    name: 'Walking Safari',
    category: 'walking',
    image: img('1516426122078-c23e76319801'),
    description: 'Explore the bush on foot with an armed professional guide. Learn to read tracks, identify plants, and experience the small details big-game drives miss.',
    duration: '2–4 hours',
    price_per_person: 65,
    min_guests: 2,
    max_guests: 6,
    includes: ['Armed ranger', 'Professional walking guide', 'Water'],
    excludes: ['Park fees', 'Meals'],
    park_ids: ['arusha', 'nyerere', 'ruaha', 'manyara', 'masai_mara', 'samburu', 'meru', 'akagera'],
  },
  {
    id: 'bush_walk',
    name: 'Guided Bush Walk',
    category: 'walking',
    image: img('1547471080-7cc2caa01a7e'),
    description: 'A shorter guided walk from camp focusing on flora, insects, and spoor interpretation. Perfect introduction to walking safaris.',
    duration: '1–2 hours',
    price_per_person: 35,
    min_guests: 2,
    max_guests: 8,
    includes: ['Guide', 'Walking stick', 'Water'],
    excludes: ['Park fees'],
    park_ids: ['arusha', 'nyerere', 'manyara', 'masai_mara', 'queen_elizabeth', 'akagera'],
  },

  // ─── Trekking ────────────────────────────────────────────────────────────
  {
    id: 'gorilla_trekking',
    name: 'Mountain Gorilla Trekking',
    category: 'trekking',
    image: img('1564868207840-fd02cfd53a96'),
    description: 'A once-in-a-lifetime experience spending one hour with a habituated mountain gorilla family in their natural rainforest habitat.',
    duration: '4–8 hours (1 hour with gorillas)',
    price_per_person: 800,
    min_guests: 1,
    max_guests: 8,
    includes: ['Gorilla permit', 'Park ranger & tracker', 'Porter (optional)', 'Walking sticks'],
    excludes: ['Transport to park', 'Meals', 'Accommodation'],
    park_ids: ['bwindi', 'mgahinga', 'volcanoes'],
  },
  {
    id: 'gorilla_habituation',
    name: 'Gorilla Habituation Experience',
    category: 'trekking',
    image: img('1564868207840-fd02cfd53a96'),
    description: 'Spend up to 4 hours with researchers and trackers as they habituate a semi-wild gorilla family — a deeper, more immersive experience.',
    duration: 'Full day',
    price_per_person: 1500,
    min_guests: 1,
    max_guests: 4,
    includes: ['Permit', 'Researcher', 'Rangers', 'Packed lunch'],
    excludes: ['Transport', 'Accommodation'],
    park_ids: ['bwindi'],
  },
  {
    id: 'chimp_tracking',
    name: 'Chimpanzee Tracking',
    category: 'trekking',
    image: img('1564868207840-fd02cfd53a96'),
    description: 'Track habituated chimpanzees through forest trails, spending up to an hour observing their social dynamics, play and feeding behaviour.',
    duration: '3–5 hours',
    price_per_person: 200,
    min_guests: 1,
    max_guests: 6,
    includes: ['Permit', 'Ranger guide', 'Water'],
    excludes: ['Meals', 'Transport'],
    park_ids: ['kibale', 'queen_elizabeth', 'nyungwe', 'mahale'],
  },
  {
    id: 'kilimanjaro_climb',
    name: 'Kilimanjaro Climb (Machame Route)',
    category: 'trekking',
    image: img('1589308078059-be1415eab4c3'),
    description: '7-day scenic Machame route to Uhuru Peak (5,895 m). Includes all permits, guides, porters, camping equipment and meals on the mountain.',
    duration: '7 days',
    price_per_person: 2400,
    min_guests: 1,
    max_guests: 12,
    includes: ['Park fees', 'Rescue fee', 'Guides & porters', 'All meals on mountain', 'Camping equipment', 'Transport to gate'],
    excludes: ['International flights', 'Tips', 'Personal gear'],
    park_ids: ['kilimanjaro'],
  },
  {
    id: 'mt_meru_climb',
    name: 'Mt Meru 4-Day Climb',
    category: 'trekking',
    image: img('1589308078059-be1415eab4c3'),
    description: 'Tanzania\'s second-highest peak (4,566 m) — a scenic 4-day climb often used as Kilimanjaro acclimatisation. Wildlife on the lower slopes.',
    duration: '4 days',
    price_per_person: 1200,
    min_guests: 1,
    max_guests: 10,
    includes: ['Park fees', 'Armed ranger', 'Guide', 'Porters', 'Meals', 'Hut accommodation'],
    excludes: ['Tips', 'Gear rental'],
    park_ids: ['arusha'],
  },

  // ─── Cultural ────────────────────────────────────────────────────────────
  {
    id: 'maasai_village',
    name: 'Maasai Village Visit',
    category: 'cultural',
    image: img('1516426122078-c23e76319801'),
    description: 'Visit a traditional Maasai boma, learn about their warrior traditions, witness adumu (jumping dance), and see how they live alongside wildlife.',
    duration: '1–2 hours',
    price_per_person: 40,
    min_guests: 2,
    max_guests: 20,
    includes: ['Village entry fee', 'Cultural performance', 'Craft market visit'],
    excludes: ['Handicraft purchases', 'Tips'],
    park_ids: ['serengeti', 'ngorongoro', 'tarangire', 'manyara', 'masai_mara', 'amboseli'],
  },
  {
    id: 'batwa_experience',
    name: 'Batwa Forest Experience',
    category: 'cultural',
    image: img('1547471080-7cc2caa01a7e'),
    description: 'Former forest dwellers guide you through the Bwindi forest, sharing ancient hunting and gathering knowledge, traditional medicine and storytelling.',
    duration: 'Half day',
    price_per_person: 80,
    min_guests: 2,
    max_guests: 10,
    includes: ['Batwa guide', 'Cultural demos', 'Community contribution'],
    excludes: ['Tips', 'Park entry'],
    park_ids: ['bwindi', 'mgahinga'],
  },
  {
    id: 'stone_town_tour',
    name: 'Stone Town Walking Tour',
    category: 'cultural',
    image: img('1540541338287-41700207dee6'),
    description: 'Explore Zanzibar\'s UNESCO-listed old city — Arab, Indian, Persian and European influences in the narrow alleys, markets and historic buildings.',
    duration: '3 hours',
    price_per_person: 35,
    min_guests: 1,
    max_guests: 15,
    includes: ['Guide', 'Market visits', 'House of Wonders entry'],
    excludes: ['Meals', 'Tips'],
    park_ids: [],
  },
  {
    id: 'hadzabe_bushmen',
    name: 'Hadzabe & Datoga Cultural Tour',
    category: 'cultural',
    image: img('1547471080-7cc2caa01a7e'),
    description: 'Spend a morning with the Hadzabe hunter-gatherers near Lake Eyasi — one of Africa\'s last true hunting tribes — then visit the Datoga blacksmiths.',
    duration: 'Half day',
    price_per_person: 70,
    min_guests: 2,
    max_guests: 8,
    includes: ['Guide & interpreter', 'Community fees'],
    excludes: ['Meals', 'Tips'],
    park_ids: [],
  },

  // ─── Water ───────────────────────────────────────────────────────────────
  {
    id: 'kazinga_boat',
    name: 'Kazinga Channel Boat Cruise',
    category: 'water',
    image: img('1534188753412-3e26d0d618d6'),
    description: 'Two-hour boat cruise on the channel linking Lake Edward and Lake George — huge concentrations of hippos, elephants bathing and prolific birdlife.',
    duration: '2 hours',
    price_per_person: 40,
    min_guests: 2,
    max_guests: 20,
    includes: ['Boat ticket', 'Guide', 'Life jacket'],
    excludes: ['Park fees', 'Tips'],
    park_ids: ['queen_elizabeth'],
  },
  {
    id: 'rufiji_boat',
    name: 'Rufiji River Boat Safari',
    category: 'water',
    image: img('1534188753412-3e26d0d618d6'),
    description: 'Cruise Tanzania\'s largest river spotting hippos, crocodiles, elephants at the water\'s edge, and exceptional birdlife — a Nyerere highlight.',
    duration: '3 hours',
    price_per_person: 60,
    min_guests: 2,
    max_guests: 10,
    includes: ['Boat', 'Guide', 'Refreshments'],
    excludes: ['Park fees'],
    park_ids: ['nyerere'],
  },
  {
    id: 'ihema_boat',
    name: 'Lake Ihema Boat Safari',
    category: 'water',
    image: img('1534188753412-3e26d0d618d6'),
    description: 'Scenic boat tour on Akagera\'s largest lake — hippos, crocodiles and papyrus-edge birding including the rare shoebill stork.',
    duration: '1–2 hours',
    price_per_person: 40,
    min_guests: 2,
    max_guests: 12,
    includes: ['Boat', 'Ranger guide'],
    excludes: ['Park fees'],
    park_ids: ['akagera'],
  },
  {
    id: 'snorkelling',
    name: 'Mnemba Atoll Snorkelling',
    category: 'water',
    image: img('1540541338287-41700207dee6'),
    description: 'Boat to the coral atoll off northeast Zanzibar to snorkel with tropical fish, turtles and the occasional dolphin pod.',
    duration: 'Half day',
    price_per_person: 65,
    min_guests: 2,
    max_guests: 10,
    includes: ['Dhow/speedboat', 'Snorkelling gear', 'Refreshments'],
    excludes: ['Lunch', 'Marine park fee'],
    park_ids: [],
  },

  // ─── Aerial ──────────────────────────────────────────────────────────────
  {
    id: 'balloon_safari',
    name: 'Hot-Air Balloon Safari',
    category: 'aerial',
    image: img('1531951651400-1adc3d31fe04'),
    description: 'Dawn lift-off over the plains for an hour of silent, drifting flight. Landing is celebrated with a champagne bush breakfast.',
    duration: '3–4 hours (1 hour flight)',
    price_per_person: 599,
    min_guests: 1,
    max_guests: 16,
    includes: ['Balloon flight', 'Champagne breakfast', 'Flight certificate', 'Transfers'],
    excludes: ['Park fees', 'Gratuities'],
    park_ids: ['serengeti', 'masai_mara', 'tarangire'],
  },
  {
    id: 'scenic_flight',
    name: 'Scenic Bush Flight',
    category: 'aerial',
    image: img('1531951651400-1adc3d31fe04'),
    description: 'Small-plane flight over parks, rift-valley lakes or the Kilimanjaro massif. A quick, spectacular way to cover ground or admire the geography.',
    duration: '30–90 minutes',
    price_per_person: 280,
    min_guests: 2,
    max_guests: 6,
    includes: ['Pilot-guide', 'Flight'],
    excludes: ['Park fees'],
    park_ids: ['serengeti', 'masai_mara', 'amboseli', 'kilimanjaro'],
  },

  // ─── Specialist ──────────────────────────────────────────────────────────
  {
    id: 'big_five_photo',
    name: 'Big Five Photographic Safari',
    category: 'specialist',
    image: img('1516426122078-c23e76319801'),
    description: 'Dedicated photography-focused game drives in an open-sided, specialised vehicle with bean bags, charging points and a pro photographer-guide.',
    duration: 'Full day',
    price_per_person: 280,
    min_guests: 1,
    max_guests: 4,
    includes: ['Pro photo guide', 'Open vehicle', 'Bean bags', 'Lunch', 'Water'],
    excludes: ['Park fees', 'Camera equipment'],
    park_ids: ['serengeti', 'ngorongoro', 'masai_mara', 'samburu'],
  },
  {
    id: 'birdwatching',
    name: 'Dedicated Birdwatching Tour',
    category: 'specialist',
    image: img('1516426122078-c23e76319801'),
    description: 'An expert ornithologist-guide maximises species count. Tanzania, Kenya and Uganda each host 1,000+ species including numerous endemics.',
    duration: 'Full day',
    price_per_person: 110,
    min_guests: 1,
    max_guests: 6,
    includes: ['Expert guide', 'Vehicle', 'Field guide', 'Spotting scope'],
    excludes: ['Park fees', 'Meals'],
    park_ids: ['tarangire', 'manyara', 'lake_nakuru', 'queen_elizabeth', 'murchison', 'nyerere', 'akagera'],
  },
  {
    id: 'rhino_tracking',
    name: 'Black Rhino Tracking on Foot',
    category: 'specialist',
    image: img('1547471080-7cc2caa01a7e'),
    description: 'Track black rhinos on foot with a ranger in a dedicated sanctuary. Rare, adrenaline-charged, and a key conservation-supporting activity.',
    duration: '3–5 hours',
    price_per_person: 180,
    min_guests: 2,
    max_guests: 6,
    includes: ['Armed ranger', 'Walking guide', 'Water'],
    excludes: ['Park fees', 'Meals'],
    park_ids: ['meru', 'tsavo_west', 'akagera'],
  },
  {
    id: 'horseback_safari',
    name: 'Horseback Safari',
    category: 'specialist',
    image: img('1516426122078-c23e76319801'),
    description: 'Ride through the bush on well-trained horses for an entirely new perspective — silent approach makes for close plains-game encounters.',
    duration: '2–4 hours',
    price_per_person: 150,
    min_guests: 1,
    max_guests: 6,
    includes: ['Horse', 'Riding guide', 'Helmet'],
    excludes: ['Park fees', 'Experience requirements'],
    park_ids: ['masai_mara', 'amboseli'],
  },
  {
    id: 'canopy_walk',
    name: 'Nyungwe Canopy Walk',
    category: 'specialist',
    image: img('1564868207840-fd02cfd53a96'),
    description: 'Walk a 200-metre suspension bridge system suspended 60 metres above the rainforest floor for a unique bird\'s-eye view.',
    duration: '2 hours',
    price_per_person: 60,
    min_guests: 1,
    max_guests: 8,
    includes: ['Guide', 'Canopy walk fee'],
    excludes: ['Park fees'],
    park_ids: ['nyungwe'],
  },

  // ─── Dining ──────────────────────────────────────────────────────────────
  {
    id: 'bush_breakfast',
    name: 'Bush Breakfast',
    category: 'dining',
    image: img('1516426122078-c23e76319801'),
    description: 'Cooked breakfast served in the open, usually mid-morning after first light game drives. Champagne optional, views guaranteed.',
    duration: '1 hour',
    price_per_person: 45,
    min_guests: 2,
    max_guests: 20,
    includes: ['Full breakfast', 'Coffee/tea', 'Juices'],
    excludes: ['Alcohol (on request)'],
    park_ids: ['serengeti', 'masai_mara', 'ngorongoro', 'tarangire'],
  },
  {
    id: 'sundowners',
    name: 'Sundowners Bush Experience',
    category: 'dining',
    image: img('1547471080-7cc2caa01a7e'),
    description: 'Evening drinks on a scenic kopje or riverbank as the sun drops and the bush comes alive. Classic safari ritual.',
    duration: '1.5 hours',
    price_per_person: 40,
    min_guests: 2,
    max_guests: 12,
    includes: ['Cocktails', 'Snacks', 'Setup'],
    excludes: ['Dinner'],
    park_ids: ['serengeti', 'ngorongoro', 'tarangire', 'masai_mara', 'ruaha', 'nyerere'],
  },
  {
    id: 'bush_dinner',
    name: 'Private Bush Dinner',
    category: 'dining',
    image: img('1566073771259-6a8506099945'),
    description: 'A candle-lit three-course dinner under the stars in a secluded bush setting with Maasai dancers and fireside storytelling.',
    duration: '2–3 hours',
    price_per_person: 120,
    min_guests: 2,
    max_guests: 16,
    includes: ['3-course meal', 'Wine', 'Maasai performance', 'Transfers'],
    excludes: ['Premium spirits'],
    park_ids: ['serengeti', 'ngorongoro', 'masai_mara'],
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function getParkById(id) {
  return NATIONAL_PARKS.find(p => p.id === id) || null;
}

export function getAccommodationById(id) {
  return ACCOMMODATIONS.find(a => a.id === id) || null;
}

export function getActivityById(id) {
  return ACTIVITIES.find(a => a.id === id) || null;
}

export function getAccommodationsByPark(parkId) {
  return ACCOMMODATIONS.filter(a => a.park_id === parkId);
}

export function getAccommodationsByRegion(region) {
  return ACCOMMODATIONS.filter(a => a.region === region);
}

export function getActivitiesByPark(parkId) {
  return ACTIVITIES.filter(a => a.park_ids?.includes(parkId));
}

export function getParksByCountry(country) {
  if (!country || country === 'All') return NATIONAL_PARKS;
  return NATIONAL_PARKS.filter(p => p.country === country);
}

/**
 * Calculate total park entry fees for a group + duration.
 *
 * @param {Object} opts
 * @param {string} opts.parkId         - Park id (e.g. 'serengeti')
 * @param {number} opts.adults         - Number of adults
 * @param {number} opts.children       - Number of children
 * @param {number} opts.days           - Number of days in the park
 * @param {boolean} opts.resident      - EAC resident pricing if true
 * @param {number} opts.vehicles       - Number of vehicles (default 1)
 * @returns {Object} breakdown + total
 */
export function calculateParkFees({ parkId, adults = 0, children = 0, days = 1, resident = false, vehicles = 1 }) {
  const park = getParkById(parkId);
  if (!park || !park.fees) {
    return { total: 0, breakdown: [], park: null };
  }
  const f = park.fees;
  const adultFee = resident ? (f.resident_adult ?? 0) : (f.non_resident_adult ?? 0);
  const childFee = resident ? (f.resident_child ?? 0) : (f.non_resident_child ?? 0);
  const vehicleFee = f.vehicle_fee ?? 0;

  const breakdown = [];
  if (adults > 0 && adultFee > 0) {
    const amt = adultFee * adults * days;
    breakdown.push({ label: `${resident ? 'Resident' : 'Non-Resident'} Adult × ${adults} × ${days}d`, rate: adultFee, amount: amt });
  }
  if (children > 0 && childFee > 0) {
    const amt = childFee * children * days;
    breakdown.push({ label: `${resident ? 'Resident' : 'Non-Resident'} Child × ${children} × ${days}d`, rate: childFee, amount: amt });
  }
  if (vehicles > 0 && vehicleFee > 0) {
    const amt = vehicleFee * vehicles * days;
    breakdown.push({ label: `Vehicle × ${vehicles} × ${days}d`, rate: vehicleFee, amount: amt });
  }
  const total = breakdown.reduce((s, r) => s + r.amount, 0);
  return { total, breakdown, park };
}

/**
 * Calculate accommodation total for a stay.
 *
 * @param {Object} opts
 * @param {string} opts.accommodationId
 * @param {number} opts.adults
 * @param {number} opts.children
 * @param {number} opts.nights
 * @param {'low_season'|'high_season'|'peak_season'} opts.season
 * @param {boolean} opts.singleTraveller     - add single supplement if true
 * @returns {Object}
 */
export function calculateAccommodationTotal({
  accommodationId, adults = 2, children = 0, nights = 1,
  season = 'low_season', singleTraveller = false,
}) {
  const acc = getAccommodationById(accommodationId);
  if (!acc) return { total: 0, breakdown: [], accommodation: null };
  const seasonData = acc.pricing?.[season];
  if (!seasonData) return { total: 0, breakdown: [], accommodation: acc };

  const pps = seasonData.pps ?? 0;
  const singleSupp = singleTraveller ? (seasonData.single_supplement ?? 0) : 0;
  const childRate = pps * 0.5;
  const breakdown = [];

  if (adults > 0) {
    const amt = pps * adults * nights;
    breakdown.push({ label: `Adult × ${adults} × ${nights}n`, rate: pps, amount: amt });
  }
  if (children > 0) {
    const amt = childRate * children * nights;
    breakdown.push({ label: `Child × ${children} × ${nights}n (50%)`, rate: childRate, amount: amt });
  }
  if (singleSupp > 0) {
    const amt = singleSupp * nights;
    breakdown.push({ label: `Single Supplement × ${nights}n`, rate: singleSupp, amount: amt });
  }
  const total = breakdown.reduce((s, r) => s + r.amount, 0);
  return { total, breakdown, accommodation: acc };
}

/**
 * Calculate activity total for a group.
 */
export function calculateActivityTotal({ activityId, adults = 1, children = 0 }) {
  const act = getActivityById(activityId);
  if (!act || act.price_per_person == null) {
    return { total: 0, breakdown: [], activity: act };
  }
  const rate = act.price_per_person;
  const childRate = rate * 0.7;
  const breakdown = [];
  if (adults > 0) breakdown.push({ label: `Adult × ${adults}`, rate, amount: rate * adults });
  if (children > 0) breakdown.push({ label: `Child × ${children} (70%)`, rate: childRate, amount: childRate * children });
  const total = breakdown.reduce((s, r) => s + r.amount, 0);
  return { total, breakdown, activity: act };
}

export default {
  COUNTRIES,
  REGIONS,
  ACCOMMODATION_CATEGORIES,
  ACTIVITY_CATEGORIES,
  NATIONAL_PARKS,
  ACCOMMODATIONS,
  ACTIVITIES,
  getParkById,
  getAccommodationById,
  getActivityById,
  getAccommodationsByPark,
  getAccommodationsByRegion,
  getActivitiesByPark,
  getParksByCountry,
  calculateParkFees,
  calculateAccommodationTotal,
  calculateActivityTotal,
};
