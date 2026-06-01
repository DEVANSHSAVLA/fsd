const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3017;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'courier_db.json');

// Initialize database
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      packages: [
        {
          "trackingId": "TRK-294012",
          "senderName": "Bruce Wayne",
          "receiverName": "Clark Kent",
          "senderAddr": "Gotham City",
          "receiverAddr": "Metropolis",
          "weight": 2.5,
          "distance": 250,
          "cost": 22.50,
          "status": "In Transit",
          "history": [
            {
              "status": "Order Booked",
              "hub": "Gotham Hub",
              "note": "Package picked up and billing confirmed",
              "timestamp": "2026-06-01T10:00:00.000Z"
            },
            {
              "status": "In Transit",
              "hub": "Gotham Outbound SORT",
              "note": "Package sorted and loaded in transit truck",
              "timestamp": "2026-06-01T15:30:00.000Z"
            }
          ]
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 1. Book courier package
app.post('/api/couriers', (req, res) => {
  const { senderName, receiverName, senderAddr, receiverAddr, weight, distance } = req.body;
  if (!senderName || !receiverName || !senderAddr || !receiverAddr || !weight || !distance) {
    return res.status(400).json({ error: 'Missing shipment booking parameters.' });
  }

  // Calculate pricing: $5 base fee + $2.00 per kg + $0.05 per km
  const cost = 5.00 + (weight * 2.00) + (distance * 0.05);
  const trackingId = 'TRK-' + Math.floor(100000 + Math.random() * 900000);

  const db = readDB();
  const newPackage = {
    trackingId,
    senderName,
    receiverName,
    senderAddr,
    receiverAddr,
    weight,
    distance,
    cost,
    status: 'Order Booked',
    history: [
      {
        status: 'Order Booked',
        hub: senderAddr,
        note: 'Shipment booked and scheduled for dispatcher pickup.',
        timestamp: new Date().toISOString()
      }
    ]
  };

  db.packages.push(newPackage);
  writeDB(db);

  res.json({ success: true, courier: newPackage });
});

// 2. Track package
app.get('/api/couriers/track/:id', (req, res) => {
  const trackingId = req.params.id;
  const db = readDB();
  const pkg = db.packages.find(p => p.trackingId.toLowerCase() === trackingId.toLowerCase());

  if (!pkg) {
    return res.status(404).json({ error: 'Tracking ID not found.' });
  }

  res.json(pkg);
});

// 3. Update shipping log details (Admin)
app.post('/api/couriers/update-status', (req, res) => {
  const { trackingId, status, hub, note } = req.body;
  if (!trackingId || !status || !hub || !note) {
    return res.status(400).json({ error: 'Incomplete status update logs.' });
  }

  const db = readDB();
  const pkg = db.packages.find(p => p.trackingId === trackingId);

  if (!pkg) {
    return res.status(404).json({ error: 'Courier package not found.' });
  }

  // Add event log
  pkg.status = status;
  pkg.history.push({
    status,
    hub,
    note,
    timestamp: new Date().toISOString()
  });

  writeDB(db);
  res.json({ success: true });
});

// 4. Retrieve all packages list (Admin Dashboard)
app.get('/api/couriers', (req, res) => {
  const db = readDB();
  res.json(db.packages);
});

app.listen(PORT, () => {
  console.log(`Courier System Server running on http://localhost:${PORT}`);
});
