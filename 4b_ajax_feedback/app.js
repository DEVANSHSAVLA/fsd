// c:\Users\Deepak Chheda\Downloads\DEVANSH SUBMISSION\fsd\4b_ajax_feedback\app.js

document.getElementById('ajax-feedback-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const nameInput = document.getElementById('fb-name');
  const ratingInput = document.getElementById('fb-rating');
  const commentsInput = document.getElementById('fb-comments');
  const submitBtn = document.getElementById('fb-btn');
  const reviewsContainer = document.getElementById('reviews-container');

  const nameVal = nameInput.value.trim();
  const ratingVal = ratingInput.value;
  const commentsVal = commentsInput.value.trim();

  if (!nameVal || !commentsVal) return;

  // Change button state to loading (AJAX simulation)
  const originalText = submitBtn.innerText;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner"></span>Sending...`;

  // Simulating AJAX Post with setTimeout
  setTimeout(() => {
    // Generate star ratings
    let stars = '';
    for (let i = 0; i < Number(ratingVal); i++) {
      stars += '⭐';
    }

    // Create review element
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
      <div class="review-header">
        <span class="review-author">${escapeHTML(nameVal)}</span>
        <span class="review-rating">${stars}</span>
      </div>
      <p class="review-text">${escapeHTML(commentsVal)}</p>
    `;

    // Append to wall (No reload)
    reviewsContainer.insertBefore(card, reviewsContainer.firstChild);

    // Reset Form
    submitBtn.disabled = false;
    submitBtn.innerText = originalText;
    document.getElementById('ajax-feedback-form').reset();
  }, 1000);
});

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
