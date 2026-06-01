// c:\Users\Deepak Chheda\Downloads\DEVANSH SUBMISSION\fsd\3_online_exam\public\app.js

// Global state variables
let currentStudent = JSON.parse(localStorage.getItem('currentStudent')) || null;
let activeExam = null; // safe question structure from server
let currentQuestionIdx = 0;
let selectedAnswers = {}; // { q1: index, q2: index }
let timeRemaining = 0; // seconds
let timerId = null;

// Auth DOM elements
const authView = document.getElementById('auth-view');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const regNameGroup = document.getElementById('reg-name-group');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleLink = document.getElementById('auth-toggle-link');
const authToggleText = document.getElementById('auth-toggle-text');

// Portal View DOM elements
const dashboardView = document.getElementById('dashboard-view');
const examRoomView = document.getElementById('exam-room-view');
const resultsView = document.getElementById('results-view');
const logoutBtn = document.getElementById('logout-btn');
const studentNameDisplay = document.getElementById('student-name-display');

// Elements inside active exam room
const examTitleDisplay = document.getElementById('exam-title-display');
const questionProgress = document.getElementById('question-progress');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const timerDisplay = document.getElementById('timer-display');
const questionNavGrid = document.getElementById('question-nav-grid');

// Container lists
const examsContainer = document.getElementById('exams-container');
const resultsHistoryContainer = document.getElementById('results-history-container');
const breakdownContainer = document.getElementById('breakdown-container');
const toastEl = document.getElementById('toast');

// Toast banner helper
function showToast(message, isError = false) {
  toastEl.innerText = message;
  toastEl.style.display = 'block';
  if (isError) toastEl.classList.add('error');
  else toastEl.classList.remove('error');
  
  setTimeout(() => {
    toastEl.style.display = 'none';
  }, 3500);
}

function init() {
  if (currentStudent) {
    showDashboard();
  } else {
    showAuth();
  }
  setupListeners();
}

function showAuth() {
  authView.style.display = 'block';
  dashboardView.style.display = 'none';
  examRoomView.style.display = 'none';
  resultsView.style.display = 'none';
  studentNameDisplay.style.display = 'none';
  logoutBtn.style.display = 'none';
}

function showDashboard() {
  authView.style.display = 'none';
  dashboardView.style.display = 'block';
  examRoomView.style.display = 'none';
  resultsView.style.display = 'none';
  
  studentNameDisplay.style.display = 'inline';
  studentNameDisplay.innerText = currentStudent.name;
  logoutBtn.style.display = 'inline';
  
  loadExamsList();
  loadResultsHistory();
}

function setupListeners() {
  // Toggle Register/Login views
  authToggleLink.addEventListener('click', () => {
    // Clear error tags
    document.getElementById('err-name').innerText = '';
    document.getElementById('err-email').innerText = '';
    document.getElementById('err-password').innerText = '';
    
    if (regNameGroup.style.display === 'none') {
      regNameGroup.style.display = 'block';
      authTitle.innerText = "Register Profile";
      authSubtitle.innerText = "Create an account to attend scheduled tests";
      authSubmitBtn.innerText = "Register Account";
      authToggleText.innerHTML = `Already have an account? <span id="auth-toggle-link" style="color: var(--primary); cursor: pointer; font-weight: 600;">Login</span>`;
    } else {
      regNameGroup.style.display = 'none';
      authTitle.innerText = "Welcome Student";
      authSubtitle.innerText = "Sign in to access your test dashboard";
      authSubmitBtn.innerText = "Login";
      authToggleText.innerHTML = `Don't have an account? <span id="auth-toggle-link" style="color: var(--primary); cursor: pointer; font-weight: 600;">Register</span>`;
    }
    
    // Rebind toggler
    document.getElementById('auth-toggle-link').addEventListener('click', arguments.callee);
  });

  // Handle Auth submissions
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('err-name').innerText = '';
    document.getElementById('err-email').innerText = '';
    document.getElementById('err-password').innerText = '';

    const nameVal = document.getElementById('auth-name').value.trim();
    const emailVal = document.getElementById('auth-email').value.trim();
    const passwordVal = document.getElementById('auth-password').value.trim();
    
    const isRegister = regNameGroup.style.display === 'block';
    let hasErr = false;

    if (isRegister && !nameVal) {
      document.getElementById('err-name').innerText = 'Name is required';
      hasErr = true;
    }
    if (!emailVal) {
      document.getElementById('err-email').innerText = 'Email is required';
      hasErr = true;
    }
    if (!passwordVal) {
      document.getElementById('err-password').innerText = 'Password is required';
      hasErr = true;
    } else if (passwordVal.length < 6) {
      document.getElementById('err-password').innerText = 'Password must be at least 6 characters';
      hasErr = true;
    }

    if (hasErr) return;

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const reqBody = isRegister ? { name: nameVal, email: emailVal, password: passwordVal } : { email: emailVal, password: passwordVal };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });
      const data = await res.json();
      
      if (res.ok) {
        if (isRegister) {
          showToast("Registration successful! Please login.");
          // Switch to login view
          regNameGroup.style.display = 'none';
          authTitle.innerText = "Welcome Student";
          authSubmitBtn.innerText = "Login";
          authToggleText.innerHTML = `Don't have an account? <span id="auth-toggle-link" style="color: var(--primary); cursor: pointer; font-weight: 600;">Register</span>`;
        } else {
          currentStudent = data.user;
          localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
          showToast("Logged in successfully!");
          showDashboard();
        }
      } else {
        showToast(data.error || "Authentication failed", true);
      }
    } catch (err) {
      showToast("Error connecting to server", true);
    }
  });

  // Logout button
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('currentStudent');
    currentStudent = null;
    showAuth();
  });

  // Slider buttons
  prevBtn.addEventListener('click', () => {
    if (currentQuestionIdx > 0) {
      currentQuestionIdx--;
      renderQuestion();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentQuestionIdx < activeExam.questions.length - 1) {
      currentQuestionIdx++;
      renderQuestion();
    }
  });
}

