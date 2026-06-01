// app.js for Inventory Management System
let products = [];
let suppliers = [];

document.addEventListener('DOMContentLoaded', () => {
  loadSuppliers();
  loadInventory();
  loadSalesLogs();

  // Product Form Submit
  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const supplier = document.getElementById('prod-supplier').value;
    const quantity = parseInt(document.getElementById('prod-qty').value);
    const minStock = parseInt(document.getElementById('prod-min').value);
    const price = parseFloat(document.getElementById('prod-price').value);

    const payload = { id, name, supplier, quantity, minStock, price };

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        closeProductModal();
        loadInventory();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to save product');
      }
    } catch (err) {
      alert('Error saving product');
    }
  });

  // Supplier Form Submit
  document.getElementById('supplier-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('sup-name').value.trim();
    const contact = document.getElementById('sup-contact').value.trim();
    const phone = document.getElementById('sup-phone').value.trim();
    const email = document.getElementById('sup-email').value.trim();

    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, phone, email })
      });

      if (res.ok) {
        closeSupplierModal();
        loadSuppliers();
      } else {
        alert('Failed to save supplier');
      }
    } catch (err) {
      alert('Error saving supplier');
    }
  });

  // Sales Form Submit
  document.getElementById('sales-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const productId = document.getElementById('sale-product').value;
    const quantity = parseInt(document.getElementById('sale-qty').value);
    const customer = document.getElementById('sale-customer').value.trim();

    if (!productId) {
      alert('Please select a product first!');
      return;
    }

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity, customer })
      });
      const data = await res.json();

      if (res.ok) {
        document.getElementById('sales-form').reset();
        document.getElementById('invoice-subtotal').innerText = '$0.00';
        document.getElementById('invoice-total').innerText = '$0.00';
        
        // Show Invoice
        showInvoice(data.invoice);

        // Reload lists
        loadInventory();
        loadSalesLogs();
      } else {
        alert(data.error || 'Failed to process sale');
      }
    } catch (err) {
      alert('Error processing transaction');
    }
  });
});

// Modals Trigger Helper Functions
window.showProductModal = (id = '') => {
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = id;
  
  // Populate supplier select dropdown
  const select = document.getElementById('prod-supplier');
  select.innerHTML = '<option value="">-- Choose Supplier --</option>' + 
    suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

  if (id) {
    document.getElementById('product-modal-title').innerText = 'Edit Product';
    const prod = products.find(p => p.id === id);
    if (prod) {
      document.getElementById('prod-name').value = prod.name;
      document.getElementById('prod-supplier').value = prod.supplier;
      document.getElementById('prod-qty').value = prod.quantity;
      document.getElementById('prod-min').value = prod.minStock;
      document.getElementById('prod-price').value = prod.price;
    }
  } else {
    document.getElementById('product-modal-title').innerText = 'Add New Product';
  }
  document.getElementById('product-modal').style.display = 'flex';
};

window.closeProductModal = () => {
  document.getElementById('product-modal').style.display = 'none';
};

window.showSupplierModal = () => {
  document.getElementById('supplier-form').reset();
  document.getElementById('supplier-modal').style.display = 'flex';
};

window.closeSupplierModal = () => {
  document.getElementById('supplier-modal').style.display = 'none';
};

