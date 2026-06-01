const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3002; // Runs on 3002 to prevent conflicts

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database File Path
const DB_FILE = path.join(__dirname, 'exams_db.json');

// Initial mock exam content
const initialData = {
  users: [
    { id: "1", name: "Alice Smith", email: "alice@student.com", password: "password123" }
  ],
  exams: [
    {
      id: "web-dev-basics",
      title: "Web Development Essentials",
      duration: 120, // in seconds (2 mins for easy demo testing)
      description: "Test your understanding of structural HTML, styling CSS, and dynamic client-side JavaScript.",
      questions: [
        {
          id: "q1",
          text: "Which HTML5 tag is used to define key navigation links?",
          options: ["<navigate>", "<nav>", "<links>", "<menu>"],
          correctOption: 1
        },
        {
          id: "q2",
          text: "What does CSS stand for?",
          options: ["Creative Style Sheets", "Computer Style Sheets", "Cascading Style Sheets", "Colorful Style Sheets"],
          correctOption: 2
        },
        {
          id: "q3",
          text: "Which CSS property controls the layout alignment using flexbox?",
          options: ["align-content", "display: flex", "flex-flow", "justify-content"],
          correctOption: 1
        },
        {
          id: "q4",
          text: "Which operator is used to check for both value and type equality in JavaScript?",
          options: ["=", "==", "===", "!=="],
          correctOption: 2
        },
        {
          id: "q5",
          text: "Which API is used in JavaScript to fetch resources asynchronously across the network?",
          options: ["fetch()", "AJAX()", "XMLHttp()", "axios()"],
          correctOption: 0
        }
      ]
    },
    {
      id: "js-advanced",
      title: "JavaScript ES6+ Deep Dive",
      duration: 180, // in seconds (3 mins)
      description: "Advanced topics: arrow functions, promises, array methods, destructuring, and closures.",
      questions: [
        {
          id: "q1",
          text: "What is the output of: console.log(typeof NaN);",
          options: ["'number'", "'NaN'", "'undefined'", "'object'"],
          correctOption: 0
        },
        {
          id: "q2",
          text: "Which keyword is block-scoped and allows variable re-assignment?",
          options: ["var", "let", "const", "define"],
          correctOption: 1
        },
        {
          id: "q3",
          text: "What is the primary purpose of a Promise in JavaScript?",
          options: ["Execute loops faster", "Handle asynchronous operations", "Secure page storage", "Manage style variables"],
          correctOption: 1
        },
        {
          id: "q4",
          text: "Which array method creates a new array containing all elements that pass a test condition?",
          options: ["map()", "forEach()", "reduce()", "filter()"],
          correctOption: 3
        },
        {
          id: "q5",
          text: "What is the value of 'this' inside an arrow function?",
          options: ["The global object", "The element that triggered the event", "Lexically inherited from its outer scope", "undefined"],
          correctOption: 2
        }
      ]
    }
  ],
  results: []
};

// Database helpers
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    return initialData;
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ensure DB is initialized
readDB();

// --- REST API ENDPOINTS ---

// Register Student
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const db = readDB();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already registered" });
  }

  const newUser = {
    id: (db.users.length + 1).toString(),
    name,
    email: email.toLowerCase(),
    password
  };

  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({ message: "Registration successful", user: { id: newUser.id, name: newUser.name } });
});

// Login Student
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({ message: "Welcome back", user: { id: user.id, name: user.name, email: user.email } });
});

// List Available Exams (without question details/answers)
app.get('/api/exams', (req, res) => {
  const db = readDB();
  const summary = db.exams.map(e => ({
    id: e.id,
    title: e.title,
    duration: e.duration,
    description: e.description,
    totalQuestions: e.questions.length
  }));
  res.json(summary);
});

// Get Exam Questions - SECURITY: Remove 'correctOption' field so client cannot cheat!
app.get('/api/exams/:id/start', (req, res) => {
  const db = readDB();
  const exam = db.exams.find(e => e.id === req.params.id);
  if (!exam) {
    return res.status(404).json({ error: "Exam not found" });
  }

  // Map questions and delete correctOption field
  const safeQuestions = exam.questions.map(q => ({
    id: q.id,
    text: q.text,
    options: q.options
  }));

  res.json({
    id: exam.id,
    title: exam.title,
    duration: exam.duration,
    questions: safeQuestions
  });
});

// Submit Exam Responses for secure backend evaluation
app.post('/api/exams/:id/submit', (req, res) => {
  const { userId, answers } = req.body; // answers is a key-value object: { q1: 1, q2: 2... }
  const examId = req.params.id;

  if (!userId || !answers) {
    return res.status(400).json({ error: "User ID and answers are required" });
  }

  const db = readDB();
  const exam = db.exams.find(e => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: "Exam not found" });
  }

  let correctCount = 0;
  let totalQuestions = exam.questions.length;
  const breakdown = [];

  exam.questions.forEach(q => {
    const studentAnswer = answers[q.id]; // selected index or undefined
    const isCorrect = studentAnswer !== undefined && studentAnswer === q.correctOption;

    if (isCorrect) correctCount++;

    breakdown.push({
      questionText: q.text,
      studentAnswer: studentAnswer !== undefined ? q.options[studentAnswer] : "No Answer",
      correctAnswer: q.options[q.correctOption],
      isCorrect
    });
  });

  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const passed = percentage >= 50; // 50% passing threshold

  const newResult = {
    id: "RES-" + Math.floor(100000 + Math.random() * 900000),
    userId,
    examTitle: exam.title,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    score: `${correctCount}/${totalQuestions}`,
    percentage,
    passed
  };

  db.results.push(newResult);
  writeDB(db);

  res.json({
    message: "Exam submitted and graded successfully",
    result: newResult,
    breakdown
  });
});

// Get Student Past Results
app.get('/api/results/:userId', (req, res) => {
  const db = readDB();
  const userResults = db.results.filter(r => r.userId === req.params.userId);
  res.json(userResults.reverse());
});

app.listen(PORT, () => {
  console.log(`Examination System backend running on http://localhost:${PORT}`);
});
