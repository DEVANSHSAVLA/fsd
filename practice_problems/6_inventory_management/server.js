const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3015;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'inventory_db.json');

// Helper to access DB JSON
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      products: [
        { "id": "P1", "name": "Office Ergonomic Chair", "supplier": "A1 Furniture", "quantity": 12, "minStock": 5, "price": 149.99 },
        { "id": "P2", "name": "Mechanical Keyboard K8", "supplier": "ElectroTech Imports", "quantity": 4, "minStock": 6, "price": 79.50 },
        { "id": "P3", "name": "Wireless Mouse M3", "supplier": "ElectroTech Imports", "quantity": 25, "minStock": 10, "price": 29.99 }
      ],
      suppliers: [
        { "name": "A1 Furniture", "contact": "John Doe", "phone": "555-0199", "email": "sales@a1furniture.com" },
        { "name": "ElectroTech Imports", "contact": "Sarah Connor", "phone": "555-0210", "email": "info@electrotech.com" }
      ],
      sales: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 1. Get Inventory Catalog
app.get('/api/inventory', (req, res) => {
  const db = readDB();
  res.json(db.products);
});

// 2. Add / Edit Product
app.post('/api/inventory', (req, res) => {
  const { id, name, supplier, quantity, minStock, price } = req.body;
  if (!name || !supplier || quantity === undefined || minStock === undefined || !price) {
    return res.status(400).json({ error: 'All product fields are required.' });
  }

  const db = readDB();

  if (id) {
    // Edit existing product
    const index = db.products.findIndex(p => p.id === id);
    if (index !== -1) {
      db.products[index] = { id, name, supplier, quantity, minStock, price };
    } else {
      return res.status(404).json({ error: 'Product not found.' });
    }
  } else {
    // Check duplicate name
    if (db.products.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'Product name already exists.' });
    }
    // Add new product
    const newId = 'prod_' + Math.floor(1000 + Math.random() * 9000);
    db.products.push({ id: newId, name, supplier, quantity, minStock, price });
  }

  writeDB(db);
  res.json({ success: true });
});

// 3. Delete Product
app.delete('/api/inventory/:id', (req, res) => {
  const db = readDB();
  db.products = db.products.filter(p => p.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// 4. Get Suppliers Directory
app.get('/api/suppliers', (req, res) => {
  const db = readDB();
  res.json(db.suppliers);
});

// 5. Add Supplier
app.post('/api/suppliers', (req, res) => {
  const { name, contact, phone, email } = req.body;
  if (!name || !contact || !phone || !email) {
    return res.status(400).json({ error: 'All supplier details are required.' });
  }

  const db = readDB();
  if (db.suppliers.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: 'Supplier company name already registered.' });
  }

  db.suppliers.push({ name, contact, phone, email });
  writeDB(db);
  res.json({ success: true });
});

// 6. Process Sale & Decrement Inventory
app.post('/api/sales', (req, res) => {
  const { productId, quantity, customer } = req.body;
  if (!productId || !quantity || !customer) {
    return res.status(400).json({ error: 'Missing sales details.' });
  }

  const db = readDB();
  const product = db.products.find(p => p.id === productId);

  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  if (product.quantity < quantity) {
    return res.status(400).json({ error: `Insufficient stock. Only ${product.quantity} items remaining.` });
  }

  // Decrement stock level
  product.quantity -= quantity;

  // Record Transaction Sale
  const invoiceId = 'INV' + Math.floor(100000 + Math.random() * 900000);
  const total = product.price * quantity;
  
  const newSale = {
    invoiceId,
    productId,
    productName: product.name,
    quantity,
    customer,
    total,
    timestamp: new Date().toISOString()
  };

  db.sales.push(newSale);
  writeDB(db);

  res.json({ success: true, invoice: newSale });
});

// 7. Get Sales logs history
app.get('/api/sales', (req, res) => {
  const db = readDB();
  res.json(db.sales);
});

app.listen(PORT, () => {
  console.log(`Inventory System Server running on http://localhost:${PORT}`);
});
