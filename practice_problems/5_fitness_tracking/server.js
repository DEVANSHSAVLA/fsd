const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3014;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'fitness_db.json');

// Initialize database
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      workouts: [],
      foods: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 1. Auth: Register
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const db = readDB();
  const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Username already taken.' });
  }

  const newUser = {
    id: 'user_' + Math.floor(1000 + Math.random() * 9000),
    username,
    email,
    password // Simple raw password check for classroom environment
  };

  db.users.push(newUser);
  writeDB(db);

  res.json({ success: true, user: { id: newUser.id, username: newUser.username } });
});

// 2. Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  res.json({ success: true, user: { id: user.id, username: user.username } });
});

// 3. Log Workout
app.post('/api/workout', (req, res) => {
  const { userId, exercise, duration, calories, notes } = req.body;
  if (!userId || !exercise || !duration || !calories) {
    return res.status(400).json({ error: 'Missing workout details.' });
  }

  const db = readDB();
  const newWorkout = {
    id: 'wk_' + Date.now(),
    userId,
    exercise,
    duration,
    calories,
    notes,
    timestamp: new Date().toISOString()
  };

  db.workouts.push(newWorkout);
  writeDB(db);

  res.json({ success: true, workout: newWorkout });
});

// 4. Log Calories (Food Intake)
app.post('/api/calories', (req, res) => {
  const { userId, foodName, meal, calories } = req.body;
  if (!userId || !foodName || !meal || !calories) {
    return res.status(400).json({ error: 'Missing food logging details.' });
  }

  const db = readDB();
  const newFood = {
    id: 'fd_' + Date.now(),
    userId,
    foodName,
    meal,
    calories,
    timestamp: new Date().toISOString()
  };

  db.foods.push(newFood);
  writeDB(db);

  res.json({ success: true, food: newFood });
});

// 5. Dashboard Metrics (get workouts, foods, stats for userId)
app.get('/api/dashboard/:userId', (req, res) => {
  const userId = req.params.userId;
  const db = readDB();

  const workouts = db.workouts.filter(w => w.userId === userId);
  const foods = db.foods.filter(f => f.userId === userId);

  const totalBurned = workouts.reduce((sum, w) => sum + w.calories, 0);
  const totalConsumed = foods.reduce((sum, f) => sum + f.calories, 0);

  res.json({
    workouts,
    foods,
    stats: {
      totalBurned,
      totalConsumed
    }
  });
});

app.listen(PORT, () => {
  console.log(`Fitness Tracker Server running on http://localhost:${PORT}`);
});
