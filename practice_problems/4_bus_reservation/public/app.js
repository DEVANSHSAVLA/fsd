// c:\Users\Deepak Chheda\Downloads\DEVANSH SUBMISSION\fsd\practice_problems\4_bus_reservation\public\app.js

let activeRoute = null;
let occupiedSeats = [];
let selectedSeats = [];

document.addEventListener('DOMContentLoaded', () => {
  loadHistory();

  // Search Submit
  document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fromVal = document.getElementById('route-from').value;
    const toVal = document.getElementById('route-to').value;
    const dateVal = document.getElementById('route-date').value;

    selectedSeats = [];
    updateSummary();

    if (fromVal === toVal) {
      alert("Source and Destination cannot be the same!");
      return;
    }

    try {
      const res = await fetch(`/api/routes?from=${fromVal}&to=${toVal}&date=${dateVal}`);
      const routes = await res.json();
      
      if (routes.length === 0) {
        alert("No scheduled buses found for this route.");
        document.getElementById('booking-area').style.display = 'none';
        return;
      }

      activeRoute = routes[0]; // Set active bus route
      document.getElementById('booking-area').style.display = 'grid';
      loadSeats();
    } catch (err) {
      alert("Error finding routes");
    }
  });

  // Booking Form Submit (Checkout)
  document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (selectedSeats.length === 0) {
      alert("Please select at least one seat first!");
      return;
    }

    const name = document.getElementById('pass-name').value.trim();
    const phone = document.getElementById('pass-phone').value.trim();
    const email = document.getElementById('pass-email').value.trim();

    const bookingData = {
      routeId: activeRoute.id,
      name,
      phone,
      email,
      seats: selectedSeats,
      total: selectedSeats.length * activeRoute.price
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      const data = await res.json();
      
      if (res.ok) {
        renderTicket(data.booking);
        document.getElementById('booking-area').style.display = 'none';
        document.getElementById('booking-form').reset();
        selectedSeats = [];
        loadHistory();
      } else {
        alert(data.error || "Booking failed");
      }
    } catch (err) {
      alert("Payment processing error");
    }
  });
});

// Load Bus Seats layout
async function loadSeats() {
  try {
    const res = await fetch(`/api/routes/${activeRoute.id}/seats`);
    occupiedSeats = await res.json();

    const grid = document.getElementById('seat-grid');
    grid.innerHTML = '';

    // Total 24 seats in a cabin
    for (let i = 1; i <= 24; i++) {
      const isOccupied = occupiedSeats.includes(i);
      const isSelected = selectedSeats.includes(i);
      
      const seat = document.createElement('div');
      seat.className = `seat ${isOccupied ? 'occupied' : 'available'} ${isSelected ? 'selected' : ''}`;
      seat.innerText = i.toString().padStart(2, '0');
      
      if (!isOccupied) {
        seat.addEventListener('click', () => toggleSeatSelection(i));
      }

      grid.appendChild(seat);
    }
  } catch (err) {
    console.error(err);
  }
}

function toggleSeatSelection(seatNum) {
  if (selectedSeats.includes(seatNum)) {
    selectedSeats = selectedSeats.filter(s => s !== seatNum);
  } else {
    selectedSeats.push(seatNum);
  }
  loadSeats();
  updateSummary();
}

function updateSummary() {
  document.getElementById('summary-seats').innerText = selectedSeats.length > 0 ? selectedSeats.join(', ') : '—';
  const total = activeRoute ? selectedSeats.length * activeRoute.price : 0;
  document.getElementById('summary-total').innerText = `$${total.toFixed(2)}`;
}

// Display PDF Boarding pass details
function renderTicket(booking) {
  document.getElementById('tkt-name').innerText = booking.name.toUpperCase();
  document.getElementById('tkt-route').innerHTML = `${activeRoute.from} &rarr; ${activeRoute.to}`;
  document.getElementById('tkt-date').innerText = activeRoute.date;
  document.getElementById('tkt-seats').innerText = booking.seats.join(', ');
  document.getElementById('tkt-total').innerText = `$${booking.total.toFixed(2)}`;
  
  document.getElementById('ticket-area').style.display = 'block';
}

window.dismissTicket = function() {
  document.getElementById('ticket-area').style.display = 'none';
};

// Load past bookings logs
async function loadHistory() {
  try {
    const res = await fetch('/api/bookings');
    const bookings = await res.json();
    const container = document.getElementById('history-container');

    if (bookings.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No bookings found.</div>`;
      return;
    }

    container.innerHTML = bookings.map(b => `
      <div class="history-item">
        <div>
          <strong style="color: var(--primary); font-size: 1.05rem;">Ticket ID: ${b.ticketId}</strong><br>
          <span style="font-size: 0.9rem; color: #fff;">Passenger: ${b.name}</span><br>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Seats: ${b.seats.join(', ')}</span>
        </div>
        <div style="text-align: right;">
          <span style="font-weight: 700; color: var(--success); font-size: 1.1rem; display: block;">$${b.total.toFixed(2)}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Status: Confirmed</span>
        </div>
      </div>
    `).reverse().join('');
  } catch (err) {
    console.error(err);
  }
}
