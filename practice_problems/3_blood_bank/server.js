const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3012;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'blood_db.json');

const seedData = {
  stock: {
    "A+": 12,
    "A-": 4,
    "B+": 8,
    "B-": 2,
    "AB+": 6,
    "AB-": 1,
    "O+": 15,
    "O-": 5
  },
  donors: [
    { name: "Tony Stark", age: 48, bloodGroup: "AB+", weight: 78, phone: "9876543211" },
    { name: "Steve Rogers", age: 95, bloodGroup: "O-", weight: 90, phone: "9876543212" }
  ],
  requests: [
    { id: "REQ-4091", hospital: "City General Hospital", bloodGroup: "O+", units: 3, reason: "Cardiovascular Surgery", status: "Pending" }
  ]
};

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(seedData, null, 2));
    return seedData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    return seedData;
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ensure database is initialized
readDB();

// --- REST API ENDPOINTS ---

// Register Donor
app.post('/api/donors', (req, res) => {
  const { name, age, bloodGroup, weight, phone } = req.body;
  if (!name || !age || !bloodGroup || !weight || !phone) {
    return res.status(400).json({ error: "Missing donor parameters" });
  }

  const parsedAge = Number(age);
  const parsedWeight = Number(weight);

  if (parsedAge < 18 || parsedAge > 65) {
    return res.status(400).json({ error: "Donor must be between 18 and 65 years old" });
  }
  if (parsedWeight < 50) {
    return res.status(400).json({ error: "Donor must weigh at least 50 kg" });
  }

  const db = readDB();
  db.donors.push({ name, age: parsedAge, bloodGroup, weight: parsedWeight, phone });
  
  // Increment stock level for this blood type
  db.stock[bloodGroup] = (db.stock[bloodGroup] || 0) + 1;

  writeDB(db);
  res.status(201).json({ message: "Donor registered successfully" });
});

// Get Donors
app.get('/api/donors', (req, res) => {
  const db = readDB();
  res.json(db.donors);
});

// Hospital Blood Request
app.post('/api/requests', (req, res) => {
  const { hospital, bloodGroup, units, reason } = req.body;
  if (!hospital || !bloodGroup || !units || !reason) {
    return res.status(400).json({ error: "Missing request parameters" });
  }

  const db = readDB();
  db.requests.push({
    id: "REQ-" + Math.floor(1000 + Math.random() * 9000),
    hospital,
    bloodGroup,
    units: Number(units),
    reason,
    status: "Pending"
  });

  writeDB(db);
  res.status(201).json({ message: "Request registered successfully" });
});

// Fetch Requests
app.get('/api/requests', (req, res) => {
  const db = readDB();
  res.json(db.requests);
});

// Fetch Stock levels
app.get('/api/stock', (req, res) => {
  const db = readDB();
  res.json(db.stock);
});

// Admin Approve request
app.post('/api/requests/:id/approve', (req, res) => {
  const db = readDB();
  const request = db.requests.find(r => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (request.status === 'Approved') {
    return res.status(400).json({ error: "Request has already been approved" });
  }

  const availableUnits = db.stock[request.bloodGroup] || 0;
  if (availableUnits < request.units) {
    return res.status(400).json({ error: `Insufficient stock! Only ${availableUnits} units of ${request.bloodGroup} available` });
  }

  // Deduct stock levels and approve
  db.stock[request.bloodGroup] -= request.units;
  request.status = "Approved";

  writeDB(db);
  res.json({ message: "Request approved and stock inventory deducted" });
});

app.listen(PORT, () => {
  console.log(`Blood Bank System running on http://localhost:${PORT}`);
});
