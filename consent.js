/* Cookie / storage notice. Shown once; "Cookie settings" in the footer re-opens it. */
'use strict';
(function () {
  const KEY = 'tjs_cookie_notice_v1';
  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const set = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode */ } };

  function build() {
    let b = document.getElementById('cookieBanner');
    if (b) return b;
    b = document.createElement('div');
    b.id = 'cookieBanner';
    b.className = 'cookie-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Cookie notice');
    b.innerHTML = `
      <p>We use essential storage to keep you signed in and remember your chat, and we load fonts, icons and stock photos from third-party providers. We do not run advertising cookies.
      Read our <a href="cookie-policy.html">Cookie Policy</a> and <a href="privacy.html">Privacy Policy</a>.</p>
      <div class="cookie-actions"><button type="button" class="primary" id="cookieOk">OK, got it</button></div>`;
    document.body.appendChild(b);
    b.querySelector('#cookieOk').addEventListener('click', () => { set('ok'); b.classList.remove('show'); });
    return b;
  }
  function show() { const b = build(); requestAnimationFrame(() => b.classList.add('show')); }

  if (!get()) setTimeout(show, 900);
  document.getElementById('cookieSettings')?.addEventListener('click', (e) => { e.preventDefault(); show(); });
  document.querySelectorAll('[data-cookie-settings]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); show(); }));
})();
