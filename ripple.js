/* ripple.js (home page): job-category bubbles drop in (replays scrolling either way) + Instagram button. */
(function () {
  'use strict';

  /* ---------- Instagram glowing button (top right) ---------- */
  (function instagram() {
    const url = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.instagramUrl) || 'https://www.instagram.com/topjobsseekers';
    const a = document.createElement('a');
    a.className = 'ig-fab'; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', 'Follow us on Instagram');
    a.innerHTML = '<i class="fa-brands fa-instagram"></i><span class="ig-tip">Follow us on Instagram</span>';
    document.body.appendChild(a);
    const tip = a.querySelector('.ig-tip');
    setTimeout(() => tip.classList.add('show'), 10500);
    setTimeout(() => tip.classList.remove('show'), 15500);
  })();

  /* ---------- category bubbles: drop in every time they come on screen, scrolling down OR up ---------- */
  (function chips() {
    const box = document.getElementById('catChips'); if (!box) return;
    if (!('IntersectionObserver' in window)) { box.classList.add('go'); return; }
    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && en.intersectionRatio >= .25) box.classList.add('go');
        else if (en.intersectionRatio === 0) box.classList.remove('go');
      });
    }, { threshold: [0, .25] }).observe(box);
  })();
})();
