// c:\Users\Deepak Chheda\Downloads\DEVANSH SUBMISSION\fsd\2_student_monitoring\public\app.js

let activeTeacher = JSON.parse(localStorage.getItem('activeTeacher')) || null;
let currentSubject = 'All';
let searchVal = '';

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const teacherNameDisplay = document.getElementById('teacher-name-display');

const studentsContainer = document.getElementById('students-container');
const addStudentBtn = document.getElementById('add-student-btn');
const addStudentModal = document.getElementById('add-student-modal');
const addStudentForm = document.getElementById('add-student-form');

const logRecordModal = document.getElementById('log-record-modal');
const logRecordForm = document.getElementById('log-record-form');
const recordModalTitle = document.getElementById('record-modal-title');
const recordStudentId = document.getElementById('record-student-id');
const recordTypeSelect = document.getElementById('record-type');

const searchBar = document.getElementById('search-bar');
const subjectFilter = document.getElementById('subject-filter');
const toastEl = document.getElementById('toast');

// KPI elements
const kpiAverage = document.getElementById('kpi-average');
const kpiStudents = document.getElementById('kpi-students');
const kpiAssignments = document.getElementById('kpi-assignments');

// Toast feedback
function showToast(message, isError = false) {
  toastEl.innerText = message;
  toastEl.style.display = 'block';
  if (isError) {
    toastEl.classList.add('error');
  } else {
    toastEl.classList.remove('error');
  }
  setTimeout(() => {
    toastEl.style.display = 'none';
  }, 3000);
}

// Init App
function init() {
  if (activeTeacher) {
    showDashboard();
  } else {
    showAuth();
  }
  setupListeners();
}

function showAuth() {
  authSection.style.display = 'block';
  dashboardSection.style.display = 'none';
  logoutBtn.style.display = 'none';
  teacherNameDisplay.style.display = 'none';
}

function showDashboard() {
  authSection.style.display = 'none';
  dashboardSection.style.display = 'block';
  logoutBtn.style.display = 'block';
  teacherNameDisplay.style.display = 'inline';
  teacherNameDisplay.innerText = activeTeacher.name;
  loadStudents();
}

function setupListeners() {
  // Login Form
  loginForm.addEventListener('submit', async (e) => {
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
        activeTeacher = data.teacher;
        localStorage.setItem('activeTeacher', JSON.stringify(activeTeacher));
        showDashboard();
        showToast("Welcome back, Professor!");
      } else {
        showToast(data.error || "Authentication failed", true);
      }
    } catch (err) {
      showToast("Could not connect to backend server", true);
    }
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('activeTeacher');
    activeTeacher = null;
    showAuth();
  });

  // Open Add Student Modal
  addStudentBtn.addEventListener('click', () => {
    addStudentModal.style.display = 'flex';
  });

  // Submit Add Student Form
  addStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('student-name').value.trim();
    const rollNo = document.getElementById('student-roll').value.trim();
    const className = document.getElementById('student-class').value.trim();

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rollNo, className })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Student profile created!");
        closeModal('add-student-modal');
        addStudentForm.reset();
        loadStudents();
      } else {
        showToast(data.error || "Failed to create student", true);
      }
    } catch (err) {
      showToast("Error communicating with server", true);
    }
  });

  // Submit Log Record Form
  logRecordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = recordStudentId.value;
    const type = recordTypeSelect.value;
    
    let bodyData = { type };
    if (type === 'mark') {
      bodyData.subject = document.getElementById('mark-subject').value;
      bodyData.score = document.getElementById('mark-score').value;
      bodyData.maxScore = document.getElementById('mark-max').value;
    } else if (type === 'assignment') {
      bodyData.title = document.getElementById('assignment-title').value.trim();
      bodyData.subject = document.getElementById('assignment-subject').value;
      bodyData.status = document.getElementById('assignment-status').value;
    } else if (type === 'feedback') {
      bodyData.text = document.getElementById('feedback-text').value.trim();
      bodyData.author = activeTeacher.name;
    }

    try {
      const res = await fetch(`/api/students/${studentId}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      
      if (res.ok) {
        showToast("Record successfully updated!");
        closeModal('log-record-modal');
        logRecordForm.reset();
        loadStudents();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to save record", true);
      }
    } catch (err) {
      showToast("Error updating records", true);
    }
  });

  // Search input
  searchBar.addEventListener('input', (e) => {
    searchVal = e.target.value;
    loadStudents();
  });

  // Subject selector
  subjectFilter.addEventListener('change', (e) => {
    currentSubject = e.target.value;
    loadStudents();
  });
}

// Fetch and render student cards
async function loadStudents() {
  try {
    const res = await fetch(`/api/students?search=${encodeURIComponent(searchVal)}&subject=${encodeURIComponent(currentSubject)}`);
    const students = await res.json();
    calculateStats(students);
    renderStudents(students);
  } catch (err) {
    studentsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #ef4444;">Could not load classroom database.</div>`;
  }
}

