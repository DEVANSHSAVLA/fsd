// c:\Users\Deepak Chheda\Downloads\DEVANSH SUBMISSION\fsd\8a_hamburger_menu\app.js

document.addEventListener('DOMContentLoaded', () => {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const menuLinks = document.getElementById('menu-links');

  hamburgerBtn.addEventListener('click', () => {
    hamburgerBtn.classList.toggle('active');
    menuLinks.classList.toggle('open');
  });

  // Close when menu links are clicked
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburgerBtn.classList.remove('active');
      menuLinks.classList.remove('open');
    });
  });
});
