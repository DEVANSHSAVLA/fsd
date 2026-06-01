const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database File Path
const DB_FILE = path.join(__dirname, 'database.json');

// Initial seed data if DB doesn't exist
const initialData = {
  users: [
    { id: "1", name: "Guest User", email: "guest@shop.com", password: "password123" }
  ],
  products: [
    { id: "1", name: "Apex Wireless Headphones", category: "Electronics", price: 129.99, rating: 4.8, desc: "High-fidelity sound with active noise-cancellation, 40-hour battery life, and ergonomic memory foam earcups.", image: "🎧" },
    { id: "2", name: "Chronos Smart Watch", category: "Electronics", price: 199.99, rating: 4.6, desc: "Always-on AMOLED display, built-in GPS, heart rate monitor, blood oxygen tracker, and 5 ATM water resistance.", image: "⌚" },
    { id: "3", name: "Minimalist Leather Wallet", category: "Accessories", price: 45.00, rating: 4.7, desc: "Full-grain genuine leather RFID-blocking slim wallet. Holds up to 10 cards and folded bills.", image: "💼" },
    { id: "4", name: "Voyager Travel Backpack", category: "Accessories", price: 89.50, rating: 4.9, desc: "Durable, water-resistant canvas backpack with a 15.6-inch laptop compartment, USB charging port, and anti-theft pocket.", image: "🎒" },
    { id: "5", name: "Ergonomic Mechanical Keyboard", category: "Electronics", price: 149.00, rating: 4.5, desc: "RGB backlit hot-swappable mechanical keyboard with silent tactile switches and aluminum frame.", image: "⌨️" },
    { id: "6", name: "Hydro-Guard Steel Bottle", category: "Fitness", price: 29.99, rating: 4.4, desc: "Double-walled vacuum insulated stainless steel water bottle. Keeps drinks cold for 24 hours or hot for 12 hours.", image: "🥤" },
    { id: "7", name: "Focus Noise-Cancelling Earbuds", category: "Electronics", price: 89.99, rating: 4.3, desc: "Ultra-lightweight true wireless earbuds with touch controls, water-resistant design, and pocket charging case.", image: "👂" },
    { id: "8", name: "Aero Running Shoes", category: "Fitness", price: 110.00, rating: 4.7, desc: "Breathable engineered mesh running shoes with responsive foam cushioning and high-durability rubber outsole.", image: "👟" }
  ],
  orders: []
};

// Database helper functions
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database file, resetting to seed data:", err);
    return initialData;
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ensure database is initialized
readDB();

// --- API ROUTES ---

// 1. Authentication
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  
  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const db = readDB();
  const exists = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Email already registered" });
  }

  const newUser = {
    id: (db.users.length + 1).toString(),
    name,
    email: email.toLowerCase(),
    password // Stored in plain text for demonstration simplicity
  };

  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({ message: "Registration successful", user: { id: newUser.id, name: newUser.name, email: newUser.email } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({
    message: "Login successful",
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// 2. Product Catalog (with Search & Filtering)
app.get('/api/products', (req, res) => {
  const db = readDB();
  let results = [...db.products];
  const { search, category } = req.query;

  if (category && category !== 'All') {
    results = results.filter(p => p.category === category);
  }

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.desc.toLowerCase().includes(q)
    );
  }

  res.json(results);
});

app.get('/api/products/:id', (req, res) => {
  const db = readDB();
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(product);
});

// 3. Order Management
app.post('/api/orders', (req, res) => {
  const { userId, items, total, shippingAddress } = req.body;

  if (!userId || !items || !items.length || !total || !shippingAddress) {
    return res.status(400).json({ error: "Incomplete order details" });
  }

  const db = readDB();
  const newOrder = {
    id: "ORD-" + Math.floor(100000 + Math.random() * 900000),
    userId,
    items,
    total,
    shippingAddress,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    status: "Processing"
  };

  db.orders.push(newOrder);
  writeDB(db);

  res.status(201).json({ message: "Order placed successfully", order: newOrder });
});

app.get('/api/orders/:userId', (req, res) => {
  const db = readDB();
  const userOrders = db.orders.filter(o => o.userId === req.params.userId);
  res.json(userOrders.reverse()); // Latest first
});

app.listen(PORT, () => {
  console.log(`Shopping System backend running on http://localhost:${PORT}`);
});
