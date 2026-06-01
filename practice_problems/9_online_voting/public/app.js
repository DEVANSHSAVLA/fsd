// app.js for Online Voting System
let currentUser = null;
let candidates = [];
let selectedCandidateId = null;

document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('evote_voter');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showApp();
  }

  // Auth switch tab
  window.switchAuthTab = (tab) => {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  };

  // Register Voter (Checks age eligibility)
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const age = parseInt(document.getElementById('reg-age').value);
    const ssn = document.getElementById('reg-ssn').value.trim();
    const password = document.getElementById('reg-password').value;

    if (age < 18) {
      alert('ELIGIBILITY WARNING: You must be at least 18 years old to register and cast a ballot!');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, age, ssn, password })
      });
      const data = await res.json();

      if (res.ok) {
        alert('Verification successful! You have been registered. Please login.');
        switchAuthTab('login');
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (err) {
      alert('Voter verification network error');
    }
  });

  // Login Voter
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok) {
        currentUser = data.voter;
        localStorage.setItem('evote_voter', JSON.stringify(currentUser));
        showApp();
      } else {
        alert(data.error || 'Identity verification failed');
      }
    } catch (err) {
      alert('Identity service offline');
    }
  });

  // Ballot submit action in modal
  document.getElementById('submit-ballot-btn').addEventListener('click', async () => {
    if (!currentUser || !selectedCandidateId) return;

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: currentUser.id, candidateId: selectedCandidateId })
      });
      const data = await res.json();

      if (res.ok) {
        currentUser.voted = true;
        localStorage.setItem('evote_voter', JSON.stringify(currentUser));
        
        closeVoteModal();
        updateVoterStatus();
        loadNominees();
      } else {
        alert(data.error || 'Vote submission failed');
      }
    } catch (err) {
      alert('Transaction ledger offline');
    }
  });
});

function showApp() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
  document.getElementById('user-display').innerText = `Voter ID: ${currentUser.username}`;
  
  updateVoterStatus();
  loadNominees();
}

window.logout = () => {
  localStorage.removeItem('evote_voter');
  currentUser = null;
  document.getElementById('auth-container').style.display = 'block';
  document.getElementById('app-container').style.display = 'none';
};

function updateVoterStatus() {
  const badge = document.getElementById('voter-badge');
  if (currentUser.voted) {
    badge.innerText = 'Ballot Cast ✓';
    badge.className = 'badge voted';
  } else {
    badge.innerText = 'Eligible - Pending';
    badge.className = 'badge eligible';
  }
}

// Nominees Load
async function loadNominees() {
  try {
    const res = await fetch('/api/candidates');
    candidates = await res.json();

    const grid = document.getElementById('candidates-grid');
    grid.innerHTML = candidates.map(c => `
      <div class="candidate-card">
        <div>
          <span class="candidate-symbol">${c.symbol}</span>
          <div class="candidate-name">${c.name}</div>
          <div class="candidate-party">${c.party}</div>
          <p class="candidate-bio">${c.bio}</p>
        </div>
        <button class="btn btn-warning" 
          ${currentUser.voted ? 'disabled' : ''} 
          onclick="openVoteModal('${c.id}')">
          ${currentUser.voted ? 'Ballot Cast' : 'Cast Ballot'}
        </button>
      </div>
    `).join('');

    loadResults();
  } catch (err) {
    console.error(err);
  }
}

// Results update
async function loadResults() {
  try {
    const res = await fetch('/api/results');
    const data = await res.json();

    document.getElementById('total-ballots').innerText = data.totalVotes;

    const container = document.getElementById('results-bar-container');
    container.innerHTML = data.results.map(r => `
      <div class="result-bar-group">
        <div class="result-bar-labels">
          <span>${r.symbol} ${r.name} (${r.party})</span>
          <strong>${r.votes} votes (${r.percentage.toFixed(1)}%)</strong>
        </div>
        <div class="result-bar-bg">
          <div class="result-bar-fill" style="width: ${r.percentage}%"></div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// Modal dialog triggers
window.openVoteModal = (candidateId) => {
  if (currentUser.voted) {
    alert('Double voting check failed. You have already cast your ballot!');
    return;
  }
  selectedCandidateId = candidateId;
  const candidate = candidates.find(c => c.id === candidateId);
  if (candidate) {
    document.getElementById('confirm-candidate-symbol').innerText = candidate.symbol;
    document.getElementById('confirm-candidate-name').innerText = candidate.name;
    document.getElementById('confirm-candidate-party').innerText = candidate.party;
    document.getElementById('vote-modal').style.display = 'flex';
  }
};

window.closeVoteModal = () => {
  document.getElementById('vote-modal').style.display = 'none';
  selectedCandidateId = null;
};
