const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001; // Runs on 3001 to prevent conflicts with 3000

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database File Path
const DB_FILE = path.join(__dirname, 'performance_db.json');

// Initial seed data
const initialData = {
  teachers: [
    { email: "teacher@school.com", password: "password123", name: "Prof. Sarah Jenkins" }
  ],
  students: [
    {
      id: "1",
      name: "Ethan Hunt",
      rollNo: "CS-201",
      class: "Sophomore A",
      marks: [
        { subject: "Math", score: 92, maxScore: 100, date: "2026-05-10" },
        { subject: "Science", score: 88, maxScore: 100, date: "2026-05-12" }
      ],
      assignments: [
        { title: "Calculus Homework", subject: "Math", status: "Submitted", date: "2026-05-15" },
        { title: "Physics Lab Report", subject: "Science", status: "Submitted", date: "2026-05-18" }
      ],
      feedback: [
        { text: "Excellent logical skills. Consistent performer in class activities.", author: "Prof. Sarah Jenkins", date: "2026-05-20" }
      ]
    },
    {
      id: "2",
      name: "Clara Oswald",
      rollNo: "CS-202",
      class: "Sophomore A",
      marks: [
        { subject: "Math", score: 76, maxScore: 100, date: "2026-05-10" },
        { subject: "Science", score: 94, maxScore: 100, date: "2026-05-12" }
      ],
      assignments: [
        { title: "Calculus Homework", subject: "Math", status: "Pending", date: "2026-05-15" },
        { title: "Physics Lab Report", subject: "Science", status: "Submitted", date: "2026-05-18" }
      ],
      feedback: [
        { text: "Clara has high analytical potential, needs to submit Math work on time.", author: "Prof. Sarah Jenkins", date: "2026-05-21" }
      ]
    },
    {
      id: "3",
      name: "Bruce Banner",
      rollNo: "CS-203",
      class: "Sophomore B",
      marks: [
        { subject: "Math", score: 99, maxScore: 100, date: "2026-05-10" },
        { subject: "Science", score: 100, maxScore: 100, date: "2026-05-12" }
      ],
      assignments: [
        { title: "Calculus Homework", subject: "Math", status: "Submitted", date: "2026-05-15" },
        { title: "Physics Lab Report", subject: "Science", status: "Submitted", date: "2026-05-18" }
      ],
      feedback: [
        { text: "Incredible aptitude in biochemistry and advanced mathematical theories.", author: "Prof. Sarah Jenkins", date: "2026-05-22" }
      ]
    }
  ]
};

// Read database helper
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

// Write database helper
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Initialize database
readDB();

// --- REST API ENDPOINTS ---

// Teacher Authentication
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = readDB();
  const teacher = db.teachers.find(t => t.email.toLowerCase() === email.toLowerCase() && t.password === password);
  
  if (!teacher) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({ message: "Login successful", teacher: { name: teacher.name, email: teacher.email } });
});

// Get Student Records
app.get('/api/students', (req, res) => {
  const db = readDB();
  let results = [...db.students];
  const { search, subject } = req.query;

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.rollNo.toLowerCase().includes(q)
    );
  }

  if (subject && subject !== 'All') {
    // Only return students who have marks/assignments recorded in that subject
    results = results.filter(s => 
      s.marks.some(m => m.subject === subject) ||
      s.assignments.some(a => a.subject === subject)
    );
  }

  res.json(results);
});

// Add New Student
app.post('/api/students', (req, res) => {
  const { name, rollNo, className } = req.body;
  if (!name || !rollNo || !className) {
    return res.status(400).json({ error: "Name, roll number, and class are required" });
  }

  const db = readDB();
  if (db.students.some(s => s.rollNo.toLowerCase() === rollNo.toLowerCase())) {
    return res.status(400).json({ error: "Roll number already exists" });
  }

  const newStudent = {
    id: (db.students.length + 1).toString(),
    name,
    rollNo,
    class: className,
    marks: [],
    assignments: [],
    feedback: []
  };

  db.students.push(newStudent);
  writeDB(db);

  res.status(201).json({ message: "Student record created", student: newStudent });
});

// Add Mark/Assignment/Feedback details to a student
app.post('/api/students/:id/records', (req, res) => {
  const { type, subject, score, maxScore, title, status, text, author } = req.body;
  const studentId = req.params.id;

  const db = readDB();
  const student = db.students.find(s => s.id === studentId);
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  const date = new Date().toISOString().split('T')[0];

  if (type === 'mark') {
    if (!subject || score === undefined || !maxScore) {
      return res.status(400).json({ error: "Subject, score, and max score are required" });
    }
    student.marks.push({ subject, score: Number(score), maxScore: Number(maxScore), date });
  } else if (type === 'assignment') {
    if (!title || !subject || !status) {
      return res.status(400).json({ error: "Title, subject, and status are required" });
    }
    student.assignments.push({ title, subject, status, date });
  } else if (type === 'feedback') {
    if (!text || !author) {
      return res.status(400).json({ error: "Feedback text and teacher name are required" });
    }
    student.feedback.push({ text, author, date });
  } else {
    return res.status(400).json({ error: "Invalid record type" });
  }

  writeDB(db);
  res.json({ message: "Record logged successfully", student });
});

// Delete student
app.delete('/api/students/:id', (req, res) => {
  const db = readDB();
  const index = db.students.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Student not found" });
  }

  db.students.splice(index, 1);
  writeDB(db);
  res.json({ message: "Student deleted successfully" });
});

app.listen(PORT, () => {
  console.log(`Student Monitoring System running on http://localhost:${PORT}`);
});
