const fs = require('fs');
const db = JSON.parse(fs.readFileSync('C:/sp/server/data.json'));

const itineraries = {
  'Serengeti Classic Safari': [
    { day: 1, title: 'Arrival & Arusha', description: 'Arrive at Kilimanjaro International Airport. Transfer to Arusha for overnight stay. Welcome dinner and safari briefing.', location: 'Arusha, Tanzania', accommodation: 'Arusha Coffee Lodge', meals: 'Dinner', activities: ['Airport transfer', 'Safari briefing', 'Arusha town walk'] },
    { day: 2, title: 'Drive to Serengeti', description: 'Early morning drive through the Ngorongoro Conservation Area. Arrive at the central Serengeti for an afternoon game drive.', location: 'Central Serengeti', accommodation: 'Serengeti Serena Safari Lodge', meals: 'Breakfast, Lunch, Dinner', activities: ['Game drive', 'Big Five spotting', 'Sundowner drinks'] },
    { day: 3, title: 'Full Day Serengeti', description: 'Full day game drive in the Serengeti. Search for the Big Five and witness the vast plains teeming with wildlife.', location: 'Serengeti National Park', accommodation: 'Serengeti Serena Safari Lodge', meals: 'Breakfast, Lunch, Dinner', activities: ['Full day game drive', 'Bush lunch', 'Lion tracking'] },
    { day: 4, title: 'Northern Serengeti & Migration', description: 'Drive to the northern Serengeti to witness the Great Migration. Afternoon at leisure.', location: 'Northern Serengeti', accommodation: 'Migration Camp', meals: 'Breakfast, Lunch, Dinner', activities: ['Migration viewing', 'River crossing (seasonal)', 'Photography session'] },
    { day: 5, title: 'Departure', description: 'Early morning game drive before breakfast. Transfer to Seronera airstrip for your flight back to Arusha and onward connections.', location: 'Arusha', accommodation: '', meals: 'Breakfast', activities: ['Morning game drive', 'Airstrip transfer', 'Departure'] },
  ],
  'Masai Mara Explorer': [
    { day: 1, title: 'Nairobi to Masai Mara', description: 'Fly from Wilson Airport Nairobi to the Masai Mara. Afternoon game drive in the reserve.', location: 'Masai Mara, Kenya', accommodation: 'Mara Serena Safari Lodge', meals: 'Lunch, Dinner', activities: ['Scenic flight', 'Afternoon game drive', 'Mara River visit'] },
    { day: 2, title: 'Full Day Mara', description: 'Full day game drives in the Masai Mara. The reserve is home to lion prides, elephant herds, cheetah, leopard and buffalo.', location: 'Masai Mara Reserve', accommodation: 'Mara Serena Safari Lodge', meals: 'Breakfast, Lunch, Dinner', activities: ['Morning game drive', 'Bush picnic lunch', 'Evening drive'] },
    { day: 3, title: 'Masai Village & Game Drive', description: 'Morning game drive followed by a visit to a traditional Masai village. Learn about Masai culture and traditions.', location: 'Masai Mara', accommodation: 'Mara Serena Safari Lodge', meals: 'Breakfast, Lunch, Dinner', activities: ['Masai village visit', 'Cultural experience', 'Game drive'] },
    { day: 4, title: 'Departure', description: 'Final morning game drive. Fly back to Nairobi for onward connections.', location: 'Nairobi', accommodation: '', meals: 'Breakfast', activities: ['Morning drive', 'Flight to Nairobi', 'Departure'] },
  ],
  'Ngorongoro Crater Luxury': [
    { day: 1, title: 'Arrival Arusha', description: 'Arrive at Kilimanjaro International Airport. Transfer to luxury lodge in Arusha for briefing and rest.', location: 'Arusha, Tanzania', accommodation: 'Mount Meru Hotel', meals: 'Dinner', activities: ['Airport pickup', 'Welcome briefing', 'Rest and refresh'] },
    { day: 2, title: 'Ngorongoro Crater Floor', description: 'Descend into the Ngorongoro Crater — the world largest intact caldera. See lion, elephant, rhino, hippo and flamingo in this UNESCO World Heritage Site.', location: 'Ngorongoro Crater', accommodation: 'Ngorongoro Serena Lodge', meals: 'Breakfast, Lunch, Dinner', activities: ['Crater descent', 'Full day game drive', 'Crater floor picnic', 'Black rhino tracking'] },
    { day: 3, title: 'Olduvai Gorge & Departure', description: 'Morning at Ngorongoro rim. Visit Olduvai Gorge museum — cradle of mankind. Transfer back to Arusha for departure.', location: 'Arusha', accommodation: '', meals: 'Breakfast, Lunch', activities: ['Olduvai Gorge tour', 'Maasai market', 'Airport transfer'] },
  ],
  'Amboseli & Kilimanjaro View': [
    { day: 1, title: 'Nairobi to Amboseli', description: 'Drive from Nairobi to Amboseli National Park. Arrive in time for an afternoon game drive with iconic views of Mount Kilimanjaro.', location: 'Amboseli, Kenya', accommodation: 'Amboseli Serena Lodge', meals: 'Lunch, Dinner', activities: ['Nairobi departure', 'Amboseli arrival', 'Sunset game drive'] },
    { day: 2, title: 'Elephants & Kilimanjaro', description: 'Amboseli is renowned for its large elephant herds. Full day game drive photographing elephants against the Kilimanjaro backdrop.', location: 'Amboseli National Park', accommodation: 'Amboseli Serena Lodge', meals: 'Breakfast, Lunch, Dinner', activities: ['Elephant herd tracking', 'Photography session', 'Observation hill sunset'] },
    { day: 3, title: 'Morning Drive & Departure', description: 'Final sunrise game drive before breakfast. Transfer back to Nairobi for departure.', location: 'Nairobi', accommodation: '', meals: 'Breakfast', activities: ['Sunrise game drive', 'Nairobi transfer', 'Departure'] },
  ],
  'Zanzibar Beach & Safari Combo': [
    { day: 1, title: 'Arrive Zanzibar', description: 'Fly to Zanzibar Island. Transfer to your beachfront resort on the North Coast.', location: 'Zanzibar, Tanzania', accommodation: 'Zuri Zanzibar Hotel', meals: 'Dinner', activities: ['Airport transfer', 'Beach walk', 'Welcome cocktail'] },
    { day: 2, title: 'Stone Town & Spice Tour', description: 'Explore UNESCO-listed Stone Town. Visit the spice farms, old fort, and the vibrant Forodhani night market.', location: 'Stone Town, Zanzibar', accommodation: 'Zuri Zanzibar Hotel', meals: 'Breakfast, Lunch, Dinner', activities: ['Stone Town walk', 'Spice farm tour', 'Forodhani market'] },
    { day: 3, title: 'Beach & Snorkeling Day', description: 'Relax on pristine white sand beaches. Snorkeling trip to the reef in the afternoon.', location: 'Nungwi Beach', accommodation: 'Zuri Zanzibar Hotel', meals: 'Breakfast, Lunch, Dinner', activities: ['Snorkeling', 'Swimming', 'Dolphin tour'] },
    { day: 4, title: 'Fly to Serengeti', description: 'Morning flight to Tanzania mainland. Transfer to Serengeti for afternoon game drive.', location: 'Serengeti, Tanzania', accommodation: 'Serengeti Pioneer Camp', meals: 'Breakfast, Dinner', activities: ['Flight to Arusha', 'Drive to Serengeti', 'Evening game drive'] },
    { day: 5, title: 'Serengeti Game Drives', description: 'Full day exploring the Serengeti plains. Search for Big Five and witness the vast African wilderness.', location: 'Serengeti National Park', accommodation: 'Serengeti Pioneer Camp', meals: 'Breakfast, Lunch, Dinner', activities: ['Morning game drive', 'Bush lunch', 'Afternoon drive'] },
    { day: 6, title: 'Ngorongoro Crater', description: 'Drive to Ngorongoro Crater. Full day game drive inside the crater floor seeing lion, rhino, elephant and hippo.', location: 'Ngorongoro, Tanzania', accommodation: 'Ngorongoro Farm House', meals: 'Breakfast, Lunch, Dinner', activities: ['Crater game drive', 'Rhino tracking', 'Crater rim sundowner'] },
    { day: 7, title: 'Lake Manyara & Arusha', description: 'Drive to Lake Manyara for a morning game drive — famous for its tree-climbing lions and flamingos. Return to Arusha.', location: 'Arusha', accommodation: 'Arusha Coffee Lodge', meals: 'Breakfast, Lunch', activities: ['Lake Manyara game drive', 'Tree-climbing lions', 'Arusha dinner'] },
    { day: 8, title: 'Departure', description: 'Transfer to Kilimanjaro International Airport for your departure flight.', location: 'Kilimanjaro Airport', accommodation: '', meals: 'Breakfast', activities: ['Airport transfer', 'Departure'] },
  ],
  'Bwindi Gorilla Trekking': [
    { day: 1, title: 'Arrive Entebbe', description: 'Arrive at Entebbe International Airport. Transfer to Entebbe for overnight stay by Lake Victoria.', location: 'Entebbe, Uganda', accommodation: 'Lake Victoria Hotel', meals: 'Dinner', activities: ['Airport transfer', 'Welcome dinner', 'Entebbe botanical garden'] },
    { day: 2, title: 'Drive to Bwindi', description: 'Long scenic drive through Uganda rolling hills and tea plantations to Bwindi Impenetrable Forest. Afternoon briefing.', location: 'Bwindi, Uganda', accommodation: 'Buhoma Lodge', meals: 'Breakfast, Lunch, Dinner', activities: ['Scenic drive', 'Tea estate visit', 'Trek briefing'] },
    { day: 3, title: 'Gorilla Trekking', description: 'The highlight — trek through Bwindi Impenetrable Forest to track a mountain gorilla family. Spend one magical hour with the gorillas. Certificate awarded.', location: 'Bwindi Impenetrable Forest', accommodation: 'Buhoma Lodge', meals: 'Breakfast, Lunch, Dinner', activities: ['Gorilla trekking (permit included)', 'Forest walk', 'Gorilla certificate ceremony'] },
    { day: 4, title: 'Return & Departure', description: 'Morning village walk or nature trail. Drive to Entebbe for your departure flight.', location: 'Entebbe, Uganda', accommodation: '', meals: 'Breakfast', activities: ['Village walk', 'Drive to Entebbe', 'Departure'] },
  ],
};

db.entities.Package.forEach(pkg => {
  if (itineraries[pkg.name]) {
    pkg.itinerary_days = itineraries[pkg.name];
  }
});

fs.writeFileSync('C:/sp/server/data.json', JSON.stringify(db, null, 2));

db.entities.Package.forEach(p => console.log(p.name + ':', p.itinerary_days.length + ' days'));
console.log('Done!');
