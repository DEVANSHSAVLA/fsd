const express = require('express');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

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

// --- MongoDB Configuration via Mongoose ---
let useMongo = false;

// Product Schema
const productSchema = new mongoose.Schema({
  id: Number,
  name: String,
  category: String,
  price: Number,
  qty: String,
  emoji: String
});
const Product = mongoose.model('Product', productSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: String,
  name: String,
  phone: String,
  address: String,
  items: Array,
  total: Number,
  step: Number,
  timestamp: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// Try to connect to MongoDB
mongoose.connect('mongodb://localhost:27017/grocery_db', { serverSelectionTimeoutMS: 2000 })
  .then(async () => {
    console.log("Connected to MongoDB successfully for Grocery Delivery!");
    useMongo = true;
    // Seed initial products if collection is empty
    try {
      const count = await Product.countDocuments();
      if (count === 0) {
        await Product.insertMany(seedData.products);
        console.log("Seeded initial grocery products in MongoDB.");
      }
    } catch (err) {
      console.error("Failed to seed initial products in MongoDB:", err);
    }
  })
  .catch(err => {
    console.warn("MongoDB is not running locally. Falling back to local JSON database.");
    useMongo = false;
  });

// --- Local JSON Database Fallback Helpers ---
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

// Ensure the local JSON DB is initially seeded
readDB();

// --- API ENDPOINTS ---

// Fetch products list
app.get('/api/products', async (req, res) => {
  if (useMongo) {
    try {
      const mongoProducts = await Product.find({});
      return res.json(mongoProducts);
    } catch (err) {
      console.error("MongoDB product fetch failed, falling back to JSON:", err);
    }
  }
  const db = readDB();
  res.json(db.products);
});

// Place order
app.post('/api/orders', async (req, res) => {
  const { name, phone, address, items, total } = req.body;
  if (!name || !phone || !address || !items || !items.length) {
    return res.status(400).json({ error: "Missing order parameters" });
  }

  const orderId = "GRC-" + Math.floor(100000 + Math.random() * 900000);
  const orderDetails = {
    orderId,
    name,
    phone,
    address,
    items,
    total,
    step: 0,
    timestamp: new Date().toISOString()
  };

  if (useMongo) {
    try {
      const newOrder = new Order(orderDetails);
      await newOrder.save();
      console.log(`Saved order ${orderId} to MongoDB.`);

      // Background tracker status simulation for MongoDB
      const mongoInterval = setInterval(async () => {
        try {
          const ord = await Order.findOne({ orderId });
          if (ord) {
            if (ord.step < 3) {
              ord.step += 1;
              await ord.save();
              console.log(`Updated order ${orderId} step to ${ord.step} in MongoDB.`);
            } else {
              clearInterval(mongoInterval);
            }
          } else {
            clearInterval(mongoInterval);
          }
        } catch (err) {
          clearInterval(mongoInterval);
        }
      }, 10000); // Progresses tracking status every 10 seconds

      return res.status(201).json({ message: "Order placed (MongoDB)", orderId });
    } catch (err) {
      console.error("MongoDB order save failed, falling back to JSON:", err);
    }
  }

  // Fallback to JSON Database
  const db = readDB();
  db.orders.push(orderDetails);
  writeDB(db);

  // Background tracker status scheduler simulation for JSON DB
  const timerInterval = setInterval(() => {
    const currentDb = readDB();
    const orderRef = currentDb.orders.find(o => o.orderId === orderId);
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
  }, 10000);

  res.status(201).json({ message: "Order placed (JSON Fallback)", orderId });
});

// Check delivery track progress
app.get('/api/orders/:id/track', async (req, res) => {
  const orderId = req.params.id;
  
  if (useMongo) {
    try {
      const ord = await Order.findOne({ orderId });
      if (ord) {
        return res.json({ step: ord.step });
      }
    } catch (err) {
      console.error("MongoDB tracking failed, falling back to JSON:", err);
    }
  }

  const db = readDB();
  const order = db.orders.find(o => o.orderId === orderId);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json({ step: order.step });
});

app.listen(PORT, () => {
  console.log(`Grocery Delivery Server running on http://localhost:${PORT}`);
});
