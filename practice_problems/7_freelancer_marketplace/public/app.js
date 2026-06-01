// app.js for Freelancer Marketplace System
let currentRole = 'freelancer'; // 'freelancer' or 'client'
let jobs = [];

document.addEventListener('DOMContentLoaded', () => {
  loadJobs();

  // Job Posting Form Submit (Client)
  document.getElementById('post-job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('job-title').value.trim();
    const category = document.getElementById('job-category').value;
    const budget = parseFloat(document.getElementById('job-budget').value);
    const description = document.getElementById('job-desc').value.trim();

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, budget, description })
      });

      if (res.ok) {
        document.getElementById('post-job-form').reset();
        loadJobs();
      } else {
        alert('Error posting job');
      }
    } catch (err) {
      alert('Network error posting job');
    }
  });

  // Bid Proposal Form Submit (Freelancer)
  document.getElementById('bid-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const jobId = document.getElementById('bid-job-id').value;
    const freelancerName = document.getElementById('bid-freelancer').value.trim();
    const bidAmount = parseFloat(document.getElementById('bid-amount').value);
    const deliveryDays = parseInt(document.getElementById('bid-days').value);
    const proposalText = document.getElementById('bid-proposal').value.trim();

    try {
      const res = await fetch(`/api/jobs/${jobId}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freelancerName, bidAmount, deliveryDays, proposalText })
      });

      if (res.ok) {
        closeBidModal();
        loadJobs();
      } else {
        alert('Failed to submit proposal');
      }
    } catch (err) {
      alert('Error submitting bid');
    }
  });
});

// Role Switcher
window.switchRole = (role) => {
  currentRole = role;
  document.getElementById('mode-freelancer').classList.toggle('active', role === 'freelancer');
  document.getElementById('mode-client').classList.toggle('active', role === 'client');
  
  document.getElementById('freelancer-view').style.display = role === 'freelancer' ? 'block' : 'none';
  document.getElementById('client-view').style.display = role === 'client' ? 'block' : 'none';
  
  renderView();
};

// Modal handlers
window.openBidModal = (jobId) => {
  document.getElementById('bid-form').reset();
  document.getElementById('bid-job-id').value = jobId;
  document.getElementById('bid-modal').style.display = 'flex';
};

window.closeBidModal = () => {
  document.getElementById('bid-modal').style.display = 'none';
};

// Retrieve job data
async function loadJobs() {
  try {
    const category = document.getElementById('filter-category').value;
    let url = '/api/jobs';
    if (category) {
      url += `?category=${encodeURIComponent(category)}`;
    }
    const res = await fetch(url);
    jobs = await res.json();
    
    renderView();
    updateStats();
  } catch (err) {
    console.error(err);
  }
}

function updateStats() {
  const openJobs = jobs.filter(j => j.status === 'Open');
  const activeContracts = jobs.filter(j => j.status === 'Awarded');
  
  let totalBids = 0;
  jobs.forEach(j => {
    totalBids += j.bids.length;
  });

  let fundsCommitted = 0;
  activeContracts.forEach(j => {
    if (j.contract) {
      fundsCommitted += j.contract.amount;
    }
  });

  document.getElementById('stats-open-jobs').innerText = openJobs.length;
  document.getElementById('stats-total-bids').innerText = totalBids;
  document.getElementById('stats-active-contracts').innerText = activeContracts.length;
  document.getElementById('stats-funds').innerText = `$${fundsCommitted.toLocaleString()}`;
}

function renderView() {
  if (currentRole === 'freelancer') {
    renderFreelancerView();
  } else {
    renderClientView();
  }
}

// Draw Freelancer Board
function renderFreelancerView() {
  const feed = document.getElementById('job-feed-container');
  const openJobs = jobs.filter(j => j.status === 'Open');

  if (openJobs.length === 0) {
    feed.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:3rem;">No active projects matching this category.</div>';
  } else {
    feed.innerHTML = openJobs.map(j => `
      <div class="job-card">
        <div class="job-card-header">
          <div>
            <span class="badge badge-tag">${j.category}</span>
            <h3 class="job-title-text" style="margin-top:0.4rem;">${j.title}</h3>
          </div>
          <span class="job-budget-tag">$${j.budget.toLocaleString()}</span>
        </div>
        <p class="job-desc-text">${j.description}</p>
        <div class="job-card-header">
          <span style="font-size:0.8rem; color:var(--text-muted);">${j.bids.length} proposal(s) received</span>
          <button class="btn btn-sm btn-outline" onclick="openBidModal('${j.id}')">Place a Bid</button>
        </div>
      </div>
    `).join('');
  }

  // Active Contracts Pipeline
  const pipeline = document.getElementById('freelancer-pipeline');
  const myContracts = jobs.filter(j => j.status === 'Awarded');

  if (myContracts.length === 0) {
    pipeline.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem; padding:1.5rem; text-align:center;">No active contracts running.</div>';
    return;
  }

  pipeline.innerHTML = myContracts.map(c => `
    <div class="pipeline-item">
      <div class="pipeline-title">${c.title}</div>
      <div class="pipeline-details">
        <strong>Freelancer:</strong> ${c.contract.freelancer}<br>
        <strong>Amount:</strong> $${c.contract.amount.toLocaleString()}<br>
        <strong>Delivery:</strong> ${c.contract.days} Days<br>
        <span style="display:inline-block; margin-top:0.4rem; color:var(--success); font-weight:600;">● IN PROGRESS</span>
      </div>
    </div>
  `).join('');
}

// Draw Client Portal
function renderClientView() {
  const container = document.getElementById('client-jobs-container');

  if (jobs.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:3rem;">You have not posted any projects yet.</div>';
    return;
  }

  container.innerHTML = jobs.map(j => {
    const isAwarded = j.status === 'Awarded';
    let bidsHTML = '';

    if (isAwarded) {
      bidsHTML = `
        <div style="background:rgba(16,185,129,0.05); padding:1rem; border-radius:6px; border:1px solid rgba(16,185,129,0.2);">
          <span style="color:var(--success); font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.3rem;">✓ PROJECT AWARDED</span>
          <p style="font-size:0.85rem; color:var(--text-muted);">
            Contract assigned to <strong>${j.contract.freelancer}</strong> at <strong>$${j.contract.amount.toLocaleString()}</strong> inside a <strong>${j.contract.days}-day</strong> deadline.
          </p>
        </div>
      `;
    } else if (j.bids.length === 0) {
      bidsHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Waiting for proposals from freelancers...</p>';
    } else {
      bidsHTML = `
        <div class="bids-box">
          <h4 style="font-size:0.85rem; margin-bottom:0.8rem; color:#fff;">Freelancer Proposals (${j.bids.length})</h4>
          ${j.bids.map(b => `
            <div class="bid-item">
              <div class="bid-item-content">
                <strong>${b.freelancerName}</strong> bid <span style="color:var(--success); font-weight:600;">$${b.bidAmount}</span> in ${b.deliveryDays} days<br>
                <span style="color:var(--text-muted); font-style:italic;">"${b.proposalText}"</span>
              </div>
              <button class="btn btn-sm btn-success" onclick="awardProject('${j.id}', '${b.freelancerName}', ${b.bidAmount}, ${b.deliveryDays})">Accept & Award</button>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="job-card">
        <div class="job-card-header">
          <div>
            <span class="badge">${j.category}</span>
            <h3 class="job-title-text" style="margin-top:0.4rem;">${j.title}</h3>
          </div>
          <span class="job-budget-tag">$${j.budget.toLocaleString()}</span>
        </div>
        <p class="job-desc-text" style="margin-bottom:0.8rem;">${j.description}</p>
        ${bidsHTML}
      </div>
    `;
  }).join('');
}

// Award Action
window.awardProject = async (jobId, freelancerName, bidAmount, deliveryDays) => {
  if (!confirm(`Award project to ${freelancerName} for $${bidAmount}?`)) return;
  
  try {
    const res = await fetch(`/api/jobs/${jobId}/award`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freelancerName, bidAmount, deliveryDays })
    });

    if (res.ok) {
      loadJobs();
    } else {
      alert('Error awarding project');
    }
  } catch (err) {
    console.error(err);
  }
};
