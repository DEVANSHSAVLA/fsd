// c:\Users\Deepak Chheda\Downloads\DEVANSH SUBMISSION\fsd\practice_problems\3_blood_bank\public\app.js

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();

  // Donor Form Submit
  document.getElementById('donor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('donor-name').value.trim();
    const age = document.getElementById('donor-age').value;
    const bloodGroup = document.getElementById('donor-blood').value;
    const weight = document.getElementById('donor-weight').value;
    const phone = document.getElementById('donor-phone').value.trim();

    try {
      const res = await fetch('/api/donors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, age, bloodGroup, weight, phone })
      });
      if (res.ok) {
        alert("Donor registered and blood unit logged!");
        document.getElementById('donor-form').reset();
        loadDashboard();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      alert("Error sending request");
    }
  });

  // Request Form Submit
  document.getElementById('request-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const hospital = document.getElementById('req-hospital').value.trim();
    const bloodGroup = document.getElementById('req-blood').value;
    const units = document.getElementById('req-units').value;
    const reason = document.getElementById('req-reason').value.trim();

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital, bloodGroup, units, reason })
      });
      if (res.ok) {
        alert("Hospital blood request logged!");
        document.getElementById('request-form').reset();
        loadDashboard();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      alert("Error sending request");
    }
  });
});

async function loadDashboard() {
  try {
    // 1. Load Stocks
    const stockRes = await fetch('/api/stock');
    const stocks = await stockRes.json();
    const stockContainer = document.getElementById('stock-container');
    stockContainer.innerHTML = Object.keys(stocks).map(grp => `
      <div class="stock-card">
        <span class="stock-blood-group">${grp}</span>
        <span class="stock-units">${stocks[grp]} Units</span>
      </div>
    `).join('');

    // 2. Load Requests
    const reqRes = await fetch('/api/requests');
    const requests = await reqRes.json();
    const reqTable = document.getElementById('requests-table');
    
    if (requests.length === 0) {
      reqTable.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No request logs.</td></tr>`;
    } else {
      reqTable.innerHTML = requests.map(r => `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>${r.hospital}</td>
          <td><strong style="color: var(--primary);">${r.bloodGroup}</strong></td>
          <td>${r.units}</td>
          <td>${r.reason}</td>
          <td>
            <span class="status ${r.status === 'Pending' ? 'status-pending' : 'status-approved'}">
              ${r.status}
            </span>
          </td>
          <td>
            ${r.status === 'Pending' ? `<button class="btn btn-sm" onclick="approveRequest('${r.id}')">Approve</button>` : '—'}
          </td>
        </tr>
      `).join('');
    }

    // 3. Load Donors
    const donorRes = await fetch('/api/donors');
    const donors = await donorRes.json();
    const donorTable = document.getElementById('donors-table');
    
    if (donors.length === 0) {
      donorTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No donors registered.</td></tr>`;
    } else {
      donorTable.innerHTML = donors.map(d => `
        <tr>
          <td><strong>${d.name}</strong></td>
          <td>${d.age}</td>
          <td><span style="color: var(--primary); font-weight: bold;">${d.bloodGroup}</span></td>
          <td>${d.weight} kg</td>
          <td>${d.phone}</td>
        </tr>
      `).join('');
    }

  } catch (err) {
    console.error("Dashboard load failed", err);
  }
}

window.approveRequest = async function(id) {
  try {
    const res = await fetch(`/api/requests/${id}/approve`, { method: 'POST' });
    if (res.ok) {
      alert("Request approved and blood inventory updated!");
      loadDashboard();
    } else {
      const err = await res.json();
      alert(err.error);
    }
  } catch (err) {
    alert("Approval update failed");
  }
};