// Fetch exam card details
async function loadExamsList() {
  try {
    const res = await fetch('/api/exams');
    const exams = await res.json();
    
    examsContainer.innerHTML = exams.map(e => `
      <div class="exam-card">
        <h3 class="exam-card-title">${e.title}</h3>
        <div class="exam-meta-pills">
          <span class="meta-pill">⏱️ ${Math.round(e.duration / 60)} mins</span>
          <span class="meta-pill">📋 ${e.totalQuestions} Questions</span>
        </div>
        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem;">${e.description}</p>
        <button class="btn" style="width: 100%; margin-top: auto;" onclick="startExam('${e.id}')">Start Assessment</button>
      </div>
    `).join('');
  } catch (err) {
    examsContainer.innerHTML = `<div style="color: #ef4444;">Failed to fetch available exams.</div>`;
  }
}

// Fetch Results history log
async function loadResultsHistory() {
  try {
    const res = await fetch(`/api/results/${currentStudent.id}`);
    const results = await res.json();

    if (results.length === 0) {
      resultsHistoryContainer.innerHTML = `<div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; text-align: center; color: var(--text-muted);">You have not attempted any exams yet.</div>`;
      return;
    }

    resultsHistoryContainer.innerHTML = results.map(r => `
      <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 1.2rem 1.5rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h4 style="font-weight: 600; font-size: 1.1rem; color: #fff;">${r.examTitle}</h4>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Date: ${r.date}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 1.5rem;">
          <span style="font-size: 1.1rem; font-weight: 700; color: ${r.passed ? 'var(--success)' : 'var(--danger)'};">Score: ${r.score} (${r.percentage}%)</span>
          <span style="background: ${r.passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${r.passed ? 'var(--success)' : 'var(--danger)'}; padding: 0.25rem 0.8rem; border-radius: 50px; font-size: 0.8rem; font-weight: 600;">
            ${r.passed ? 'Passed' : 'Failed'}
          </span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    resultsHistoryContainer.innerHTML = `<div style="color: #ef4444;">Error fetching historical entries.</div>`;
  }
}

// Start timed Exam Room
async function startExam(id) {
  if (!confirm("Are you ready to start this exam? The timer will begin immediately.")) return;
  
  try {
    const res = await fetch(`/api/exams/${id}/start`);
    activeExam = await res.json();
    
    // Clear exam state
    currentQuestionIdx = 0;
    selectedAnswers = {};
    timeRemaining = activeExam.duration;
    
    // Switch view
    dashboardView.style.display = 'none';
    examRoomView.style.display = 'block';
    
    examTitleDisplay.innerText = activeExam.title;
    
    startTimer();
    renderQuestion();
    renderQuestionGrid();
  } catch (err) {
    showToast("Error loading exam room", true);
  }
}

window.startExam = startExam;

// Countdown Timer logic
function startTimer() {
  updateTimerDisplay();
  timerId = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    
    if (timeRemaining <= 30) {
      timerDisplay.classList.add('timer-warning');
    } else {
      timerDisplay.classList.remove('timer-warning');
    }

    if (timeRemaining <= 0) {
      clearInterval(timerId);
      showToast("Time expired! Automatically submitting exam...", true);
      submitExamPaper(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Render dynamic quiz card question
function renderQuestion() {
  const question = activeExam.questions[currentQuestionIdx];
  questionProgress.innerText = `Question ${currentQuestionIdx + 1} of ${activeExam.questions.length}`;
  questionText.innerText = question.text;

  optionsContainer.innerHTML = question.options.map((opt, idx) => {
    const isSelected = selectedAnswers[question.id] === idx;
    return `
      <div class="option-item ${isSelected ? 'selected' : ''}" onclick="selectOption('${question.id}', ${idx})">
        <div class="option-circle">${String.fromCharCode(65 + idx)}</div>
        <div>${opt}</div>
      </div>
    `;
  }).join('');

  // Slider button states
  prevBtn.disabled = currentQuestionIdx === 0;
  if (currentQuestionIdx === activeExam.questions.length - 1) {
    nextBtn.innerText = "Submit Answers";
    nextBtn.onclick = confirmSubmitExam;
  } else {
    nextBtn.innerText = "Next Question ▶";
    nextBtn.onclick = () => {
      currentQuestionIdx++;
      renderQuestion();
    };
  }

  // Update questions Grid highlights
  renderQuestionGrid();
}

window.selectOption = function(qId, optionIdx) {
  selectedAnswers[qId] = optionIdx;
  renderQuestion();
};

// Render index selector sidebar map
function renderQuestionGrid() {
  questionNavGrid.innerHTML = activeExam.questions.map((q, idx) => {
    let classes = 'nav-grid-btn';
    if (idx === currentQuestionIdx) classes += ' current';
    else if (selectedAnswers[q.id] !== undefined) classes += ' answered';

    return `
      <button class="${classes}" onclick="jumpToQuestion(${idx})">${idx + 1}</button>
    `;
  }).join('');
}

window.jumpToQuestion = function(idx) {
  currentQuestionIdx = idx;
  renderQuestion();
};

window.confirmSubmitExam = function() {
  const answeredCount = Object.keys(selectedAnswers).length;
  const total = activeExam.questions.length;
  if (answeredCount < total) {
    if (!confirm(`You have only answered ${answeredCount} of ${total} questions. Do you still wish to submit?`)) return;
  } else {
    if (!confirm("Are you sure you want to finish and submit your exam paper?")) return;
  }
  submitExamPaper();
};

// Post responses for grading evaluation
async function submitExamPaper(isAuto = false) {
  clearInterval(timerId);
  timerDisplay.classList.remove('timer-warning');

  const submission = {
    userId: currentStudent.id,
    answers: selectedAnswers
  };

  try {
    const res = await fetch(`/api/exams/${activeExam.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    });
    const graded = await res.json();
    
    if (res.ok) {
      renderResults(graded);
    } else {
      showToast("Error processing exam evaluation", true);
      showDashboard();
    }
  } catch (err) {
    showToast("Error grading submission", true);
    showDashboard();
  }
}

