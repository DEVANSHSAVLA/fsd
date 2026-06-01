// c:\Users\Deepak Chheda\Downloads\DEVANSH SUBMISSION\fsd\1b_shopping_system\public\app.js

// Global State
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentCart = JSON.parse(localStorage.getItem('currentCart')) || [];
let activeView = 'products'; // products, cart, orders, auth
let authMode = 'login'; // login, register
let activeCategory = 'All';
let searchKeyword = '';

// DOM Elements
const navProducts = document.getElementById('nav-products');
const navCart = document.getElementById('nav-cart');
const navOrders = document.getElementById('nav-orders');
const userDisplay = document.getElementById('user-display');
const authActionBtn = document.getElementById('auth-action-btn');
const logoBtn = document.getElementById('logo-btn');
const cartCount = document.getElementById('cart-count');

const productsView = document.getElementById('products-view');
const cartView = document.getElementById('cart-view');
const ordersView = document.getElementById('orders-view');
const authView = document.getElementById('auth-view');

const productsContainer = document.getElementById('products-container');
const cartLayoutContainer = document.getElementById('cart-layout-container');
const ordersContainer = document.getElementById('orders-container');
const productDetailModal = document.getElementById('product-detail-modal');
const modalContainer = document.getElementById('modal-container');
const toastNotification = document.getElementById('toast-notification');

// Forms & Inputs
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const regNameGroup = document.getElementById('reg-name-group');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleLink = document.getElementById('auth-toggle-link');
const authToggleText = document.getElementById('auth-toggle-text');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');

// Toast feedback helper
function showToast(message, isError = false) {
  toastNotification.innerText = message;
  toastNotification.style.display = 'block';
  if (isError) {
    toastNotification.classList.add('error-toast');
  } else {
    toastNotification.classList.remove('error-toast');
  }
  setTimeout(() => {
    toastNotification.style.display = 'none';
  }, 3000);
}

// Initial Setup
function initialize() {
  updateUserSession();
  updateCartBadge();
  loadProducts();
  setupEventListeners();
}

// Update login state
function updateUserSession() {
  if (currentUser) {
    userDisplay.innerText = `Hi, ${currentUser.name}`;
    userDisplay.style.display = 'inline';
    navOrders.style.display = 'inline';
    authActionBtn.innerText = 'Logout';
  } else {
    userDisplay.style.display = 'none';
    navOrders.style.display = 'none';
    authActionBtn.innerText = 'Login';
  }
}

function updateCartBadge() {
  const totalItems = currentCart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.innerText = totalItems;
}

// View switching
function switchView(viewName) {
  activeView = viewName;
  
  // Hide all
  productsView.style.display = 'none';
  cartView.style.display = 'none';
  ordersView.style.display = 'none';
  authView.style.display = 'none';

  // Remove active from links
  navProducts.classList.remove('active');
  navCart.classList.remove('active');
  navOrders.classList.remove('active');

  if (viewName === 'products') {
    productsView.style.display = 'block';
    navProducts.classList.add('active');
    loadProducts();
  } else if (viewName === 'cart') {
    cartView.style.display = 'block';
    navCart.classList.add('active');
    renderCart();
  } else if (viewName === 'orders') {
    if (!currentUser) {
      switchView('auth');
      showToast("Please login to check order history", true);
      return;
    }
    ordersView.style.display = 'block';
    navOrders.classList.add('active');
    loadOrders();
  } else if (viewName === 'auth') {
    authView.style.display = 'block';
    renderAuthForm();
  }
}

// Event Listeners
function setupEventListeners() {
  // Navigation
  navProducts.addEventListener('click', () => switchView('products'));
  navCart.addEventListener('click', () => switchView('cart'));
  navOrders.addEventListener('click', () => switchView('orders'));
  logoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('products');
  });

  authActionBtn.addEventListener('click', () => {
    if (currentUser) {
      // Logout
      localStorage.removeItem('currentUser');
      currentUser = null;
      currentCart = [];
      localStorage.removeItem('currentCart');
      updateUserSession();
      updateCartBadge();
      showToast("Logged out successfully");
      switchView('products');
    } else {
      switchView('auth');
    }
  });

  // Toggle Login/Register
  authToggleLink.addEventListener('click', () => {
    authMode = authMode === 'login' ? 'register' : 'login';
    renderAuthForm();
  });

  // Auth Submit
  authForm.addEventListener('submit', handleAuthSubmit);

  // Search input
  searchInput.addEventListener('input', (e) => {
    searchKeyword = e.target.value;
    loadProducts();
  });

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeCategory = e.target.dataset.category;
      loadProducts();
    });
  });

  // Close modal
  productDetailModal.addEventListener('click', (e) => {
    if (e.target === productDetailModal || e.target.classList.contains('close-modal')) {
      productDetailModal.style.display = 'none';
    }
  });
}

