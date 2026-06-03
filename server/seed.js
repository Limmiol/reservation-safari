/**
 * Seed script — populates data.json with realistic sample data.
 * Run with: node server/seed.js
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.json');

const now = () => new Date().toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString();
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ── IDs ───────────────────────────────────────────────────────────────────────
const clientIds = Array.from({ length: 8 }, () => uuidv4());
const packageIds = Array.from({ length: 6 }, () => uuidv4());
const bookingIds = Array.from({ length: 10 }, () => uuidv4());
const vehicleIds = Array.from({ length: 4 }, () => uuidv4());
const driverIds = Array.from({ length: 4 }, () => uuidv4());
const agentIds = Array.from({ length: 3 }, () => uuidv4());
const quoteIds = Array.from({ length: 5 }, () => uuidv4());
const invoiceIds = Array.from({ length: 5 }, () => uuidv4());
const paymentIds = Array.from({ length: 6 }, () => uuidv4());

// ── Clients ───────────────────────────────────────────────────────────────────
const clients = [
  { id: clientIds[0], full_name: 'James Kariuki', email: 'james.kariuki@email.com', phone: '+254 712 345 678', nationality: 'Kenyan', country: 'Kenya', notes: 'VIP client, prefers luxury tents', created_date: daysAgo(90), updated_date: daysAgo(5), created_by: 'admin@test.com' },
  { id: clientIds[1], full_name: 'Sophie Williams', email: 'sophie.w@gmail.com', phone: '+44 7911 123456', nationality: 'British', country: 'United Kingdom', notes: 'Honeymoon couple, first safari', created_date: daysAgo(60), updated_date: daysAgo(10), created_by: 'admin@test.com' },
  { id: clientIds[2], full_name: 'Marco Rossi', email: 'marco.rossi@outlook.com', phone: '+39 335 1234567', nationality: 'Italian', country: 'Italy', notes: 'Wildlife photographer, needs early game drives', created_date: daysAgo(45), updated_date: daysAgo(8), created_by: 'admin@test.com' },
  { id: clientIds[3], full_name: 'Aisha Mohammed', email: 'aisha.m@yahoo.com', phone: '+971 50 123 4567', nationality: 'Emirati', country: 'UAE', notes: 'Family of 5, requires halal meals', created_date: daysAgo(30), updated_date: daysAgo(3), created_by: 'admin@test.com' },
  { id: clientIds[4], full_name: 'David Chen', email: 'david.chen@tech.com', phone: '+1 415 555 0123', nationality: 'American', country: 'USA', notes: 'Corporate team building, group of 8', created_date: daysAgo(25), updated_date: daysAgo(2), created_by: 'admin@test.com' },
  { id: clientIds[5], full_name: 'Ingrid Larsson', email: 'ingrid.l@nordic.se', phone: '+46 70 123 4567', nationality: 'Swedish', country: 'Sweden', notes: 'Solo traveler, birding enthusiast', created_date: daysAgo(20), updated_date: daysAgo(1), created_by: 'admin@test.com' },
  { id: clientIds[6], full_name: 'Tariq Al-Rashid', email: 'tariq.r@mail.com', phone: '+966 55 123 4567', nationality: 'Saudi', country: 'Saudi Arabia', notes: 'Return client — 3rd booking', created_date: daysAgo(15), updated_date: daysAgo(1), created_by: 'admin@test.com' },
  { id: clientIds[7], full_name: 'Priya Sharma', email: 'priya.sharma@india.in', phone: '+91 98765 43210', nationality: 'Indian', country: 'India', notes: 'Vegetarian meals required', created_date: daysAgo(10), updated_date: now(), created_by: 'admin@test.com' },
];

// ── Packages ──────────────────────────────────────────────────────────────────
const packages = [
  {
    id: packageIds[0], name: 'Serengeti Classic Safari', destination: 'Serengeti, Tanzania',
    duration_days: 5, price_per_person: 2800, status: 'active', category: 'Wildlife',
    description: 'Witness the Great Migration across the vast Serengeti plains. Includes 3 game drives daily in open 4x4 vehicles with expert naturalist guides.',
    includes: 'Accommodation, All meals, Morning & evening game drives, Park fees, Airport transfers, Bottled water',
    excludes: 'International flights, Travel insurance, Visa fees, Personal expenses, Tips, Alcohol',
    max_guests: 8,
    image_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80',
    itinerary_days: JSON.stringify([
      { day: 1, location: 'Arusha → Serengeti', title: 'Arrival & First Game Drive', accommodation: 'Serengeti Sopa Lodge', accommodation_image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80', meals: 'Lunch, Dinner', description: 'Arrive at Kilimanjaro Airport, transfer to Serengeti via scenic Ngorongoro highlands. Enjoy an afternoon game drive through the southern plains.', activities: ['Airport pickup & briefing', 'Scenic drive through Ngorongoro highlands', 'Afternoon game drive — southern plains', 'Sundowner drinks at kopje viewpoint'], activity_image: 'https://images.unsplash.com/photo-1547970810-dc1eac37d174?w=600&q=80' },
      { day: 2, location: 'Central Serengeti', title: 'Great Migration Search', accommodation: 'Serengeti Sopa Lodge', accommodation_image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80', meals: 'Breakfast, Lunch, Dinner', description: 'Full-day game drives in search of the wildebeest migration. Big cat sightings are common on the open plains.', activities: ['Early morning game drive (06:00)', 'Migration herd tracking', 'Bush picnic lunch', 'Evening lion & cheetah search', 'Stargazing at camp'], activity_image: 'https://images.unsplash.com/photo-1555086016-c2e5ab66e16c?w=600&q=80' },
      { day: 3, location: 'Seronera Valley', title: 'Big Five & Predators', accommodation: 'Serengeti Sopa Lodge', accommodation_image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80', meals: 'Breakfast, Lunch, Dinner', description: 'Seronera is one of Africa\'s best wildlife viewing areas. Leopards rest in sausage trees along the river.', activities: ['River drive — leopard spotting', 'Hippo pool visit', 'Balloon safari (optional, extra cost)', 'Sundowner at baobab grove'], activity_image: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=600&q=80' },
      { day: 4, location: 'Northern Serengeti', title: 'River Crossing Spectacle', accommodation: 'Sayari Camp', accommodation_image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80', meals: 'Breakfast, Lunch, Dinner', description: 'Drive north to witness the dramatic Mara River crossings (seasonal). Thousands of wildebeest brave crocodiles.', activities: ['Transfer to northern Serengeti', 'Mara River crossing viewpoint', 'Crocodile pool observation', 'Sundowner on the Mara escarpment'], activity_image: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&q=80' },
      { day: 5, location: 'Serengeti → Arusha', title: 'Farewell Game Drive & Departure', accommodation: 'N/A (Departure day)', accommodation_image: '', meals: 'Breakfast', description: 'Final morning game drive before transferring to the airstrip for your departure flight.', activities: ['Early farewell game drive', 'Transfer to Seronera airstrip', 'Scenic flight to Arusha (or Kilimanjaro)', 'Departure'], activity_image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80' },
    ]),
    created_date: daysAgo(120), updated_date: daysAgo(10), created_by: 'admin@test.com',
  },
  {
    id: packageIds[1], name: 'Masai Mara Explorer', destination: 'Masai Mara, Kenya',
    duration_days: 4, price_per_person: 2200, status: 'active', category: 'Wildlife',
    description: 'Experience Kenya\'s most iconic reserve. Daily big cat sightings, the wildebeest migration, and authentic Maasai cultural encounters.',
    includes: 'Tented camp accommodation, Full board meals, Morning & evening game drives, Maasai village visit, Park fees',
    excludes: 'International flights, Visa, Tips, Alcohol, Personal purchases',
    max_guests: 6,
    image_url: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80',
    itinerary_days: JSON.stringify([
      { day: 1, location: 'Nairobi → Masai Mara', title: 'Arrival & Afternoon Drive', accommodation: 'Mara Intrepids Tented Camp', accommodation_image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80', meals: 'Lunch, Dinner', description: 'Morning flight or road transfer from Nairobi to the Masai Mara. Check in and enjoy an afternoon game drive across the rolling savannah.', activities: ['Nairobi pickup & transfer', 'Camp check-in & briefing', 'Afternoon game drive', 'Campfire dinner under the stars'], activity_image: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=600&q=80' },
      { day: 2, location: 'Masai Mara Game Reserve', title: 'Big Cats & The Migration', accommodation: 'Mara Intrepids Tented Camp', accommodation_image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80', meals: 'Breakfast, Lunch, Dinner', description: 'Full day in the reserve with expert Maasai guides. The Triangle is famous for resident cheetah, lion prides and the annual wildebeest migration.', activities: ['Dawn game drive — lion pride tracking', 'Cheetah & leopard search', 'Bush picnic lunch in the reserve', 'Afternoon predator monitoring', 'Sundowner on the Mara escarpment'], activity_image: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&q=80' },
      { day: 3, location: 'Masai Mara & Maasai Village', title: 'Culture & Wildlife', accommodation: 'Mara Intrepids Tented Camp', accommodation_image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80', meals: 'Breakfast, Lunch, Dinner', description: 'Morning game drive followed by an immersive visit to an authentic Maasai boma village.', activities: ['Morning game drive', 'Maasai village visit & cultural tour', 'Traditional dance performance', 'Evening nature walk with armed scout'], activity_image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&q=80' },
      { day: 4, location: 'Masai Mara → Nairobi', title: 'Final Drive & Departure', accommodation: 'N/A (Departure day)', accommodation_image: '', meals: 'Breakfast', description: 'A last morning game drive before the transfer back to Nairobi or onwards to your next destination.', activities: ['Early farewell game drive', 'Transfer to Mara airstrip or Nairobi', 'Departure transfers'], activity_image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=80' },
    ]),
    created_date: daysAgo(110), updated_date: daysAgo(5), created_by: 'admin@test.com',
  },
  {
    id: packageIds[2], name: 'Ngorongoro Crater Luxury', destination: 'Ngorongoro, Tanzania',
    duration_days: 3, price_per_person: 3500, status: 'active', category: 'Luxury',
    description: 'Descend into the world\'s largest intact volcanic caldera — a natural fortress home to the Big Five, flamingos, and 30,000 animals.',
    includes: 'Luxury crater lodge, All meals & drinks, Full-day crater game drive, Conservation fee, Transfers',
    excludes: 'International flights, Travel insurance, Personal expenses',
    max_guests: 4,
    image_url: 'https://images.unsplash.com/photo-1612559959680-5d8ed41a8e74?w=800&q=80',
    itinerary_days: JSON.stringify([
      { day: 1, location: 'Arusha → Ngorongoro', title: 'Arrival & Crater Rim Sunset', accommodation: 'Ngorongoro Crater Lodge', accommodation_image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80', meals: 'Lunch, Dinner', description: 'Transfer from Arusha to the Ngorongoro highlands. Check into your luxury crater rim lodge with sweeping caldera views.', activities: ['Arusha pickup & transfer', 'Maasai boma stop en route', 'Crater rim viewpoint sunset walk', 'Gourmet welcome dinner'], activity_image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80' },
      { day: 2, location: 'Ngorongoro Crater Floor', title: 'Full-Day Crater Drive — Big Five', accommodation: 'Ngorongoro Crater Lodge', accommodation_image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80', meals: 'Breakfast, Picnic Lunch, Dinner', description: 'Descend 600m to the crater floor for a full day game drive. The crater\'s dense ecosystem makes Big Five sightings almost guaranteed.', activities: ['Early descent to crater floor', 'Black rhino search — Lerai Forest', 'Lion pride & hyena clan observations', 'Flamingo flocks at Lake Magadi', 'Picnic lunch at hippo pool', 'Black-maned lion territory drive', 'Crater ascent at sunset'], activity_image: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=600&q=80' },
      { day: 3, location: 'Ngorongoro → Arusha', title: 'Morning Crater Walk & Departure', accommodation: 'N/A (Departure day)', accommodation_image: '', meals: 'Breakfast', description: 'Optional guided crater rim walk before transferring back to Arusha for your onward journey.', activities: ['Crater rim nature walk', 'Bird watching — endemic species', 'Transfer to Arusha & departure'], activity_image: 'https://images.unsplash.com/photo-1612559959680-5d8ed41a8e74?w=600&q=80' },
    ]),
    created_date: daysAgo(100), updated_date: daysAgo(3), created_by: 'admin@test.com',
  },
  {
    id: packageIds[3], name: 'Amboseli & Kilimanjaro View', destination: 'Amboseli, Kenya',
    duration_days: 3, price_per_person: 1800, status: 'active', category: 'Wildlife',
    description: 'Iconic elephant herds framed against the snow-capped peak of Kilimanjaro — Africa\'s most photographed scene.',
    includes: 'Eco lodge accommodation, All meals, Game drives, Park fees, Transfers',
    excludes: 'International flights, Personal items, Visa fees',
    max_guests: 6,
    image_url: 'https://images.unsplash.com/photo-1549366021-9f761d450615?w=800&q=80',
    itinerary_days: JSON.stringify([
      { day: 1, location: 'Nairobi → Amboseli', title: 'Arrival & Elephant Families', accommodation: 'Amboseli Serena Safari Lodge', accommodation_image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80', meals: 'Lunch, Dinner', description: 'Drive from Nairobi through Maasai lands to Amboseli. Afternoon game drive to spot the famous large-tusked elephant herds.', activities: ['Nairobi pickup & transfer', 'Maasai roadside market stop', 'Afternoon elephant tracking drive', 'Sundowner at Observation Hill'], activity_image: 'https://images.unsplash.com/photo-1549366021-9f761d450615?w=600&q=80' },
      { day: 2, location: 'Amboseli National Park', title: 'Kilimanjaro Dawn & Full Park Drive', accommodation: 'Amboseli Serena Safari Lodge', accommodation_image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80', meals: 'Breakfast, Lunch, Dinner', description: 'Early morning drive to catch clear Kilimanjaro views before clouds build. The swamp areas hold buffalo, hippos and hundreds of bird species.', activities: ['Dawn Kilimanjaro photography drive', 'Swamp game drive — hippos & buffalo', 'Bird watching at Enkongo Narok Swamp', 'Afternoon lion tracking', 'Sunset Kilimanjaro backdrop photos'], activity_image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600&q=80' },
      { day: 3, location: 'Amboseli → Nairobi', title: 'Final Drive & Departure', accommodation: 'N/A (Departure day)', accommodation_image: '', meals: 'Breakfast', description: 'Final morning drive before transferring back to Nairobi in time for your afternoon or evening departure flight.', activities: ['Early morning game drive', 'Maasai cultural stop', 'Transfer to Nairobi airport'], activity_image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=80' },
    ]),
    created_date: daysAgo(90), updated_date: daysAgo(7), created_by: 'admin@test.com',
  },
  {
    id: packageIds[4], name: 'Zanzibar Beach & Safari Combo', destination: 'Zanzibar + Selous, Tanzania',
    duration_days: 8, price_per_person: 4200, status: 'active', category: 'Beach & Safari',
    description: '4 nights of raw bush adventure in the Selous followed by 4 nights of pure Indian Ocean paradise in Zanzibar.',
    includes: 'All accommodation, Meals, Game drives, Boat safari, Snorkelling, Airport transfers',
    excludes: 'International flights, Visa fees, Travel insurance, Personal expenses',
    max_guests: 10,
    image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    itinerary_days: JSON.stringify([
      { day: 1, location: 'Dar es Salaam → Selous', title: 'Bush Arrival & First Drive', accommodation: 'Selous Impala Camp', accommodation_image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80', meals: 'Lunch, Dinner', description: 'Fly into the Selous Game Reserve — Africa\'s largest protected wilderness. Afternoon game drive along the Rufiji River banks.', activities: ['Flight to Selous airstrip', 'Camp check-in & wildlife briefing', 'Afternoon game drive — Rufiji River', 'Hippo & crocodile river watch'], activity_image: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&q=80' },
      { day: 2, location: 'Selous Game Reserve', title: 'Boat Safari on Rufiji River', accommodation: 'Selous Impala Camp', accommodation_image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80', meals: 'Breakfast, Lunch, Dinner', description: 'A unique boat safari lets you experience wildlife from the water — drifting silently past hippo pods, crocodiles and waterbirds.', activities: ['Early morning game drive', 'Boat safari on Lake Tagalala', 'Hippo pod encounters', 'African fish eagle sightings', 'Evening bush walk with armed ranger'], activity_image: 'https://images.unsplash.com/photo-1555086016-c2e5ab66e16c?w=600&q=80' },
      { day: 3, location: 'Selous Game Reserve', title: 'Wild Dog & Big Predator Search', accommodation: 'Selous Impala Camp', accommodation_image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80', meals: 'Breakfast, Lunch, Dinner', description: 'Selous is one of the last strongholds of the African wild dog. Full day drives maximize sighting opportunities.', activities: ['Wild dog territory drive', 'Elephant family observations', 'Baobab grove photography stop', 'Sundowner on the floodplains'], activity_image: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=600&q=80' },
      { day: 4, location: 'Selous Game Reserve', title: 'Final Bush Drive', accommodation: 'Selous Impala Camp', accommodation_image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80', meals: 'Breakfast, Lunch, Dinner', description: 'Last morning in the Selous — a final game drive before preparing for tomorrow\'s flight to Zanzibar.', activities: ['Early morning game drive', 'Bush breakfast in the wild', 'Afternoon relaxation at camp', 'Campfire farewell dinner'], activity_image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=80' },
      { day: 5, location: 'Selous → Zanzibar', title: 'Island Arrival & Stone Town', accommodation: 'The Zanzibar Palace Hotel', accommodation_image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80', meals: 'Lunch, Dinner', description: 'Morning flight to Zanzibar. Afternoon guided tour of UNESCO World Heritage Stone Town — spice markets, Arab forts and Freddie Mercury\'s birthplace.', activities: ['Morning flight to Zanzibar', 'Stone Town heritage walking tour', 'Spice market & Old Fort visit', 'Sunset Dhow harbour cruise'], activity_image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' },
      { day: 6, location: 'North Zanzibar — Nungwi Beach', title: 'Snorkelling & Beach Day', accommodation: 'Nungwi Dreams Beach Resort', accommodation_image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80', meals: 'Breakfast, Lunch, Dinner', description: 'Transfer to the pristine northern beaches. Snorkelling in turquoise coral reefs with tropical fish, dolphins and sea turtles.', activities: ['Transfer to Nungwi Beach', 'Snorkelling at Mnemba Atoll', 'Dolphin watching boat trip', 'Sea turtle sanctuary visit', 'Beach volleyball & relaxation'], activity_image: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=600&q=80' },
      { day: 7, location: 'Zanzibar — Spice Tour', title: 'Spice Farm & Cultural Immersion', accommodation: 'Nungwi Dreams Beach Resort', accommodation_image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80', meals: 'Breakfast, Lunch, Dinner', description: 'Guided spice farm tour showing cloves, vanilla, nutmeg and cinnamon. Traditional Swahili cooking class in the evening.', activities: ['Spice farm guided tour', 'Taste & identify 20+ spices', 'Swahili cooking class', 'Traditional Taarab music evening'], activity_image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' },
      { day: 8, location: 'Zanzibar → Departure', title: 'Last Beach Morning & Departure', accommodation: 'N/A (Departure day)', accommodation_image: '', meals: 'Breakfast', description: 'Final morning on the white sand before transfer to Zanzibar International Airport for your departure flight.', activities: ['Sunrise beach walk', 'Final swim in the Indian Ocean', 'Transfer to Zanzibar Airport', 'Departure'], activity_image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' },
    ]),
    created_date: daysAgo(80), updated_date: daysAgo(2), created_by: 'admin@test.com',
  },
  {
    id: packageIds[5], name: 'Bwindi Gorilla Trekking', destination: 'Bwindi, Uganda',
    duration_days: 4, price_per_person: 5500, status: 'active', category: 'Primate',
    description: 'A once-in-a-lifetime hour with habituated mountain gorilla families in their natural rainforest habitat in Bwindi Impenetrable Forest.',
    includes: 'Lodge accommodation, Full board meals, Gorilla trekking permit ($700 value), Expert trekking guide, Park fees',
    excludes: 'International flights, Uganda visa, Travel insurance, Tips, Personal expenses',
    max_guests: 8,
    image_url: 'https://images.unsplash.com/photo-1585970480901-90d6bb2a48b5?w=800&q=80',
    itinerary_days: JSON.stringify([
      { day: 1, location: 'Entebbe/Kampala → Bwindi', title: 'Arrival & Forest Orientation', accommodation: "Bwindi Lodge", accommodation_image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80', meals: 'Lunch, Dinner', description: 'Scenic road transfer to Bwindi Impenetrable Forest National Park. Arrive at your forest lodge for a gorilla trekking briefing.', activities: ['Transfer from Entebbe/Kampala', 'Bwindi community village walk', 'Gorilla trekking pre-briefing', 'Dinner & accommodation overview'], activity_image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&q=80' },
      { day: 2, location: 'Bwindi Impenetrable Forest', title: 'Gorilla Trekking Day', accommodation: "Bwindi Lodge", accommodation_image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80', meals: 'Breakfast, Packed Lunch, Dinner', description: 'The main event. Trek through dense rainforest with rangers to spend a magical hour with a habituated gorilla family — silverbacks, mothers and playful juveniles.', activities: ['Trekking briefing at 07:30', 'Rainforest trek (2–8 hours depending on gorilla location)', '1-hour visit with gorilla family', 'Silverback behavior observation', 'Return trek & certificate presentation', 'Celebration dinner at lodge'], activity_image: 'https://images.unsplash.com/photo-1585970480901-90d6bb2a48b5?w=600&q=80' },
      { day: 3, location: 'Bwindi & Batwa Community', title: 'Chimp Tracking & Cultural Experience', accommodation: "Bwindi Lodge", accommodation_image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80', meals: 'Breakfast, Lunch, Dinner', description: 'Optional chimpanzee tracking in Kibale (add-on) or an in-depth Batwa Pygmy cultural experience — the original forest people of Bwindi.', activities: ['Optional chimp habituation experience', 'Batwa indigenous community visit', 'Traditional forest-life demonstration', 'Medicinal plant forest walk', 'Craft market & souvenir shopping'], activity_image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&q=80' },
      { day: 4, location: 'Bwindi → Departure', title: 'Morning Birding & Departure', accommodation: 'N/A (Departure day)', accommodation_image: '', meals: 'Breakfast', description: 'Bwindi is a birding paradise with over 350 species. Final morning birdwalk before the transfer back to Entebbe.', activities: ['Sunrise birding walk — Albertine Rift endemics', 'African green broadbill search', 'Transfer to Entebbe/Kampala', 'Departure'], activity_image: 'https://images.unsplash.com/photo-1585970480901-90d6bb2a48b5?w=600&q=80' },
    ]),
    created_date: daysAgo(70), updated_date: now(), created_by: 'admin@test.com',
  },
];

// ── Bookings ──────────────────────────────────────────────────────────────────
const bookingStatuses = ['confirmed', 'confirmed', 'in_progress', 'completed', 'quoted', 'inquiry', 'confirmed', 'completed', 'confirmed', 'in_progress'];
const bookings = bookingIds.map((id, i) => {
  const pkg = packages[i % packages.length];
  const client = clients[i % clients.length];
  const guests = randInt(1, 4);
  const total = pkg.price_per_person * guests;
  const paid = bookingStatuses[i] === 'completed' ? total : bookingStatuses[i] === 'confirmed' ? Math.round(total * 0.5) : 0;
  const startDays = i < 4 ? -randInt(5, 30) : randInt(10, 60);
  return {
    id, booking_ref: `RS-2024-${String(i + 1).padStart(3, '0')}`,
    client_id: client.id, client_name: client.full_name, client_email: client.email,
    package_id: pkg.id, package_name: pkg.name,
    status: bookingStatuses[i],
    num_guests: guests,
    start_date: daysFromNow(startDays),
    end_date: daysFromNow(startDays + pkg.duration_days),
    total_amount: total, amount_paid: paid,
    booking_source: rand(['direct', 'agent', 'ota', 'referral']),
    special_requests: i % 3 === 0 ? 'Vegetarian meals preferred' : i % 3 === 1 ? 'Early morning game drive requested' : '',
    driver_id: driverIds[i % driverIds.length],
    vehicle_id: vehicleIds[i % vehicleIds.length],
    created_date: daysAgo(60 - i * 5), updated_date: daysAgo(i * 2), created_by: 'admin@test.com',
  };
});

// ── Payments ──────────────────────────────────────────────────────────────────
const payments = paymentIds.map((id, i) => {
  const booking = bookings[i % bookings.length];
  return {
    id,
    payment_ref: `PAY-2024-${String(i + 1).padStart(3, '0')}`,
    booking_id: booking.id,
    booking_ref: booking.booking_ref,
    client_id: booking.client_id,
    client_name: booking.client_name,
    amount: i < 3 ? booking.total_amount : Math.round(booking.total_amount * 0.5),
    method: rand(['bank_transfer', 'credit_card', 'cash', 'mpesa']),
    status: 'confirmed',
    payment_date: daysAgo(randInt(1, 30)),
    invoice_number: `INV-2024-${String(i + 1).padStart(3, '0')}`,
    notes: 'Payment received and confirmed',
    created_date: daysAgo(30 - i * 4), updated_date: daysAgo(i), created_by: 'admin@test.com',
  };
});

// ── Quotes ────────────────────────────────────────────────────────────────────
const quotes = quoteIds.map((id, i) => {
  const client = clients[i];
  const pkg = packages[i % packages.length];
  const guests = randInt(1, 4);
  const subtotal = pkg.price_per_person * guests;
  const tax = Math.round(subtotal * 0.16);
  return {
    id,
    quote_number: `QT-2024-${String(i + 1).padStart(3, '0')}`,
    client_id: client.id, client_name: client.full_name, client_email: client.email,
    package_id: pkg.id, package_name: pkg.name,
    num_guests: guests,
    subtotal, tax, total: subtotal + tax,
    currency: 'USD',
    status: rand(['draft', 'sent', 'accepted', 'expired']),
    valid_until: daysFromNow(randInt(7, 30)),
    notes: 'Quote includes all park fees. Price valid for dates specified.',
    created_date: daysAgo(20 - i * 3), updated_date: daysAgo(i), created_by: 'admin@test.com',
  };
});

// ── Invoices ──────────────────────────────────────────────────────────────────
const invoices = invoiceIds.map((id, i) => {
  const booking = bookings[i];
  const subtotal = booking.total_amount;
  const tax = Math.round(subtotal * 0.16);
  return {
    id,
    invoice_number: `INV-2024-${String(i + 1).padStart(3, '0')}`,
    booking_id: booking.id, booking_ref: booking.booking_ref,
    client_id: booking.client_id, client_name: booking.client_name, client_email: booking.client_email,
    subtotal, tax, total: subtotal + tax,
    currency: 'USD',
    status: rand(['draft', 'sent', 'paid', 'overdue']),
    due_date: daysFromNow(randInt(-5, 20)),
    notes: 'Payment due within 14 days of invoice date.',
    created_date: daysAgo(25 - i * 3), updated_date: daysAgo(i), created_by: 'admin@test.com',
  };
});

// ── Vehicles ──────────────────────────────────────────────────────────────────
const vehicles = [
  { id: vehicleIds[0], name: 'Land Cruiser 001', make: 'Toyota', model: 'Land Cruiser 78', year: 2021, plate: 'KCB 123A', type: 'safari_vehicle', capacity: 7, status: 'operational', fuel_type: 'diesel', color: 'White', mileage: 45000, last_service_date: daysAgo(30), notes: 'Pop-up roof, charging ports', created_date: daysAgo(200), updated_date: daysAgo(5), created_by: 'admin@test.com' },
  { id: vehicleIds[1], name: 'Land Cruiser 002', make: 'Toyota', model: 'Land Cruiser 79', year: 2022, plate: 'KCB 456B', type: 'safari_vehicle', capacity: 7, status: 'operational', fuel_type: 'diesel', color: 'Olive Green', mileage: 28000, last_service_date: daysAgo(15), notes: 'New vehicle, extended wheelbase', created_date: daysAgo(180), updated_date: daysAgo(2), created_by: 'admin@test.com' },
  { id: vehicleIds[2], name: 'Range Rover VIP', make: 'Land Rover', model: 'Range Rover Sport', year: 2023, plate: 'KDC 789C', type: 'transfer_vehicle', capacity: 5, status: 'operational', fuel_type: 'petrol', color: 'Black', mileage: 12000, last_service_date: daysAgo(7), notes: 'VIP transfers only', created_date: daysAgo(150), updated_date: daysAgo(1), created_by: 'admin@test.com' },
  { id: vehicleIds[3], name: 'Minibus Safari', make: 'Toyota', model: 'HiAce', year: 2020, plate: 'KCC 321D', type: 'group_vehicle', capacity: 12, status: 'maintenance', fuel_type: 'diesel', color: 'White', mileage: 78000, last_service_date: daysAgo(60), notes: 'Scheduled for service — roof hatch repair', created_date: daysAgo(250), updated_date: daysAgo(3), created_by: 'admin@test.com' },
];

// ── Drivers ───────────────────────────────────────────────────────────────────
const drivers = [
  { id: driverIds[0], full_name: 'Samuel Omondi', email: 'samuel.o@rs.com', phone: '+254 722 111222', license_number: 'DL-KE-2019-445', license_expiry: daysFromNow(365), status: 'available', years_experience: 8, languages: 'English, Swahili, French', rating: 4.9, specialization: 'Big Five tracking', created_date: daysAgo(300), updated_date: daysAgo(1), created_by: 'admin@test.com' },
  { id: driverIds[1], full_name: 'Peter Mutua', email: 'peter.m@rs.com', phone: '+254 733 222333', license_number: 'DL-KE-2020-678', license_expiry: daysFromNow(180), status: 'on_trip', years_experience: 6, languages: 'English, Swahili, German', rating: 4.7, specialization: 'Night drives, Bird watching', created_date: daysAgo(280), updated_date: daysAgo(2), created_by: 'admin@test.com' },
  { id: driverIds[2], full_name: 'Grace Wanjiru', email: 'grace.w@rs.com', phone: '+254 744 333444', license_number: 'DL-KE-2021-901', license_expiry: daysFromNow(400), status: 'available', years_experience: 4, languages: 'English, Swahili, Italian', rating: 4.8, specialization: 'Photography safari guide', created_date: daysAgo(250), updated_date: now(), created_by: 'admin@test.com' },
  { id: driverIds[3], full_name: 'Hassan Juma', email: 'hassan.j@rs.com', phone: '+254 755 444555', license_number: 'DL-KE-2018-234', license_expiry: daysFromNow(90), status: 'off_duty', years_experience: 10, languages: 'English, Swahili, Arabic', rating: 4.6, specialization: 'Cultural tours, Coastal routes', created_date: daysAgo(350), updated_date: daysAgo(5), created_by: 'admin@test.com' },
];

// ── Equipment ─────────────────────────────────────────────────────────────────
const equipment = [
  { id: uuidv4(), name: 'Binoculars Set A', type: 'optics', quantity: 8, condition: 'excellent', status: 'available', brand: 'Nikon', model: '10x42 Monarch', notes: 'For client use during game drives', created_date: daysAgo(200), updated_date: daysAgo(10), created_by: 'admin@test.com' },
  { id: uuidv4(), name: 'Camping Tents (4-man)', type: 'camping', quantity: 6, condition: 'good', status: 'available', brand: 'MSR', model: 'Hubba Hubba', notes: 'Used for fly camping excursions', created_date: daysAgo(180), updated_date: daysAgo(5), created_by: 'admin@test.com' },
  { id: uuidv4(), name: 'Portable Fridge', type: 'kitchen', quantity: 3, condition: 'good', status: 'in_use', brand: 'Engel', model: '40L 12V', notes: '2 currently deployed on active trips', created_date: daysAgo(150), updated_date: daysAgo(2), created_by: 'admin@test.com' },
  { id: uuidv4(), name: 'Spotlights (Night Drive)', type: 'lighting', quantity: 4, condition: 'excellent', status: 'available', brand: 'Lightforce', model: 'Blitz 240', notes: 'LED upgrade completed', created_date: daysAgo(120), updated_date: daysAgo(7), created_by: 'admin@test.com' },
  { id: uuidv4(), name: 'First Aid Kits', type: 'safety', quantity: 5, condition: 'excellent', status: 'available', brand: 'Adventure Medical', model: 'Expedition', notes: 'Restocked monthly', created_date: daysAgo(100), updated_date: daysAgo(3), created_by: 'admin@test.com' },
];

// ── Agents ────────────────────────────────────────────────────────────────────
const agents = agentIds.map((id, i) => ({
  id,
  name: ['Safari World Agency', 'Wild Africa Tours', 'Explore East Africa'][i],
  contact_name: ['Robert Ndegwa', 'Fatima Hassan', 'Chris Thompson'][i],
  email: [`robert@safariworld.com`, `fatima@wildafrica.com`, `chris@exploreea.com`][i],
  phone: [`+254 700 100200`, `+254 711 200300`, `+254 722 300400`][i],
  country: ['Kenya', 'Tanzania', 'UK'][i],
  commission_rate: [10, 12, 15][i],
  status: 'active',
  notes: `Established partner since ${2020 + i}`,
  created_date: daysAgo(200 - i * 20), updated_date: daysAgo(i * 5), created_by: 'admin@test.com',
}));

// ── OTAs ──────────────────────────────────────────────────────────────────────
const otas = [
  { id: uuidv4(), name: 'SafariBookings.com', commission_rate: 18, status: 'active', contact_email: 'partners@safaribookings.com', bookings_count: 24, created_date: daysAgo(300), updated_date: daysAgo(10), created_by: 'admin@test.com' },
  { id: uuidv4(), name: 'Viator', commission_rate: 20, status: 'active', contact_email: 'operators@viator.com', bookings_count: 15, created_date: daysAgo(250), updated_date: daysAgo(5), created_by: 'admin@test.com' },
  { id: uuidv4(), name: 'GetYourGuide', commission_rate: 20, status: 'active', contact_email: 'suppliers@getyourguide.com', bookings_count: 9, created_date: daysAgo(200), updated_date: daysAgo(3), created_by: 'admin@test.com' },
];

// ── Expenses ──────────────────────────────────────────────────────────────────
const expenseCategories = ['fuel', 'maintenance', 'accommodation', 'food', 'park_fees', 'staff', 'marketing'];
const expenses = Array.from({ length: 10 }, (_, i) => ({
  id: uuidv4(),
  title: [`Fuel for Land Cruiser 001`, `Vehicle service — LC002`, `Staff accommodation`, `Client meals — Serengeti`, `Serengeti Park fees`, `Driver allowances`, `Facebook ads campaign`, `Office supplies`, `Insurance renewal`, `Tyre replacement`][i],
  category: expenseCategories[i % expenseCategories.length],
  amount: [850, 1200, 600, 450, 2400, 900, 500, 120, 3200, 480][i],
  currency: 'USD',
  date: daysAgo(randInt(1, 60)),
  status: rand(['paid', 'paid', 'pending']),
  vendor: [`Total Kenya`, `Toyota Service`, `Acacia Lodge`, `Carnivore Restaurant`, `TANAPA`, `Staff`, `Meta`, `Staples`, `AAR Insurance`, `Bridgestone`][i],
  booking_id: i < 5 ? bookings[i].id : null,
  notes: '',
  created_date: daysAgo(60 - i * 5), updated_date: daysAgo(i), created_by: 'admin@test.com',
}));

// ── Income ────────────────────────────────────────────────────────────────────
const incomeEntries = Array.from({ length: 8 }, (_, i) => ({
  id: uuidv4(),
  title: [`Booking deposit — ${bookings[i % bookings.length].booking_ref}`, `Final payment — ${bookings[(i + 1) % bookings.length].booking_ref}`, `Agent commission received`, `Corporate group booking`, `Photography workshop fee`, `Gorilla trek balance`, `Travel consultation fee`, `Cancellation penalty`][i],
  category: rand(['booking_payment', 'deposit', 'agent_commission', 'other']),
  amount: [1400, 2800, 420, 8400, 750, 5500, 200, 350][i],
  currency: 'USD',
  date: daysAgo(randInt(1, 50)),
  booking_id: bookings[i % bookings.length].id,
  notes: '',
  created_date: daysAgo(50 - i * 5), updated_date: daysAgo(i), created_by: 'admin@test.com',
}));

// ── Testimonials ──────────────────────────────────────────────────────────────
const testimonials = [
  { id: uuidv4(), client_name: 'Sophie Williams', client_country: 'UK', rating: 5, review: 'Absolutely magical! Our honeymoon safari exceeded every expectation. Samuel was an incredible guide — he found lions, leopards and a cheetah in one day!', package_name: 'Masai Mara Explorer', status: 'approved', featured: true, created_date: daysAgo(40), updated_date: daysAgo(2), created_by: 'admin@test.com' },
  { id: uuidv4(), client_name: 'Marco Rossi', client_country: 'Italy', rating: 5, review: 'As a wildlife photographer, I needed a guide who understood my needs. Grace was phenomenal — patient, knowledgeable, and always positioned the vehicle perfectly for shots.', package_name: 'Serengeti Classic Safari', status: 'approved', featured: true, created_date: daysAgo(35), updated_date: daysAgo(3), created_by: 'admin@test.com' },
  { id: uuidv4(), client_name: 'David Chen', client_country: 'USA', rating: 4, review: 'Great experience for our team. The Ngorongoro Crater was breathtaking. Organization was flawless — everything ran on time.', package_name: 'Ngorongoro Crater Luxury', status: 'approved', featured: false, created_date: daysAgo(25), updated_date: daysAgo(1), created_by: 'admin@test.com' },
  { id: uuidv4(), client_name: 'Ingrid Larsson', client_country: 'Sweden', rating: 5, review: 'I counted over 180 bird species in 4 days! Hassan is the most knowledgeable birding guide I have ever had. Will definitely return.', package_name: 'Amboseli & Kilimanjaro View', status: 'pending', featured: false, created_date: daysAgo(10), updated_date: daysAgo(1), created_by: 'admin@test.com' },
];

// ── Messages ──────────────────────────────────────────────────────────────────
const messages = [
  { id: uuidv4(), client_id: clientIds[0], client_name: 'James Kariuki', subject: 'Booking Confirmation Request', content: 'Hello, I would like to confirm my upcoming safari booking for next month. Could you please send me the full itinerary?', type: 'inquiry', status: 'read', direction: 'inbound', created_date: daysAgo(5), updated_date: daysAgo(4), created_by: 'admin@test.com' },
  { id: uuidv4(), client_id: clientIds[1], client_name: 'Sophie Williams', subject: 'Honeymoon Package Query', content: 'We are celebrating our honeymoon and would love to add a sunset champagne experience. Is this possible to arrange?', type: 'inquiry', status: 'replied', direction: 'inbound', created_date: daysAgo(8), updated_date: daysAgo(7), created_by: 'admin@test.com' },
  { id: uuidv4(), client_id: clientIds[3], client_name: 'Aisha Mohammed', subject: 'Dietary Requirements', content: 'Assalamu alaikum, our family requires halal certified meals throughout the safari. Please confirm this can be arranged.', type: 'special_request', status: 'read', direction: 'inbound', created_date: daysAgo(3), updated_date: daysAgo(2), created_by: 'admin@test.com' },
  { id: uuidv4(), client_id: clientIds[4], client_name: 'David Chen', subject: 'Team Building Safari — 8 People', content: 'We are a corporate group of 8 looking for a team building safari experience. Do you offer customized programs?', type: 'inquiry', status: 'unread', direction: 'inbound', created_date: daysAgo(1), updated_date: daysAgo(1), created_by: 'admin@test.com' },
];

// ── Vouchers ──────────────────────────────────────────────────────────────────
const vouchers = bookings.slice(0, 4).map((booking, i) => ({
  id: uuidv4(),
  voucher_number: `VCH-2024-${String(i + 1).padStart(3, '0')}`,
  booking_id: booking.id,
  booking_ref: booking.booking_ref,
  client_name: booking.client_name,
  client_email: booking.client_email,
  package_name: booking.package_name,
  start_date: booking.start_date,
  end_date: booking.end_date,
  num_guests: booking.num_guests,
  accommodation: rand(['Serengeti Sopa Lodge', 'Mara Intrepids Camp', 'Ngorongoro Crater Lodge', 'Amboseli Serena']),
  driver_name: drivers[i % drivers.length].full_name,
  vehicle: vehicles[i % vehicles.length].name,
  status: 'issued',
  created_date: daysAgo(20 - i * 4), updated_date: daysAgo(i), created_by: 'admin@test.com',
}));

// ── FlightTickets ─────────────────────────────────────────────────────────────
const flights = bookings.slice(0, 5).map((booking, i) => ({
  id: uuidv4(),
  booking_id: booking.id,
  booking_ref: booking.booking_ref,
  client_name: booking.client_name,
  airline: rand(['Kenya Airways', 'Ethiopian Airlines', 'Emirates', 'Precision Air', 'Jambojet']),
  flight_number: `${rand(['KQ', 'ET', 'EK', 'PW', 'JM'])}${randInt(100, 999)}`,
  origin: rand(['Nairobi (NBO)', 'Dar es Salaam (DAR)', 'Kilimanjaro (JRO)', 'Dubai (DXB)']),
  destination: rand(['Kilimanjaro (JRO)', 'Serengeti (SEU)', 'Mara (MRE)', 'Zanzibar (ZNZ)']),
  departure_date: booking.start_date,
  arrival_date: booking.start_date,
  departure_time: `${randInt(6, 14)}:${rand(['00', '30'])}`,
  arrival_time: `${randInt(8, 18)}:${rand(['00', '30'])}`,
  seat_class: rand(['economy', 'business']),
  ticket_cost: randInt(200, 800),
  status: rand(['confirmed', 'confirmed', 'pending']),
  created_date: daysAgo(30 - i * 4), updated_date: daysAgo(i), created_by: 'admin@test.com',
}));

// ── Manifests ─────────────────────────────────────────────────────────────────
const manifests = bookings.slice(0, 3).map((booking, i) => ({
  id: uuidv4(),
  manifest_number: `MAN-2024-${String(i + 1).padStart(3, '0')}`,
  booking_id: booking.id,
  booking_ref: booking.booking_ref,
  trip_name: booking.package_name,
  start_date: booking.start_date,
  end_date: booking.end_date,
  num_passengers: booking.num_guests,
  driver_id: driverIds[i % driverIds.length],
  driver_name: drivers[i % drivers.length].full_name,
  vehicle_id: vehicleIds[i % vehicleIds.length],
  vehicle_name: vehicles[i % vehicles.length].name,
  passengers: JSON.stringify(Array.from({ length: booking.num_guests }, (_, p) => ({
    name: `Passenger ${p + 1}`, passport: `AB${randInt(100000, 999999)}`, nationality: rand(['British', 'American', 'German', 'Italian'])
  }))),
  status: rand(['draft', 'confirmed', 'completed']),
  created_date: daysAgo(15 - i * 4), updated_date: daysAgo(i), created_by: 'admin@test.com',
}));

// ── Availability ──────────────────────────────────────────────────────────────
const availability = packages.map((pkg, i) => ({
  id: uuidv4(),
  package_id: pkg.id,
  package_name: pkg.name,
  start_date: daysFromNow(i * 10 + 5),
  end_date: daysFromNow(i * 10 + 5 + pkg.duration_days),
  spots_available: randInt(2, pkg.max_guests),
  total_spots: pkg.max_guests,
  price_override: null,
  status: 'available',
  notes: '',
  created_date: daysAgo(30), updated_date: daysAgo(i), created_by: 'admin@test.com',
}));

// ── ResourceAssignments ───────────────────────────────────────────────────────
const resourceAssignments = bookings.slice(0, 5).map((booking, i) => ({
  id: uuidv4(),
  booking_id: booking.id,
  booking_ref: booking.booking_ref,
  resource_type: rand(['vehicle', 'driver', 'equipment']),
  resource_id: i < 2 ? vehicleIds[i] : i < 4 ? driverIds[i - 2] : equipment[0].id,
  resource_name: i < 2 ? vehicles[i].name : i < 4 ? drivers[i - 2].full_name : 'Binoculars Set A',
  start_date: booking.start_date,
  end_date: booking.end_date,
  status: rand(['confirmed', 'confirmed', 'pending']),
  notes: '',
  created_date: daysAgo(20 - i * 3), updated_date: daysAgo(i), created_by: 'admin@test.com',
}));

// ── VehicleExpenses ───────────────────────────────────────────────────────────
const vehicleExpenses = vehicles.slice(0, 3).map((v, i) => ({
  id: uuidv4(),
  vehicle_id: v.id,
  vehicle_name: v.name,
  category: rand(['fuel', 'maintenance', 'insurance', 'tyres']),
  amount: [850, 1200, 3200][i],
  currency: 'USD',
  date: daysAgo(randInt(1, 30)),
  description: [`Diesel refuel — full tank`, `300,000km service`, `Annual comprehensive insurance`][i],
  odometer: v.mileage + randInt(100, 500),
  created_date: daysAgo(20 - i * 5), updated_date: daysAgo(i), created_by: 'admin@test.com',
}));

// ── BlogPosts ─────────────────────────────────────────────────────────────────
const blogPosts = [
  { id: uuidv4(), title: 'Top 5 Safari Destinations in East Africa for 2025', slug: 'top-5-safari-destinations-2025', excerpt: 'From the Great Migration to gorilla trekking, discover the must-visit destinations for your next African adventure.', content: 'East Africa remains the undisputed safari capital of the world...', status: 'published', author: 'Reservation Safari Team', category: 'Destinations', tags: 'safari,kenya,tanzania,travel', featured_image: 'https://images.unsplash.com/photo-1547970810-dc1eac37d174?w=800', created_date: daysAgo(30), updated_date: daysAgo(5), created_by: 'admin@test.com' },
  { id: uuidv4(), title: 'What to Pack for Your First Safari', slug: 'what-to-pack-safari', excerpt: 'A comprehensive packing guide for first-time safari goers — from clothing colours to must-have accessories.', content: 'Preparing for your first safari can feel overwhelming...', status: 'published', author: 'Samuel Omondi', category: 'Travel Tips', tags: 'packing,safari,tips,beginners', featured_image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800', created_date: daysAgo(20), updated_date: daysAgo(3), created_by: 'admin@test.com' },
  { id: uuidv4(), title: 'The Great Migration: A Complete Guide', slug: 'great-migration-guide', excerpt: 'Everything you need to know about witnessing one of nature\'s greatest spectacles.', content: 'The Great Migration is arguably the most dramatic wildlife event on Earth...', status: 'draft', author: 'Grace Wanjiru', category: 'Wildlife', tags: 'migration,serengeti,wildebeest,wildlife', featured_image: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800', created_date: daysAgo(10), updated_date: daysAgo(1), created_by: 'admin@test.com' },
];

// ── Feedback ──────────────────────────────────────────────────────────────────
const feedback = [
  { id: uuidv4(), booking_id: bookings[0].id, booking_ref: bookings[0].booking_ref, client_name: clients[0].full_name, overall_rating: 5, guide_rating: 5, vehicle_rating: 4, accommodation_rating: 5, food_rating: 4, comments: 'One of the best experiences of my life. Samuel knew exactly where to find the wildlife.', would_recommend: true, status: 'approved', created_date: daysAgo(20), updated_date: daysAgo(2), created_by: 'admin@test.com' },
  { id: uuidv4(), booking_id: bookings[2].id, booking_ref: bookings[2].booking_ref, client_name: clients[2].full_name, overall_rating: 4, guide_rating: 5, vehicle_rating: 4, accommodation_rating: 4, food_rating: 3, comments: 'Excellent guiding, fantastic wildlife encounters. Food could be improved slightly but overall superb.', would_recommend: true, status: 'approved', created_date: daysAgo(15), updated_date: daysAgo(1), created_by: 'admin@test.com' },
];

// ── Users ─────────────────────────────────────────────────────────────────────
const users = [
  { id: uuidv4(), email: 'admin@reservationsafari.com', password: bcrypt.hashSync('Admin@2024', 10), full_name: 'Admin User', role: 'admin', created_date: daysAgo(200) },
  { id: uuidv4(), email: 'agent@reservationsafari.com', password: bcrypt.hashSync('Agent@2024', 10), full_name: 'Agent User', role: 'agent', created_date: daysAgo(100) },
  { id: uuidv4(), email: 'driver@reservationsafari.com', password: bcrypt.hashSync('Driver@2024', 10), full_name: 'Driver User', role: 'driver', created_date: daysAgo(80) },
];

// ── Write to DB ───────────────────────────────────────────────────────────────
const db = {
  users,
  entities: {
    Client: clients,
    Package: packages,
    Booking: bookings,
    Payment: payments,
    Quote: quotes,
    Invoice: invoices,
    Vehicle: vehicles,
    Driver: drivers,
    Equipment: equipment,
    Agent: agents,
    OTA: otas,
    Expense: expenses,
    Income: incomeEntries,
    Testimonial: testimonials,
    Message: messages,
    Voucher: vouchers,
    FlightTicket: flights,
    Manifest: manifests,
    Availability: availability,
    ResourceAssignment: resourceAssignments,
    VehicleExpense: vehicleExpenses,
    BlogPost: blogPosts,
    Feedback: feedback,
  },
};

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

console.log('\n✅ Sample data seeded successfully!\n');
console.log('📊 Records created:');
Object.entries(db.entities).forEach(([name, arr]) => {
  console.log(`   ${name.padEnd(22)} ${arr.length} records`);
});
console.log(`\n🔑 Test accounts:`);
console.log(`   Admin:  admin@reservationsafari.com  /  Admin@2024`);
console.log(`   Agent:  agent@reservationsafari.com  /  Agent@2024`);
console.log(`   Driver: driver@reservationsafari.com /  Driver@2024`);
console.log('\n   (Your existing accounts are preserved if already in the DB)\n');
