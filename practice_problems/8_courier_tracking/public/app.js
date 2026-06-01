// app.js for Courier Tracking System
let currentRole = 'customer';
let activePackages = [];

document.addEventListener('DOMContentLoaded', () => {
  estimatePrice();
  
  // Booking Form Submit (Customer)
  document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const senderName = document.getElementById('sender-name').value.trim();
    const receiverName = document.getElementById('receiver-name').value.trim();
    const senderAddr = document.getElementById('sender-addr').value.trim();
    const receiverAddr = document.getElementById('receiver-addr').value.trim();
    const weight = parseFloat(document.getElementById('pkg-weight').value);
    const distance = parseFloat(document.getElementById('pkg-distance').value);

    const payload = { senderName, receiverName, senderAddr, receiverAddr, weight, distance };

    try {
      const res = await fetch('/api/couriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        document.getElementById('booking-form').reset();
        estimatePrice();

        // Show receipt
        document.getElementById('rec-tracking').innerText = data.courier.trackingId;
        document.getElementById('rec-cost').innerText = `$${data.courier.cost.toFixed(2)}`;
        document.getElementById('booking-receipt').style.display = 'block';

        // Prepopulate tracking field
        document.getElementById('track-id').value = data.courier.trackingId;
      } else {
        alert('Booking failed');
      }
    } catch (err) {
      alert('Error booking shipment');
    }
  });

  // Status Log Form Submit (Admin)
  document.getElementById('status-update-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const trackingId = document.getElementById('status-pkg-id').value;
    const status = document.getElementById('status-select').value;
    const hub = document.getElementById('status-hub').value.trim();
    const note = document.getElementById('status-note').value.trim();

    try {
      const res = await fetch('/api/couriers/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingId, status, hub, note })
      });

      if (res.ok) {
        closeStatusModal();
        loadDispatcherTable();
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      alert('Error updating logistics logs');
    }
  });
});

// Live Estimate Generator
window.estimatePrice = () => {
  const weight = parseFloat(document.getElementById('pkg-weight').value) || 0;
  const distance = parseFloat(document.getElementById('pkg-distance').value) || 0;
  
  // Cost: $5 Base + $2.00/kg + $0.05/km
  const cost = 5.00 + (weight * 2.00) + (distance * 0.05);
  document.getElementById('estimated-cost').innerText = `$${cost.toFixed(2)}`;
};

window.dismissReceipt = () => {
  document.getElementById('booking-receipt').style.display = 'none';
};

// Switch view portals
window.switchRole = (role) => {
  currentRole = role;
  document.getElementById('mode-customer').classList.toggle('active', role === 'customer');
  document.getElementById('mode-admin').classList.toggle('active', role === 'admin');
  
  document.getElementById('customer-view').style.display = role === 'customer' ? 'block' : 'none';
  document.getElementById('admin-view').style.display = role === 'admin' ? 'block' : 'none';

  if (role === 'admin') {
    loadDispatcherTable();
  }
};

// Track Courier Action (Customer view)
window.trackCourier = async () => {
  const trackingId = document.getElementById('track-id').value.trim();
  if (!trackingId) {
    alert('Please enter a tracking ID');
    return;
  }

  try {
    const res = await fetch(`/api/couriers/track/${trackingId}`);
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Tracking ID not found');
      document.getElementById('tracking-results').style.display = 'none';
      return;
    }

    // Show summary headers
    document.getElementById('track-status-text').innerText = data.status.toUpperCase();
    document.getElementById('track-route-text').innerHTML = `${data.senderAddr} &rarr; ${data.receiverAddr}`;

    // Reset timeline step styles
    const steps = ['Order Booked', 'In Transit', 'Out for Delivery', 'Delivered'];
    const currentStepIndex = steps.indexOf(data.status);

    steps.forEach((step, idx) => {
      const stepId = getStepElementId(step);
      const elem = document.getElementById(stepId);
      const timeElem = document.getElementById(`time-${stepId.split('-')[1]}`);
      
      elem.className = 'timeline-step'; // reset
      timeElem.innerText = '-';

      if (idx < currentStepIndex) {
        elem.classList.add('completed');
      } else if (idx === currentStepIndex) {
        elem.classList.add('current');
      }

      // Fill in time if step has been logged in history
      const log = data.history.find(h => h.status === step);
      if (log) {
        const time = new Date(log.timestamp);
        timeElem.innerText = `${time.toLocaleDateString()} ${time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        
        // If it is the current step or pre-current, we mark it completed
        if (idx <= currentStepIndex) {
          elem.classList.add('completed');
          if (idx === currentStepIndex) {
            elem.classList.remove('completed');
            elem.classList.add('current');
          }
        }
      }
    });

    // Populate audits logs
    const auditContainer = document.getElementById('track-audit-logs');
    auditContainer.innerHTML = data.history.map(h => `
      <div class="audit-item">
        <strong>${new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>: 
        Shipment marked as <span style="color:var(--primary); font-weight:600;">${h.status}</span> at <em>${h.hub}</em>. 
        <br><span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">"${h.note}"</span>
      </div>
    `).reverse().join('');

    document.getElementById('tracking-results').style.display = 'block';
  } catch (err) {
    alert('Tracking calculation failed');
  }
};

function getStepElementId(step) {
  switch (step) {
    case 'Order Booked': return 'step-booked';
    case 'In Transit': return 'step-transit';
    case 'Out for Delivery': return 'step-out';
    case 'Delivered': return 'step-delivered';
    default: return '';
  }
}

// Dispatcher List (Admin)
async function loadDispatcherTable() {
  try {
    const res = await fetch('/api/couriers');
    activePackages = await res.json();

    const tbody = document.getElementById('admin-shipment-table');
    if (activePackages.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No packages booked yet.</td></tr>';
      return;
    }

    tbody.innerHTML = activePackages.map(p => `
      <tr>
        <td><strong style="color:var(--primary);">${p.trackingId}</strong></td>
        <td>
          <span style="font-size:0.85rem; color:#fff;">From: ${p.senderName} (${p.senderAddr})</span><br>
          <span style="font-size:0.8rem; color:var(--text-muted);">To: ${p.receiverName} (${p.receiverAddr})</span>
        </td>
        <td>${p.weight} kg / ${p.distance} km</td>
        <td>
          <span style="font-weight:700; color:var(--accent-blue);">${p.status}</span>
        </td>
        <td style="font-weight:700; color:var(--success);">$${p.cost.toFixed(2)}</td>
        <td>
          <button class="btn btn-sm" onclick="openStatusModal('${p.trackingId}', '${p.status}')">Update Status</button>
        </td>
      </tr>
    `).reverse().join('');
  } catch (err) {
    console.error(err);
  }
}

// Admin Status Modal Trigger handlers
window.openStatusModal = (trackingId, currentStatus) => {
  document.getElementById('status-pkg-id').value = trackingId;
  document.getElementById('status-select').value = currentStatus;
  document.getElementById('status-hub').value = '';
  document.getElementById('status-note').value = '';
  document.getElementById('status-modal').style.display = 'flex';
};

window.closeStatusModal = () => {
  document.getElementById('status-modal').style.display = 'none';
};
