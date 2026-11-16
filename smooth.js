/* smooth.js: home page only. WhatsApp button, country ripple-rain, animation pausing. */
(function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- glowing WhatsApp button ---------- */
  (function whatsapp() {
    const num = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.whatsappNumber) || '254748801685';
    const a = document.createElement('a');
    a.className = 'wa-fab'; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent('Hello TOPJOBSEEKERS, I would like to make an inquiry.');
    a.setAttribute('aria-label', 'Chat with us on WhatsApp');
    a.innerHTML = '<i class="fa-brands fa-whatsapp"></i><span class="wa-tip">Quick inquiry? Chat with us</span>';
    document.body.appendChild(a);
    const tip = a.querySelector('.wa-tip');
    setTimeout(() => tip.classList.add('show'), 3500);
    setTimeout(() => tip.classList.remove('show'), 9500);
  })();

  /* ---------- country ripple rain ---------- */
  (function rain() {
    const strip = document.getElementById('rainStrip'), grid = document.getElementById('rainGrid');
    if (!strip || !grid || typeof COUNTRY_LIST === 'undefined') return;
    grid.innerHTML = COUNTRY_LIST.map((c, i) => `<span class="rain-chip" style="--i:${i}">${flagFromEmoji(c.flag)} ${c.name}<i class="rp"></i></span>`).join('');
    const chips = [...grid.children];
    if (reduce) { strip.classList.add('go'); return; }

    let timer = null;
    const splash = () => {
      if (strip.querySelectorAll('.rain-drop,.rain-ring').length > 14) return;     // never pile up
      const w = strip.clientWidth, h = strip.clientHeight;
      const x = 12 + Math.random() * (w - 24), y = h * (.35 + Math.random() * .55);
      const d = document.createElement('i'); d.className = 'rain-drop';
      d.style.left = x + 'px'; d.style.setProperty('--y', (y + 20) + 'px'); d.style.setProperty('--t', (.55 + y / 600) + 's');
      d.addEventListener('animationend', () => {
        d.remove();
        const r = document.createElement('i'); r.className = 'rain-ring'; r.style.left = x + 'px'; r.style.top = y + 'px';
        r.addEventListener('animationend', () => r.remove()); strip.appendChild(r);
      });
      strip.appendChild(d);
      if (Math.random() < .45) {                                                    // sometimes a chip catches a drop
        const rp = chips[Math.floor(Math.random() * chips.length)].querySelector('.rp');
        rp.classList.remove('ping'); void rp.offsetWidth; rp.classList.add('ping');
      }
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { strip.classList.add('go'); if (!timer) timer = setInterval(splash, 520); }
        else if (timer) { clearInterval(timer); timer = null; }
      });
    }, { threshold: .25 });
    io.observe(strip);
    document.addEventListener('visibilitychange', () => { if (document.hidden && timer) { clearInterval(timer); timer = null; } });
    grid.addEventListener('pointerdown', (e) => {                                   // tap a country = ripple under your finger
      const c = e.target.closest('.rain-chip'); if (!c) return;
      const rp = c.querySelector('.rp'); rp.classList.remove('ping'); void rp.offsetWidth; rp.classList.add('ping');
    }, { passive: true });
  })();

  /* ---------- pause looping animations that are off-screen ---------- */
  (function pauseOffscreen() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.classList.toggle('is-offscreen', !en.isIntersecting));
    }, { rootMargin: '120px' });
    const watch = () => document.querySelectorAll('.tag-1, .tag-2, .showcase-track, .hot-pulse').forEach((el) => { if (!el.dataset.w) { el.dataset.w = 1; io.observe(el); } });
    watch(); setTimeout(watch, 2500);
  })();
})();
