// app.js for Fitness Tracking System
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check if session exists in localStorage
  const savedUser = localStorage.getItem('pulsefit_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showApp();
  }

  // Auth toggle
  window.switchAuthTab = (tab) => {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  };

  // Register Submit
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Registration successful! Please login.');
        switchAuthTab('login');
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (err) {
      alert('Error during registration');
    }
  });

  // Login Submit
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
        currentUser = data.user;
        localStorage.setItem('pulsefit_user', JSON.stringify(currentUser));
        showApp();
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      alert('Error during login');
    }
  });

  // Workout Submit
  document.getElementById('workout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const exercise = document.getElementById('workout-type').value;
    const duration = parseInt(document.getElementById('workout-duration').value);
    const calories = parseInt(document.getElementById('workout-calories').value);
    const notes = document.getElementById('workout-notes').value.trim();

    try {
      const res = await fetch('/api/workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, exercise, duration, calories, notes })
      });
      if (res.ok) {
        document.getElementById('workout-form').reset();
        loadDashboard();
      } else {
        alert('Failed to log workout');
      }
    } catch (err) {
      alert('Error logging workout');
    }
  });

  // Food Submit
  document.getElementById('food-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const foodName = document.getElementById('food-name').value.trim();
    const meal = document.getElementById('food-meal').value;
    const calories = parseInt(document.getElementById('food-calories').value);

    try {
      const res = await fetch('/api/calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, foodName, meal, calories })
      });
      if (res.ok) {
        document.getElementById('food-form').reset();
        loadDashboard();
      } else {
        alert('Failed to log food');
      }
    } catch (err) {
      alert('Error logging food');
    }
  });
});

function showApp() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
  document.getElementById('user-display').innerText = `Logged in as: ${currentUser.username}`;
  loadDashboard();
}

window.logout = () => {
  localStorage.removeItem('pulsefit_user');
  currentUser = null;
  document.getElementById('auth-container').style.display = 'block';
  document.getElementById('app-container').style.display = 'none';
};

async function loadDashboard() {
  if (!currentUser) return;
  try {
    const res = await fetch(`/api/dashboard/${currentUser.id}`);
    const data = await res.json();

    // Stats
    const totalBurned = data.stats.totalBurned || 0;
    const totalConsumed = data.stats.totalConsumed || 0;
    const balance = totalBurned - totalConsumed;

    document.getElementById('stats-burned').innerText = `${totalBurned} kcal`;
    document.getElementById('stats-workout-count').innerText = `${data.workouts.length} workouts logged`;
    
    document.getElementById('stats-consumed').innerText = `${totalConsumed} kcal`;
    document.getElementById('stats-food-count').innerText = `${data.foods.length} meals logged`;

    document.getElementById('stats-balance').innerText = `${balance >= 0 ? '+' : ''}${balance} kcal`;
    document.getElementById('stats-balance-desc').innerText = balance >= 0 ? 'Calorie Deficit 👍' : 'Calorie Surplus 📈';
    
    // Progress fill percentage based on calories burned vs target (e.g. burn >= consumed)
    let percent = 0;
    if (totalConsumed > 0) {
      percent = Math.min((totalBurned / totalConsumed) * 100, 100);
    } else if (totalBurned > 0) {
      percent = 100;
    }
    document.getElementById('progress-bar-fill').style.width = `${percent}%`;
    document.getElementById('goal-status').innerText = `Balance: ${balance} kcal (${percent.toFixed(0)}% Burn Ratio)`;

    // Render Workout Logs
    const workoutContainer = document.getElementById('workout-log-container');
    if (data.workouts.length === 0) {
      workoutContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No workouts logged yet.</div>';
    } else {
      workoutContainer.innerHTML = data.workouts.map(w => `
        <div class="log-item">
          <div class="log-item-details">
            <span class="log-item-title">${w.exercise}</span>
            <span class="log-item-sub">${w.duration} mins ${w.notes ? `• ${w.notes}` : ''}</span>
          </div>
          <span class="log-item-value burned">-${w.calories} kcal</span>
        </div>
      `).reverse().join('');
    }

    // Render Food Logs
    const foodContainer = document.getElementById('food-log-container');
    if (data.foods.length === 0) {
      foodContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No foods logged yet.</div>';
    } else {
      foodContainer.innerHTML = data.foods.map(f => `
        <div class="log-item">
          <div class="log-item-details">
            <span class="log-item-title">${f.foodName}</span>
            <span class="log-item-sub">${f.meal}</span>
          </div>
          <span class="log-item-value consumed">+${f.calories} kcal</span>
        </div>
      `).reverse().join('');
    }
  } catch (err) {
    console.error('Error fetching dashboard stats', err);
  }
}