// Render Products Grid
async function loadProducts() {
  try {
    let url = `/api/products?category=${encodeURIComponent(activeCategory)}`;
    if (searchKeyword) {
      url += `&search=${encodeURIComponent(searchKeyword)}`;
    }
    const res = await fetch(url);
    const products = await res.json();
    
    if (products.length === 0) {
      productsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No products found matching your search.</div>`;
      return;
    }

    productsContainer.innerHTML = products.map(product => `
      <div class="product-card">
        <div class="product-img-placeholder">${product.image}</div>
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <div class="product-rating">⭐ ${product.rating}</div>
          <p class="product-desc-short">${product.desc}</p>
          <div class="product-card-footer">
            <span class="product-price">$${product.price.toFixed(2)}</span>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary" onclick="viewProductDetail('${product.id}')">Details</button>
              <button class="btn" onclick="addToCart('${product.id}', '${encodeURIComponent(product.name)}', ${product.price}, '${product.image}')">Add 🛒</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Failed to load products", err);
    productsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #ef4444;">Failed to fetch catalog. Make sure Express server is running.</div>`;
  }
}

// Get Single Product details and mount to Modal
async function viewProductDetail(id) {
  try {
    const res = await fetch(`/api/products/${id}`);
    const product = await res.json();

    modalContainer.innerHTML = `
      <button class="close-modal">✕</button>
      <div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-top: 1rem;">
        <div style="font-size: 6rem; background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 12px; width: 150px; height: 150px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border);">
          ${product.image}
        </div>
        <div style="flex: 1; min-width: 250px;">
          <span style="font-size: 0.8rem; background: var(--primary-glow); color: #818cf8; padding: 0.25rem 0.6rem; border-radius: 50px; font-weight: 600;">${product.category}</span>
          <h2 style="font-size: 1.5rem; font-weight: 700; margin-top: 0.5rem; margin-bottom: 0.5rem;">${product.name}</h2>
          <div class="product-rating" style="margin-bottom: 1rem;">⭐ ${product.rating}</div>
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem;">${product.desc}</p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 1.6rem; font-weight: 700;">$${product.price.toFixed(2)}</span>
            <button class="btn" onclick="addToCart('${product.id}', '${encodeURIComponent(product.name)}', ${product.price}, '${product.image}'); document.getElementById('product-detail-modal').style.display='none';">Add to Cart 🛒</button>
          </div>
        </div>
      </div>
    `;
    productDetailModal.style.display = 'flex';
  } catch (err) {
    showToast("Error loading details", true);
  }
}

// Add Item to local cart
window.addToCart = function(id, name, price, image) {
  name = decodeURIComponent(name);
  const existing = currentCart.find(item => item.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    currentCart.push({ id, name, price, image, quantity: 1 });
  }
  localStorage.setItem('currentCart', JSON.stringify(currentCart));
  updateCartBadge();
  showToast(`Added ${name} to your cart`);
};

window.viewProductDetail = viewProductDetail;

// Cart Rendering & Operations
function renderCart() {
  if (currentCart.length === 0) {
    cartLayoutContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <div style="font-size: 4rem; margin-bottom: 1rem;">🛒</div>
        <h3>Your shopping cart is empty</h3>
        <p style="margin-top: 0.5rem;">Go to the products page to find our latest collection.</p>
        <button class="btn" style="margin-top: 1.5rem;" onclick="switchView('products')">Browse Products</button>
      </div>
    `;
    return;
  }

  const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const listHtml = currentCart.map(item => `
    <div class="cart-item-row">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <span style="font-size: 2.2rem;">${item.image}</span>
        <div>
          <h4 style="font-weight: 600;">${item.name}</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem;">$${item.price.toFixed(2)} each</p>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 1.5rem;">
        <div class="qty-control">
          <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">-</button>
          <span style="font-weight: 600; font-size: 0.95rem;">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
        </div>
        <span style="font-weight: 700; min-width: 70px; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    </div>
  `).join('');

  cartLayoutContainer.innerHTML = `
    <div class="cart-list">
      ${listHtml}
    </div>
    <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; height: fit-content;">
      <h3 style="font-weight: 700; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">Order Summary</h3>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: var(--text-muted);">
        <span>Subtotal</span>
        <span>$${subtotal.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; color: var(--text-muted);">
        <span>Estimated Tax (8%)</span>
        <span>$${tax.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.15rem; border-top: 1px solid var(--border); padding-top: 0.8rem; margin-bottom: 1.5rem;">
        <span>Total</span>
        <span>$${total.toFixed(2)}</span>
      </div>
      
      <!-- Checkout Form inside Cart page -->
      <div style="margin-bottom: 1rem;">
        <h4 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem;">Shipping Address</h4>
        <textarea id="checkout-address" class="form-control" rows="2" placeholder="Street Address, City, Pincode"></textarea>
        <div class="error-msg" id="checkout-address-err"></div>
      </div>
      
      <button class="btn" style="width: 100%; padding: 0.8rem;" onclick="processCheckout(${total})">Place Order</button>
    </div>
  `;
}

window.updateCartQty = function(id, change) {
  const itemIndex = currentCart.findIndex(item => item.id === id);
  if (itemIndex > -1) {
    currentCart[itemIndex].quantity += change;
    if (currentCart[itemIndex].quantity <= 0) {
      currentCart.splice(itemIndex, 1);
    }
  }
  localStorage.setItem('currentCart', JSON.stringify(currentCart));
  updateCartBadge();
  renderCart();
};

// Checkout Submission
async function processCheckout(totalPrice) {
  if (!currentUser) {
    switchView('auth');
    showToast("Please login to place orders", true);
    return;
  }

  const addrEl = document.getElementById('checkout-address');
  const errEl = document.getElementById('checkout-address-err');
  errEl.innerText = '';

  if (!addrEl.value.trim()) {
    errEl.innerText = 'Shipping address is required';
    return;
  }

  const orderData = {
    userId: currentUser.id,
    items: currentCart,
    total: totalPrice,
    shippingAddress: addrEl.value.trim()
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    if (res.ok) {
      showToast("Order placed successfully!");
      currentCart = [];
      localStorage.removeItem('currentCart');
      updateCartBadge();
      switchView('orders');
    } else {
      const data = await res.json();
      showToast(data.error || "Order placement failed", true);
    }
  } catch (err) {
    showToast("Error contacting server", true);
  }
}

window.processCheckout = processCheckout;

// Fetch and Render user orders
async function loadOrders() {
  try {
    const res = await fetch(`/api/orders/${currentUser.id}`);
    const orders = await res.json();

    if (orders.length === 0) {
      ordersContainer.innerHTML = `<div style="text-align: center; padding: 4rem; color: var(--text-muted);">You have not placed any orders yet.</div>`;
      return;
    }

    ordersContainer.innerHTML = orders.map(order => `
      <div class="order-card">
        <div class="order-header">
          <div>
            Order ID: <span class="order-id">${order.id}</span>
            <span style="color: var(--text-muted); margin-left: 1rem;">Placed on: ${order.date}</span>
          </div>
          <span class="order-status">${order.status}</span>
        </div>
        <div class="order-item-list">
          ${order.items.map(item => `
            <div class="order-item">
              <span>${item.image} ${item.name} (x${item.quantity})</span>
              <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 0.8rem; margin-top: 0.8rem;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">Shipping to: <strong>${order.shippingAddress}</strong></span>
          <span style="font-weight: 700; font-size: 1.1rem;">Total: $${order.total.toFixed(2)}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    ordersContainer.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 2rem;">Error loading orders.</div>`;
  }
}

// Authentication Forms Toggle/Submit
function renderAuthForm() {
  // Clear errors
  document.getElementById('err-name').innerText = '';
  document.getElementById('err-email').innerText = '';
  document.getElementById('err-password').innerText = '';
  
  if (authMode === 'login') {
    authTitle.innerText = "Welcome Back";
    authSubtitle.innerText = "Sign in to access your cart and orders";
    regNameGroup.style.display = 'none';
    authSubmitBtn.innerText = "Login";
    authToggleText.innerHTML = `Don't have an account? <span id="auth-toggle-link">Register</span>`;
  } else {
    authTitle.innerText = "Create Account";
    authSubtitle.innerText = "Register to start ordering premium products";
    regNameGroup.style.display = 'block';
    authSubmitBtn.innerText = "Register";
    authToggleText.innerHTML = `Already have an account? <span id="auth-toggle-link">Login</span>`;
  }
  
  // Rebind toggle listener since innerHTML is reset
  document.getElementById('auth-toggle-link').addEventListener('click', () => {
    authMode = authMode === 'login' ? 'register' : 'login';
    renderAuthForm();
  });
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  
  // Reset errors
  document.getElementById('err-name').innerText = '';
  document.getElementById('err-email').innerText = '';
  document.getElementById('err-password').innerText = '';

  const nameVal = document.getElementById('auth-name').value.trim();
  const emailVal = document.getElementById('auth-email').value.trim();
  const passwordVal = document.getElementById('auth-password').value.trim();

  let hasErrors = false;

  if (authMode === 'register' && !nameVal) {
    document.getElementById('err-name').innerText = "Full name is required";
    hasErrors = true;
  }
  if (!emailVal) {
    document.getElementById('err-email').innerText = "Email is required";
    hasErrors = true;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    document.getElementById('err-email').innerText = "Enter a valid email format";
    hasErrors = true;
  }
  if (!passwordVal) {
    document.getElementById('err-password').innerText = "Password is required";
    hasErrors = true;
  } else if (passwordVal.length < 6) {
    document.getElementById('err-password').innerText = "Password must be at least 6 characters";
    hasErrors = true;
  }

  if (hasErrors) return;

  const bodyData = authMode === 'register' 
    ? { name: nameVal, email: emailVal, password: passwordVal }
    : { email: emailVal, password: passwordVal };

  const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });

    const data = await res.json();
    
    if (res.ok) {
      showToast(authMode === 'register' ? "Registration successful! Please login." : "Logged in successfully!");
      if (authMode === 'register') {
        authMode = 'login';
        renderAuthForm();
      } else {
        currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserSession();
        switchView('products');
      }
    } else {
      showToast(data.error || "Authentication failed", true);
    }
  } catch (err) {
    showToast("Error connecting to server", true);
  }
}

// Start app
initialize();
