const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3019;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'travel_db.json');

// Initialize database
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      tours: [
        {
          "id": "tour_1",
          "name": "Maldives Overwater Resort Villa",
          "symbol": "🏖️",
          "price": 1200,
          "duration": "5 Days / 4 Nights",
          "rating": "4.9",
          "itinerary": [
            "Speedboat transfer to villa & sunset dining",
            "Snorkeling reef safari & coral planting",
            "Traditional Maldivian spa & massage lounge",
            "Private sandbank picnic & dolphin cruise",
            "Scenic flight transfer to Male airport"
          ]
        },
        {
          "id": "tour_2",
          "name": "Swiss Alps Scenic Train & Ski",
          "symbol": "🏔️",
          "price": 1500,
          "duration": "6 Days / 5 Nights",
          "rating": "4.8",
          "itinerary": [
            "Zermatt arrival & luxury chalet check-in",
            "Glacier Express scenic rail panoramic ride",
            "Matterhorn ski pass & snowboard guide session",
            "Thermal spa soaking & traditional cheese fondue",
            "Geneva outbound airport transit shuttle"
          ]
        },
        {
          "id": "tour_3",
          "name": "Tokyo Tech & Cultural Explorer",
          "symbol": "⛩️",
          "price": 950,
          "duration": "5 Days / 4 Nights",
          "rating": "4.7",
          "itinerary": [
            "Shibuya walking tour & sushi dining experience",
            "Akihabara electronic & anime store crawls",
            "Asakusa Senso-ji temple morning prayer rituals",
            "TeamLab Planets interactive digital art spaces",
            "Outbound Shinkansen ticket to Kyoto / Narita"
          ]
        }
      ],
      bookings: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 1. Get Curated Tours Catalog
app.get('/api/tours', (req, res) => {
  const db = readDB();
  res.json(db.tours);
});

// 2. Book Package Reservation (Pending payment validation)
app.post('/api/bookings', (req, res) => {
  const { packageId, name, email, phone, travelDate, guestsCount } = req.body;
  if (!packageId || !name || !email || !phone || !travelDate || !guestsCount) {
    return res.status(400).json({ error: 'Missing required booking details.' });
  }

  const db = readDB();
  const tour = db.tours.find(t => t.id === packageId);
  if (!tour) {
    return res.status(404).json({ error: 'Tour package not found.' });
  }

  const totalPrice = tour.price * parseInt(guestsCount);
  const bookingId = 'WND-' + Math.floor(100000 + Math.random() * 900000);

  const newBooking = {
    bookingId,
    packageId,
    packageName: tour.name,
    name,
    email,
    phone,
    travelDate,
    guestsCount: parseInt(guestsCount),
    totalPrice,
    status: 'Pending Payment',
    timestamp: new Date().toISOString()
  };

  db.bookings.push(newBooking);
  writeDB(db);

  res.json({ success: true, booking: newBooking });
});

// 3. Process Card Payments (mock update status -> Paid)
app.post('/api/payments', (req, res) => {
  const { bookingId, cardNumber, cardExpiry, cardCvv } = req.body;
  if (!bookingId || !cardNumber || !cardExpiry || !cardCvv) {
    return res.status(400).json({ error: 'Missing payment authorization fields.' });
  }

  const db = readDB();
  const booking = db.bookings.find(b => b.bookingId === bookingId);

  if (!booking) {
    return res.status(404).json({ error: 'Booking reservation ID not found.' });
  }

  // Card validation check - check length or formats
  if (cardNumber.replace(/\s/g, '').length < 15 || cardCvv.length < 3) {
    return res.status(400).json({ error: 'Card validation failed. Please check credentials.' });
  }

  // Update Status
  booking.status = 'Paid / Confirmed';
  writeDB(db);

  res.json({ success: true, booking });
});

// 4. Retrieve bookings list ledger
app.get('/api/bookings', (req, res) => {
  const db = readDB();
  res.json(db.bookings);
});

app.listen(PORT, () => {
  console.log(`Travel Booking Server running on http://localhost:${PORT}`);
});