// Calculate Class Averages and KPIs
function calculateStats(students) {
  let totalScoreSum = 0;
  let totalMarksCount = 0;
  
  let totalAssignments = 0;
  let submittedAssignments = 0;

  students.forEach(s => {
    s.marks.forEach(m => {
      totalScoreSum += (m.score / m.maxScore);
      totalMarksCount++;
    });
    s.assignments.forEach(a => {
      totalAssignments++;
      if (a.status === 'Submitted') submittedAssignments++;
    });
  });

  // KPI Average Score
  const avg = totalMarksCount > 0 ? Math.round((totalScoreSum / totalMarksCount) * 100) : 0;
  kpiAverage.innerText = `${avg}%`;

  // KPI Active Student count
  kpiStudents.innerText = students.length;

  // KPI Assignment submission rate
  const rate = totalAssignments > 0 ? Math.round((submittedAssignments / totalAssignments) * 100) : 0;
  kpiAssignments.innerText = `${rate}%`;
}

// Render cards to grid
function renderStudents(students) {
  if (students.length === 0) {
    studentsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">No student records found.</div>`;
    return;
  }

  studentsContainer.innerHTML = students.map(s => {
    const latestFeedback = s.feedback.length > 0 ? s.feedback[s.feedback.length - 1] : null;
    
    return `
      <div class="student-card">
        <div class="student-header">
          <div>
            <h3 class="student-name">${s.name}</h3>
            <span class="student-meta">Roll: ${s.rollNo} | ${s.class}</span>
          </div>
          <button class="btn btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="deleteStudent('${s.id}')">Delete</button>
        </div>

        <!-- Marks Display -->
        <div class="student-records-section">
          <span class="section-title">Test marks</span>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${s.marks.length === 0 ? '<span style="color: var(--text-muted); font-size: 0.85rem;">No test marks logged</span>' : s.marks.map(m => {
              const pct = (m.score / m.maxScore) * 100;
              let scoreClass = 'score-low';
              if (pct >= 85) scoreClass = 'score-high';
              else if (pct >= 65) scoreClass = 'score-medium';

              return `
                <span class="score-badge">
                  <strong>${m.subject}</strong>: <span class="${scoreClass}">${m.score}/${m.maxScore}</span>
                </span>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Assignments Display -->
        <div class="student-records-section">
          <span class="section-title">Assignments</span>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${s.assignments.length === 0 ? '<span style="color: var(--text-muted); font-size: 0.85rem;">No assignments assigned</span>' : s.assignments.map(a => {
              const isSub = a.status === 'Submitted';
              return `
                <span class="score-badge" style="border-color: ${isSub ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}">
                  <span>${a.title}</span> 
                  <span style="color: ${isSub ? 'var(--success)' : 'var(--danger)'}; font-size: 0.75rem;">(${a.status})</span>
                </span>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Feedback display -->
        <div class="student-records-section">
          <span class="section-title">Professor Feedback</span>
          ${latestFeedback ? `
            <div class="feedback-bubble">
              "${latestFeedback.text}"
              <div style="font-size: 0.75rem; text-align: right; margin-top: 0.3rem; color: var(--text-muted); font-style: normal;">
                — ${latestFeedback.author}, ${latestFeedback.date}
              </div>
            </div>
          ` : '<span style="color: var(--text-muted); font-size: 0.85rem;">No remarks logged.</span>'}
        </div>

        <!-- Update Action -->
        <button class="btn" style="width: 100%; margin-top: auto; padding: 0.6rem;" onclick="openRecordModal('${s.id}', '${encodeURIComponent(s.name)}')">Update Grades / Remarks</button>
      </div>
    `;
  }).join('');
}

// Modal management helpers
window.closeModal = function(id) {
  document.getElementById(id).style.display = 'none';
};

window.openRecordModal = function(id, name) {
  recordStudentId.value = id;
  recordModalTitle.innerText = `Update ${decodeURIComponent(name)}`;
  logRecordModal.style.display = 'flex';
  toggleRecordFields();
};

window.toggleRecordFields = function() {
  const type = recordTypeSelect.value;
  document.getElementById('fields-mark').style.display = type === 'mark' ? 'block' : 'none';
  document.getElementById('fields-assignment').style.display = type === 'assignment' ? 'block' : 'none';
  document.getElementById('fields-feedback').style.display = type === 'feedback' ? 'block' : 'none';
};

// Delete student
window.deleteStudent = async function(id) {
  if (!confirm("Are you sure you want to delete this student's records?")) return;
  try {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast("Student profile removed");
      loadStudents();
    } else {
      showToast("Failed to delete student", true);
    }
  } catch (err) {
    showToast("Error contacting database", true);
  }
};

init();
