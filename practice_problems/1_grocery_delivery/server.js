const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3010;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'grocery_db.json');

const seedData = {
  products: [
    { id: 1, name: "Organic Honeycrisp Apple", category: "Produce", price: 2.49, qty: "1 lb", emoji: "🍎" },
    { id: 2, name: "Fresh Organic Banana", category: "Produce", price: 1.19, qty: "1 lb", emoji: "🍌" },
    { id: 3, name: "Fresh Broccoli Florets", category: "Produce", price: 1.99, qty: "1 Bunch", emoji: "🥦" },
    { id: 4, name: "Whole Milk 1 Gallon", category: "Dairy", price: 4.29, qty: "1 Gal", emoji: "🥛" },
    { id: 5, name: "Salted Butter Blocks", category: "Dairy", price: 3.49, qty: "4 Bars", emoji: "🧈" },
    { id: 6, name: "Artisan Sourdough Loaf", category: "Bakery", price: 4.99, qty: "500g", emoji: "🍞" },
    { id: 7, name: "Gluten-Free Chocolate Cookies", category: "Bakery", price: 5.49, qty: "12 Pack", emoji: "🍪" },
    { id: 8, name: "Organic Rolled Oats Oats", category: "Pantry", price: 3.99, qty: "1kg", emoji: "🥣" }
  ],
  orders: []
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

// Initial check
readDB();

// --- API ENDPOINTS ---

// Fetch products list
app.get('/api/products', (req, res) => {
  const db = readDB();
  res.json(db.products);
});

// Place order
app.post('/api/orders', (req, res) => {
  const { name, phone, address, items, total } = req.body;
  if (!name || !phone || !address || !items || !items.length) {
    return res.status(400).json({ error: "Missing order parameters" });
  }

  const db = readDB();
  const newOrder = {
    orderId: "GRC-" + Math.floor(100000 + Math.random() * 900000),
    name,
    phone,
    address,
    items,
    total,
    step: 0,
    timestamp: new Date().toISOString()
  };

  db.orders.push(newOrder);
  writeDB(db);

  // Background tracker status scheduler simulation
  const timerInterval = setInterval(() => {
    const currentDb = readDB();
    const orderRef = currentDb.orders.find(o => o.orderId === newOrder.orderId);
    if (orderRef) {
      if (orderRef.step < 3) {
        orderRef.step += 1;
        writeDB(currentDb);
      } else {
        clearInterval(timerInterval);
      }
    } else {
      clearInterval(timerInterval);
    }
  }, 10000); // Progresses tracking status every 10 seconds

  res.status(201).json({ message: "Order placed", orderId: newOrder.orderId });
});

// Check delivery track progress
app.get('/api/orders/:id/track', (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.orderId === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json({ step: order.step });
});

app.listen(PORT, () => {
  console.log(`Grocery Delivery Server running on http://localhost:${PORT}`);
});
