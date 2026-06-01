// c:\Users\Deepak Chheda\Downloads\DEVANSH SUBMISSION\fsd\8b_animated_login\app.js

document.getElementById('animated-login-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const emailEl = document.getElementById('email-input');
  const passEl = document.getElementById('pass-input');
  const loginBox = document.getElementById('login-box');
  
  const emailErr = document.getElementById('email-err');
  const passErr = document.getElementById('pass-err');

  // Clear previous states
  emailEl.classList.remove('error-state', 'valid-state');
  passEl.classList.remove('error-state', 'valid-state');
  emailErr.style.display = 'none';
  passErr.style.display = 'none';
  loginBox.classList.remove('shake-error');

  const emailVal = emailEl.value.trim();
  const passVal = passEl.value;

  let isValid = true;

  // Format validations
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    emailEl.classList.add('error-state');
    emailErr.innerText = "Invalid email format";
    emailErr.style.display = 'block';
    isValid = false;
  }

  if (passVal.length < 6) {
    passEl.classList.add('error-state');
    passErr.innerText = "Minimum length: 6 characters";
    passErr.style.display = 'block';
    isValid = false;
  }

  if (isValid) {
    // Demo Authenticated Credentials check: admin@novatech.com / secret123
    if (emailVal === 'admin@novatech.com' && passVal === 'secret123') {
      emailEl.classList.add('valid-state');
      passEl.classList.add('valid-state');
      setTimeout(() => {
        alert("Authentication Successful!");
        document.getElementById('animated-login-form').reset();
        emailEl.classList.remove('valid-state');
        passEl.classList.remove('valid-state');
      }, 300);
    } else {
      isValid = false;
      emailEl.classList.add('error-state');
      passEl.classList.add('error-state');
      emailErr.innerText = "Invalid credentials";
      emailErr.style.display = 'block';
    }
  }

  if (!isValid) {
    // Shake Form Card
    void loginBox.offsetWidth; // Reflow reset trick
    loginBox.classList.add('shake-error');
  }
});