// Loader Actions
async function loadSuppliers() {
  try {
    const res = await fetch('/api/suppliers');
    suppliers = await res.json();

    const tbody = document.getElementById('supplier-table-body');
    if (suppliers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No suppliers added yet. Add one to create products.</td></tr>';
      return;
    }
    
    tbody.innerHTML = suppliers.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.contact}</td>
        <td>${s.phone}</td>
        <td><a href="mailto:${s.email}" style="color:var(--primary);">${s.email}</a></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function loadInventory() {
  try {
    const res = await fetch('/api/inventory');
    products = await res.json();

    const tbody = document.getElementById('product-table-body');
    const selectSale = document.getElementById('sale-product');
    
    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No items in catalog.</td></tr>';
      selectSale.innerHTML = '<option value="">-- No Products Available --</option>';
      updateStats();
      return;
    }

    // Populate billing dropdown select options
    selectSale.innerHTML = '<option value="">-- Choose Product --</option>' + 
      products.map(p => `<option value="${p.id}">${p.name} (${p.quantity} left)</option>`).join('');

    tbody.innerHTML = products.map(p => {
      let badgeClass = 'badge-success';
      let statusStr = 'In Stock';
      
      if (p.quantity === 0) {
        badgeClass = 'badge-error';
        statusStr = 'Out of Stock';
      } else if (p.quantity <= p.minStock) {
        badgeClass = 'badge-warning';
        statusStr = 'Low Stock';
      }

      return `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td>${p.supplier}</td>
          <td>${p.quantity} items</td>
          <td>$${p.price.toFixed(2)}</td>
          <td><span class="badge ${badgeClass}">${statusStr}</span></td>
          <td>
            <button class="btn btn-sm btn-outline" style="margin-right:0.3rem;" onclick="showProductModal('${p.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')">Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    updateStats();
  } catch (err) {
    console.error(err);
  }
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to remove this product?')) return;
  try {
    const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadInventory();
    } else {
      alert('Error deleting product');
    }
  } catch (err) {
    console.error(err);
  }
}

function updateStats() {
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
  const lowStockCount = products.filter(p => p.quantity <= p.minStock).length;

  document.getElementById('stats-total-products').innerText = totalProducts;
  document.getElementById('stats-total-stock').innerText = totalStock;
  document.getElementById('stats-low-stock').innerText = lowStockCount;

  const lowStockCard = document.getElementById('low-stock-card');
  if (lowStockCount > 0) {
    lowStockCard.classList.add('active');
  } else {
    lowStockCard.classList.remove('active');
  }
}

// Cashier interactions
window.updateSalePrice = () => {
  const productId = document.getElementById('sale-product').value;
  const priceInput = document.getElementById('sale-price');
  
  if (!productId) {
    priceInput.value = '';
    calculateTotal();
    return;
  }

  const prod = products.find(p => p.id === productId);
  if (prod) {
    priceInput.value = prod.price.toFixed(2);
  }
  calculateTotal();
};

window.calculateTotal = () => {
  const qty = parseInt(document.getElementById('sale-qty').value) || 0;
  const price = parseFloat(document.getElementById('sale-price').value) || 0;
  const subtotal = qty * price;
  
  document.getElementById('invoice-subtotal').innerText = `$${subtotal.toFixed(2)}`;
  document.getElementById('invoice-total').innerText = `$${subtotal.toFixed(2)}`;
};

// Invoice management
function showInvoice(invoice) {
  document.getElementById('inv-id').innerText = invoice.invoiceId;
  document.getElementById('inv-cust').innerText = invoice.customer;
  document.getElementById('inv-date').innerText = new Date(invoice.timestamp).toLocaleDateString();
  document.getElementById('inv-item').innerText = `${invoice.productName} (x${invoice.quantity})`;
  document.getElementById('inv-total').innerText = `$${invoice.total.toFixed(2)}`;
  
  document.getElementById('invoice-panel').style.display = 'block';
}

window.dismissInvoice = () => {
  document.getElementById('invoice-panel').style.display = 'none';
};

// Load past transactions
async function loadSalesLogs() {
  try {
    const res = await fetch('/api/sales');
    const logs = await res.json();
    const container = document.getElementById('sales-log-container');

    // Calculate revenue
    const revenue = logs.reduce((sum, l) => sum + l.total, 0);
    document.getElementById('stats-revenue').innerText = `$${revenue.toFixed(2)}`;

    if (logs.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem; padding:1rem; text-align:center;">No transactions logged today.</div>';
      return;
    }

    container.innerHTML = logs.map(l => `
      <div class="log-item">
        <div>
          <strong>${l.productName}</strong><br>
          <span style="font-size:0.75rem; color:var(--text-muted);">Qty: ${l.quantity} • To: ${l.customer}</span>
        </div>
        <span class="text-green" style="font-weight:700;">+$${l.total.toFixed(2)}</span>
      </div>
    `).reverse().join('');
  } catch (err) {
    console.error(err);
  }
}
