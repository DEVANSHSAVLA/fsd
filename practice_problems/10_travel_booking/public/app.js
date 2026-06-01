// app.js for Travel & Tour Booking System
let tours = [];
let selectedTour = null;

document.addEventListener('DOMContentLoaded', () => {
  loadTours();
  loadBookings();

  // Booking Checkout & Payment form Submit
  document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const packageId = document.getElementById('book-pkg-id').value;
    const name = document.getElementById('book-name').value.trim();
    const email = document.getElementById('book-email').value.trim();
    const phone = document.getElementById('book-phone').value.trim();
    const travelDate = document.getElementById('book-date').value;
    const guestsCount = parseInt(document.getElementById('book-guests').value);

    // Card Details
    const cardNumber = document.getElementById('card-num').value.trim();
    const cardExpiry = document.getElementById('card-expiry').value.trim();
    const cardCvv = document.getElementById('card-cvv').value.trim();

    try {
      // 1. Create booking
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, name, email, phone, travelDate, guestsCount })
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to initialize booking');
        return;
      }

      const bookingId = data.booking.bookingId;

      // 2. Process mock payment
      const payRes = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, cardNumber, cardExpiry, cardCvv })
      });
      const payData = await payRes.json();

      if (payRes.ok) {
        // Show printable voucher
        showVoucher(payData.booking);

        // Reset and reload
        document.getElementById('booking-form').reset();
        loadBookings();
      } else {
        alert(payData.error || 'Payment authorization failed');
      }
    } catch (err) {
      alert('Error booking tour package');
    }
  });
});

// Load Tour Catalog
async function loadTours() {
  try {
    const res = await fetch('/api/tours');
    tours = await res.json();

    const container = document.getElementById('destinations-container');
    container.innerHTML = tours.map(t => `
      <div class="dest-card">
        <div class="dest-image-area">${t.symbol}</div>
        <div class="dest-details">
          <div>
            <h3 class="dest-name">${t.name}</h3>
            <div class="dest-rating">★ ${t.rating} (${t.duration})</div>
            
            <div class="dest-itinerary">
              <strong>Itinerary Preview:</strong>
              <ul style="margin-top:0.4rem; padding-left:0.5rem;">
                ${t.itinerary.map((day, idx) => `<li>Day ${idx+1}: ${day}</li>`).join('')}
              </ul>
            </div>
          </div>

          <div class="dest-footer">
            <div class="dest-price">$${t.price} <span>/ guest</span></div>
            <button class="btn btn-sm" onclick="selectTour('${t.id}')">Book Now</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// Select package action
window.selectTour = (tourId) => {
  selectedTour = tours.find(t => t.id === tourId);
  if (!selectedTour) return;

  document.getElementById('book-pkg-id').value = selectedTour.id;
  document.getElementById('summary-tour-name').innerText = selectedTour.name;
  document.getElementById('summary-tour-rate').innerText = `$${selectedTour.price}`;
  
  // Reset guests count spinner
  document.getElementById('book-guests').value = 1;
  updateBookingSummary();

  // Scroll to checkout
  const checkout = document.getElementById('checkout-section');
  checkout.style.display = 'grid';
  checkout.scrollIntoView({ behavior: 'smooth' });

  // Hide voucher view
  document.getElementById('voucher-panel').style.display = 'none';
};

// Calculate cost dynamically on quantity scroll
window.updateBookingSummary = () => {
  if (!selectedTour) return;
  const guests = parseInt(document.getElementById('book-guests').value) || 1;
  const total = selectedTour.price * guests;
  document.getElementById('summary-total').innerText = `$${total.toLocaleString()}`;
};

// Voucher pass layout
function showVoucher(booking) {
  const tour = tours.find(t => t.id === booking.packageId);
  if (!tour) return;

  document.getElementById('v-name').innerText = booking.name.toUpperCase();
  document.getElementById('v-code').innerText = booking.bookingId;
  document.getElementById('v-dest').innerText = tour.name;
  document.getElementById('v-date').innerText = booking.travelDate;
  document.getElementById('v-guests').innerText = `${booking.guestsCount} Guest(s)`;
  document.getElementById('v-price').innerText = `$${booking.totalPrice.toFixed(2)}`;

  document.getElementById('voucher-panel').style.display = 'block';
  document.getElementById('voucher-panel').scrollIntoView({ behavior: 'smooth' });
}

window.dismissVoucher = () => {
  document.getElementById('voucher-panel').style.display = 'none';
  document.getElementById('checkout-section').style.display = 'none';
};

// History logs ledger
async function loadBookings() {
  try {
    const res = await fetch('/api/bookings');
    const logs = await res.json();
    const tbody = document.getElementById('bookings-table-body');

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No reservations booked yet. Choose a curated tour above!</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(l => `
      <tr>
        <td><strong style="color:var(--primary);">${l.bookingId}</strong></td>
        <td><strong>${l.packageName}</strong></td>
        <td>${l.name}</td>
        <td>${l.guestsCount} passenger(s)</td>
        <td>${l.travelDate}</td>
        <td style="color:var(--success); font-weight:700;">$${l.totalPrice.toLocaleString()}</td>
        <td><span class="badge badge-paid">${l.status}</span></td>
      </tr>
    `).reverse().join('');
  } catch (err) {
    console.error(err);
  }
}