// Display graded Results panel
function renderResults(graded) {
  examRoomView.style.display = 'none';
  resultsView.style.display = 'block';

  document.getElementById('results-exam-title').innerText = graded.result.examTitle;
  
  const ringEl = document.getElementById('percentage-ring');
  ringEl.innerText = `${graded.result.percentage}%`;
  
  const statusEl = document.getElementById('result-status-text');
  statusEl.innerText = graded.result.passed ? "Passed" : "Failed";

  if (graded.result.passed) {
    ringEl.className = 'percentage-ring result-pass';
    statusEl.style.color = 'var(--success)';
  } else {
    ringEl.className = 'percentage-ring result-fail';
    statusEl.style.color = 'var(--danger)';
  }

  document.getElementById('result-score-summary').innerText = `You scored ${graded.result.score} correctly in this assessment.`;

  // Render correctness explanations
  breakdownContainer.innerHTML = `
    <h4 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem;">Solutions & Explanations</h4>
    ${graded.breakdown.map((item, idx) => `
      <div class="breakdown-item" style="border-left: 4px solid ${item.isCorrect ? 'var(--success)' : 'var(--danger)'}">
        <p style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.4rem;">${idx + 1}. ${item.questionText}</p>
        <div style="font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.2rem; color: var(--text-muted);">
          <span>Your selection: <strong style="color: ${item.isCorrect ? 'var(--success)' : 'var(--danger)'}">${item.studentAnswer}</strong></span>
          ${!item.isCorrect ? `<span>Correct Choice: <strong style="color: var(--success)">${item.correctAnswer}</strong></span>` : ''}
        </div>
      </div>
    `).join('')}
  `;
}

window.closeResultsView = function() {
  resultsView.style.display = 'none';
  showDashboard();
};

init();
