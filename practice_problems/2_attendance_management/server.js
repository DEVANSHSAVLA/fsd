const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3011;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'attendance_db.json');

const seedData = {
  users: [
    { id: "F-101", email: "faculty@school.com", password: "password123", name: "Dr. Nathan Vance", role: "faculty" },
    { id: "S-501", email: "student@school.com", password: "password123", name: "Bruce Banner", role: "student" },
    { id: "A-901", email: "admin@school.com", password: "password123", name: "Principal Jenkins", role: "admin" }
  ],
  students: [
    { id: "S-501", name: "Bruce Banner" },
    { id: "S-502", name: "Diana Prince" },
    { id: "S-503", name: "Clark Kent" },
    { id: "S-504", name: "Tony Stark" }
  ],
  attendanceLogs: [
    // Pre-seeded logs to show some percentages on load
    { date: "2026-05-25", subject: "Math", studentId: "S-501", name: "Bruce Banner", status: "Present" },
    { date: "2026-05-25", subject: "Math", studentId: "S-502", name: "Diana Prince", status: "Present" },
    { date: "2026-05-25", subject: "Math", studentId: "S-503", name: "Clark Kent", status: "Absent" },
    { date: "2026-05-25", subject: "Math", studentId: "S-504", name: "Tony Stark", status: "Present" },
    
    { date: "2026-05-26", subject: "Science", studentId: "S-501", name: "Bruce Banner", status: "Present" },
    { date: "2026-05-26", subject: "Science", studentId: "S-502", name: "Diana Prince", status: "Absent" },
    { date: "2026-05-26", subject: "Science", studentId: "S-503", name: "Clark Kent", status: "Present" },
    { date: "2026-05-26", subject: "Science", studentId: "S-504", name: "Tony Stark", status: "Present" }
  ]
};

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(seedData, null, 2));
    return seedData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    return seedData;
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Initial DB check
readDB();

// --- REST API ROUTES ---

// 1. Secure Authentication
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  res.json({ user: { id: user.id, name: user.name, role: user.role } });
});

// 2. Fetch Student roster list
app.get('/api/students', (req, res) => {
  const db = readDB();
  res.json(db.students);
});

// 3. Mark class Attendance
app.post('/api/attendance', (req, res) => {
  const { subject, records } = req.body;
  if (!subject || !records || !records.length) {
    return res.status(400).json({ error: "Incomplete subject or records parameters" });
  }

  const db = readDB();
  const dateStr = new Date().toISOString().split('T')[0];

  records.forEach(rec => {
    // Append to logs
    db.attendanceLogs.push({
      date: dateStr,
      subject,
      studentId: rec.studentId,
      name: rec.name,
      status: rec.status
    });
  });

  writeDB(db);
  res.json({ message: "Attendance sheet recorded successfully" });
});

// 4. Student Report details
app.get('/api/reports/student/:id', (req, res) => {
  const db = readDB();
  const studentLogs = db.attendanceLogs.filter(log => log.studentId === req.params.id);
  
  const total = studentLogs.length;
  const present = studentLogs.filter(l => l.status === 'Present').length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  res.json({
    totalClasses: total,
    presentCount: present,
    percentage,
    logs: studentLogs
  });
});

// 5. Admin aggregates Monthly summaries
app.get('/api/reports/summary', (req, res) => {
  const db = readDB();
  const summaries = [];

  let systemPresent = 0;
  let systemTotal = 0;

  db.students.forEach(stud => {
    const logs = db.attendanceLogs.filter(l => l.studentId === stud.id);
    const present = logs.filter(l => l.status === 'Present').length;
    const absent = logs.filter(l => l.status === 'Absent').length;
    const total = logs.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    systemPresent += present;
    systemTotal += total;

    summaries.push({
      id: stud.id,
      name: stud.name,
      present,
      absent,
      percentage
    });
  });

  const avgSystem = systemTotal > 0 ? Math.round((systemPresent / systemTotal) * 100) : 0;

  res.json({
    studentsCount: db.students.length,
    averageSystemAttendance: avgSystem,
    summaries
  });
});

app.listen(PORT, () => {
  console.log(`Attendance System running on http://localhost:${PORT}`);
});
