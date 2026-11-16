/* ripple.js (home page): ripple on category cards + form blocks (replays scrolling either way),
   bubble ripple under every clickable button, hero video, glowing Instagram button. */
(function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------- Instagram glowing button (left side) ---------- */
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

  /* ---------- ripple on category cards + the two form blocks ---------- */
  (function hosts() {
    const list = [...document.querySelectorAll('.cat-card, .cv-form-wrap, .contact-form')];
    if (!list.length) return;
    list.forEach((h, i) => {
      h.classList.add('rip-host');
      h.dataset.rip = h.classList.contains('cat-card') ? 'card' : 'pool';
      const layer = document.createElement('span'); layer.className = 'rip-layer'; layer.setAttribute('aria-hidden', 'true');
      h.insertBefore(layer, h.firstChild);
      const idx = [...h.parentElement.children].filter((c) => c.classList.contains('cat-card')).indexOf(h);
      if (idx >= 0) h.style.setProperty('--d', (idx % 4) * 110 + 'ms');
    });
    document.documentElement.classList.add('rip-ready');

    const ring = (layer, x, y, k) => {
      const r = document.createElement('i'); r.className = 'rip-ring';
      r.style.left = x + 'px'; r.style.top = y + 'px'; if (k) r.style.setProperty('--k', k);
      r.addEventListener('animationend', () => r.remove()); layer.appendChild(r);
    };
    const splash = (host) => {
      const layer = host.firstChild; if (layer.children.length > 10) return;
      const w = host.clientWidth, h = host.clientHeight, x = rand(18, w - 18), y = h * rand(.3, .92);
      const d = document.createElement('i'); d.className = 'rip-drop';
      d.style.left = x + 'px'; d.style.setProperty('--y', (y + 20) + 'px'); d.style.setProperty('--t', (.5 + y / 800) + 's');
      d.addEventListener('animationend', () => { d.remove(); ring(layer, x, y, 1.1); });
      layer.appendChild(d);
    };

    const timers = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const h = en.target, pool = h.dataset.rip === 'pool';
        if (en.isIntersecting && en.intersectionRatio >= .15) {
          if (reduce) return;
          h.classList.add('rip-in');
          if (pool && !timers.has(h)) {
            [0, 300, 650].forEach((t) => setTimeout(() => splash(h), t));      // little burst on arrival, then gentle rain
            timers.set(h, setInterval(() => splash(h), 900));
          }
        } else if (en.intersectionRatio === 0) {                               // off screen: reset so it plays again (up or down)
          h.classList.remove('rip-in');
          if (timers.has(h)) { clearInterval(timers.get(h)); timers.delete(h); }
          h.firstChild.innerHTML = '';
        }
      });
    }, { threshold: [0, .15] });
    list.forEach((h) => io.observe(h));
    document.addEventListener('visibilitychange', () => { if (document.hidden) { timers.forEach((t) => clearInterval(t)); timers.clear(); } });

    /* tap anywhere on a block = ring spreads from your finger (buttons inside use their own ring) */
    list.forEach((h) => h.addEventListener('pointerdown', (e) => {
      if (reduce || e.target.closest('input,select,textarea,label')) return;
      const b = e.target.closest(BTN); if (b && b !== h) return;
      const r = h.getBoundingClientRect(); ring(h.firstChild, e.clientX - r.left, e.clientY - r.top, 1.4);
    }, { passive: true }));
  })();

  /* ---------- bubble ripple under every clickable button ---------- */
  var BTN = '.btn, button, .choice-card, [role="button"], .jobs-tab, .social-links a, .drawer-links a, .nav-fab, .xt-btn, .back-top, .wa-fab, .ig-fab';
  (function buttons() {
    if (reduce) return;
    const last = new WeakMap();
    const fixedAncestor = (el) => { for (let n = el; n && n !== document.documentElement; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return true; return false; };
    const spawn = (el) => {
      const r = el.getBoundingClientRect(); if (!r.width) return;
      const fx = fixedAncestor(el), ox = fx ? 0 : scrollX, oy = fx ? 0 : scrollY;
      const w = Math.max(14, Math.min(r.width * .2, 70));
      [0, 230].forEach((delay) => setTimeout(() => {
        const i = document.createElement('i'); i.className = 'tjs-ring' + (fx ? ' fx' : '');
        i.style.setProperty('--w', w + 'px'); i.style.left = (r.left + r.width / 2 + ox) + 'px'; i.style.top = (r.bottom - 3 + oy) + 'px';
        i.addEventListener('animationend', () => i.remove()); document.body.appendChild(i);
      }, delay));
    };
    const target = (e) => { const el = e.target.closest && e.target.closest(BTN); return el && !el.classList.contains('rip-host') && !el.classList.contains('rain-chip') && !el.disabled ? el : null; };
    document.addEventListener('pointerdown', (e) => { const el = target(e); if (el) spawn(el); }, { passive: true });
    document.addEventListener('pointerover', (e) => {                                   // mouse hover: one soft ring
      if (e.pointerType !== 'mouse') return;
      const el = target(e); if (!el || el.contains(e.relatedTarget)) return;
      const t = Date.now(); if (t - (last.get(el) || 0) < 1200) return; last.set(el, t); spawn(el);
    }, { passive: true });
  })();

  /* ---------- hero background video ---------- */
  (async function heroVideo() {
    const v = $('#heroVideo'); if (!v || reduce) return;
    const conn = navigator.connection || {};
    if (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) return;                // spare people's data
    const cfg = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG) || {};
    const portrait = innerWidth < 700, KEY = 'tjs_hero_vid_' + (portrait ? 'p' : 'l');
    let src = cfg.heroVideoUrl || '';
    if (!src) {
      try { src = sessionStorage.getItem(KEY) || ''; } catch (e) { /* ignore */ }
      if (!src && typeof PEXELS_API_KEY !== 'undefined' && !String(PEXELS_API_KEY).includes('YOUR-PEXELS')) {
        try {
          const q = encodeURIComponent(cfg.heroVideoQuery || 'airplane wing clouds sky travel');
          const res = await fetch(`https://api.pexels.com/videos/search?query=${q}&per_page=15&orientation=${portrait ? 'portrait' : 'landscape'}`, { headers: { Authorization: PEXELS_API_KEY } });
          const data = res.ok ? await res.json() : null;
          const vids = ((data && data.videos) || []).filter((x) => x.duration && x.duration <= 30);
          const pick = vids[Math.floor(Math.random() * vids.length)];
          if (pick) {
            const files = pick.video_files.filter((f) => f.file_type === 'video/mp4' && f.width >= 360 && f.width <= 1100).sort((a, b) => a.width - b.width);
            const f = files.find((x) => x.width >= 540) || files[files.length - 1];
            if (f) { src = f.link; try { sessionStorage.setItem(KEY, src); } catch (e) { /* ignore */ } }
          }
        } catch (e) { /* no video, the photo stays */ }
      }
    }
    if (!src) return;
    const start = () => {
      v.src = src; v.muted = true; v.setAttribute('muted', '');
      v.addEventListener('playing', () => v.classList.add('playing'), { once: true });
      v.addEventListener('error', () => v.remove(), { once: true });
      v.play().catch(() => {});
    };
    if (document.readyState === 'complete') setTimeout(start, 300); else addEventListener('load', () => setTimeout(start, 300), { once: true });
    new IntersectionObserver((en) => en.forEach((x) => { if (!v.src) return; if (x.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { threshold: .05 }).observe($('#home'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) v.pause(); });
  })();
})();
