const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3013;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'bus_db.json');

// Initialize database if it doesn't exist
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      routes: [
        { "id": "R1", "from": "Mumbai", "to": "Pune", "price": 40, "time": "08:00 AM", "busType": "AC Sleeper" },
        { "id": "R2", "from": "Mumbai", "to": "Bangalore", "price": 120, "time": "09:00 PM", "busType": "Volvo Multi-Axle" },
        { "id": "R3", "from": "Pune", "to": "Mumbai", "price": 35, "time": "01:00 PM", "busType": "Non-AC Sleeper" },
        { "id": "R4", "from": "Pune", "to": "Bangalore", "price": 110, "time": "06:00 PM", "busType": "Scania Premium" },
        { "id": "R5", "from": "Bangalore", "to": "Mumbai", "price": 130, "time": "05:00 PM", "busType": "Volvo Multi-Axle" },
        { "id": "R6", "from": "Bangalore", "to": "Pune", "price": 115, "time": "07:00 PM", "busType": "AC Sleeper" }
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

// 1. Search routes based on from, to, date
app.get('/api/routes', (req, res) => {
  const { from, to, date } = req.query;
  const db = readDB();
  
  // Find templates matching from & to
  const templates = db.routes.filter(r => 
    r.from.toLowerCase() === from.toLowerCase() && 
    r.to.toLowerCase() === to.toLowerCase()
  );

  // Return them with the selected date embedded in the id
  const results = templates.map(t => ({
    id: `${t.id}_${date}`,
    from: t.from,
    to: t.to,
    price: t.price,
    time: t.time,
    busType: t.busType,
    date: date
  }));

  res.json(results);
});

// 2. Get occupied seats for a specific route ID (which has the date embedded, e.g., R1_2026-06-15)
app.get('/api/routes/:id/seats', (req, res) => {
  const routeId = req.params.id;
  const db = readDB();
  
  // Find all bookings for this route and collect seat numbers
  const routeBookings = db.bookings.filter(b => b.routeId === routeId);
  let seats = [];
  routeBookings.forEach(b => {
    seats = seats.concat(b.seats);
  });
  
  res.json(seats);
});

// 3. Post a new booking
app.post('/api/bookings', (req, res) => {
  const { routeId, name, phone, email, seats, total } = req.body;
  if (!routeId || !name || !seats || !seats.length) {
    return res.status(400).json({ error: 'Missing required booking details.' });
  }

  const db = readDB();

  // double check if seats are already occupied
  const routeBookings = db.bookings.filter(b => b.routeId === routeId);
  let occupied = [];
  routeBookings.forEach(b => {
    occupied = occupied.concat(b.seats);
  });

  const overlap = seats.filter(s => occupied.includes(s));
  if (overlap.length > 0) {
    return res.status(400).json({ error: `Seat(s) ${overlap.join(', ')} are already booked.` });
  }

  const ticketId = 'TKT' + Math.floor(100000 + Math.random() * 900000);
  const newBooking = {
    ticketId,
    routeId,
    name,
    phone,
    email,
    seats,
    total,
    timestamp: new Date().toISOString()
  };

  db.bookings.push(newBooking);
  writeDB(db);

  res.json({ success: true, booking: newBooking });
});

// 4. Get booking history
app.get('/api/bookings', (req, res) => {
  const db = readDB();
  res.json(db.bookings);
});

app.listen(PORT, () => {
  console.log(`Bus Reservation Server running on http://localhost:${PORT}`);
});
