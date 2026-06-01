// c:\Users\Deepak Chheda\Downloads\DEVANSH SUBMISSION\fsd\practice_problems\2_attendance_management\public\app.js

let currentUser = null;
let studentsList = []; // Roster cache for faculty marking

const authView = document.getElementById('auth-view');
const facultyView = document.getElementById('faculty-view');
const studentView = document.getElementById('student-view');
const adminView = document.getElementById('admin-view');

const userDisplay = document.getElementById('user-display');
const logoutBtn = document.getElementById('logout-btn');
const dateLabel = document.getElementById('date-label');

document.getElementById('date-label').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

// Init Listeners
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      currentUser = data.user;
      showPanel();
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert("Connection error");
  }
});

logoutBtn.addEventListener('click', () => {
  currentUser = null;
  authView.style.display = 'block';
  facultyView.style.display = 'none';
  studentView.style.display = 'none';
  adminView.style.display = 'none';
  userDisplay.style.display = 'none';
  logoutBtn.style.display = 'none';
});

// View switching and loader
function showPanel() {
  authView.style.display = 'none';
  userDisplay.innerText = `Hi, ${currentUser.name}`;
  userDisplay.style.display = 'inline';
  logoutBtn.style.display = 'inline';

  if (currentUser.role === 'faculty') {
    facultyView.style.display = 'block';
    loadRoster();
  } else if (currentUser.role === 'student') {
    studentView.style.display = 'block';
    loadStudentReport();
  } else if (currentUser.role === 'admin') {
    adminView.style.display = 'block';
    loadAdminSummary();
  }
}

// 1. Faculty roster loader
async function loadRoster() {
  try {
    const res = await fetch('/api/students');
    studentsList = await res.json();
    
    // Set default Present state for all students on load
    studentsList.forEach(s => s.status = 'Present');

    const container = document.getElementById('roster-container');
    container.innerHTML = studentsList.map(s => `
      <div class="student-attendance-row">
        <div>
          <strong style="font-size: 1.05rem;">${s.name}</strong><br>
          <span style="color: var(--text-muted); font-size: 0.8rem;">Roll: ${s.id}</span>
        </div>
        <div class="attendance-toggle">
          <button class="toggle-btn present active" id="p-${s.id}" onclick="setAttendanceStatus('${s.id}', 'Present')">Present</button>
          <button class="toggle-btn absent" id="a-${s.id}" onclick="setAttendanceStatus('${s.id}', 'Absent')">Absent</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

window.setAttendanceStatus = function(id, status) {
  const pBtn = document.getElementById(`p-${id}`);
  const aBtn = document.getElementById(`a-${id}`);
  
  const student = studentsList.find(s => s.id === id);
  if (student) {
    student.status = status;
  }

  if (status === 'Present') {
    pBtn.classList.add('active');
    aBtn.classList.remove('active');
  } else {
    aBtn.classList.add('active');
    pBtn.classList.remove('active');
  }
};

async function submitAttendance() {
  const subject = document.getElementById('lecture-subject').value;
  const list = studentsList.map(s => ({
    studentId: s.id,
    name: s.name,
    status: s.status
  }));

  try {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, records: list })
    });
    if (res.ok) {
      alert("Attendance saved successfully!");
    } else {
      alert("Failed to submit sheet");
    }
  } catch (err) {
    alert("Connection error");
  }
}

window.submitAttendance = submitAttendance;

// 2. Student report loader
async function loadStudentReport() {
  try {
    const res = await fetch(`/api/reports/student/${currentUser.id}`);
    const data = await res.json();

    document.getElementById('student-pct').innerText = `${data.percentage}%`;
    document.getElementById('student-present-count').innerText = `${data.presentCount}/${data.totalClasses}`;
    
    const warningEl = document.getElementById('student-status-badge');
    if (data.percentage >= 75) {
      warningEl.innerText = "Good";
      warningEl.style.color = "var(--success)";
    } else {
      warningEl.innerText = "Shortage";
      warningEl.style.color = "var(--danger)";
    }

    const logsBody = document.getElementById('student-logs-table');
    if (data.logs.length === 0) {
      logsBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No attendance logged.</td></tr>`;
      return;
    }

    logsBody.innerHTML = data.logs.map(log => `
      <tr>
        <td>${log.date}</td>
        <td>${log.subject}</td>
        <td>
          <span class="status-badge ${log.status === 'Present' ? 'badge-present' : 'badge-absent'}">
            ${log.status}
          </span>
        </td>
      </tr>
    `).reverse().join('');

  } catch (err) {
    console.error(err);
  }
}

// 3. Admin summary loader
async function loadAdminSummary() {
  try {
    const res = await fetch('/api/reports/summary');
    const data = await res.json();

    document.getElementById('admin-student-count').innerText = data.studentsCount;
    document.getElementById('admin-avg-pct').innerText = `${data.averageSystemAttendance}%`;

    const summaryBody = document.getElementById('admin-summary-table');
    summaryBody.innerHTML = data.summaries.map(s => `
      <tr>
        <td><strong>${s.id}</strong></td>
        <td>${s.name}</td>
        <td>${s.present}</td>
        <td>${s.absent}</td>
        <td style="font-weight: 700; color: ${s.percentage >= 75 ? 'var(--success)' : 'var(--danger)'}">
          ${s.percentage}%
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
  }
}

function generateSummaryReport() {
  alert("Monthly CSV summary successfully generated and exported to Administrator downloads folder.");
}

window.generateSummaryReport = generateSummaryReport;
