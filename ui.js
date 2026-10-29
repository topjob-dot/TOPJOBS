/* UI behaviour: floating menu drawer, animated dropdown cards, FAQ, scroll highlight */
'use strict';
(function () {
  const $ = (id) => document.getElementById(id);

  /* ---------- floating menu + drawer ---------- */
  const fab = $('navFab'), drawer = $('mobileDrawer'), overlay = $('drawerOverlay');
  function setDrawer(open) {
    if (!fab || !drawer) return;
    drawer.classList.toggle('open', open);
    overlay?.classList.toggle('show', open);
    fab.classList.toggle('open', open);
    fab.setAttribute('aria-expanded', String(open));
    fab.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    drawer.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('drawer-open', open);
  }
  fab?.addEventListener('click', () => setDrawer(!drawer.classList.contains('open')));
  overlay?.addEventListener('click', () => setDrawer(false));
  drawer?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setDrawer(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 1180) setDrawer(false); });

  /* ---------- dropdown cards ---------- */
  const words = (t) => t.split(' ').map((w, i) => `<span class="word" style="--w:${i}">${w}</span>`).join(' ');
  function toggle(el, group, open) {
    document.querySelectorAll(group).forEach((o) => { if (o !== el) { o.classList.remove('open'); o.setAttribute('aria-expanded', 'false'); } });
    el.classList.toggle('open', open);
    el.setAttribute('aria-expanded', String(open));
  }

  // Categories: description + typical roles + button that filters the job list
  const CAT_INFO = {
    Healthcare:   { text: 'Hospitals, clinics and care homes hire qualified professionals. Have your licence and certificates ready.', roles: ['Registered Nurse', 'Clinical Officer', 'Lab Technician', 'Pharmacist', 'Caregiver', 'Midwife'] },
    Construction: { text: 'Site and technical roles for building and infrastructure projects. Trade certificates and hands-on experience matter most.', roles: ['Civil Engineer', 'Mason', 'Electrician', 'Plumber', 'Welder', 'Site Supervisor'] },
    Hospitality:  { text: 'Hotels, restaurants and lodges look for friendly, reliable staff. Training or experience helps.', roles: ['Chef', 'Waiter', 'Housekeeper', 'Receptionist', 'Barista', 'Front Office'] },
    IT:           { text: 'Software, network and support roles. A portfolio or certifications can set you apart.', roles: ['Developer', 'Network Engineer', 'IT Support', 'Data Analyst', 'Cybersecurity', 'Web Designer'] },
    Finance:      { text: 'Accounting, banking and finance teams. CPA or ACCA progress and strong Excel skills are a plus.', roles: ['Accountant', 'Auditor', 'Credit Analyst', 'Bank Teller', 'Finance Officer', 'Payroll Clerk'] },
    Education:    { text: 'Schools and training centres hire qualified teachers, tutors and trainers.', roles: ['Primary Teacher', 'Secondary Teacher', 'Lecturer', 'Tutor', 'Early Years', 'Trainer'] },
    Domestic:     { text: 'Households and care agencies hire reliable, experienced people. References and valid documents help.', roles: ['House Manager', 'Nanny', 'Caregiver', 'Cook', 'Housekeeper', 'Driver'] },
    Logistics:    { text: 'Transport, warehouse and supply chain roles. A valid licence or relevant certificate may be needed.', roles: ['Driver', 'Warehouse Staff', 'Logistics Coordinator', 'Forklift Operator', 'Store Keeper', 'Dispatcher'] },
  };
  document.querySelectorAll('.cat-card').forEach((card) => {
    const info = CAT_INFO[card.dataset.category];
    const box = card.querySelector('.cat-more-inner');
    if (info && box) {
      box.innerHTML = `<p>${words(info.text)}</p>
        <div class="role-chips">${info.roles.map((r, i) => `<span style="--c:${i}">${r}</span>`).join('')}</div>
        <button class="btn btn-primary cat-go" type="button" data-cat-go>See open jobs <i class="fas fa-arrow-right"></i></button>`;
    }
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-cat-go]')) { if (typeof filterByCategory === 'function') filterByCategory(card.dataset.category); return; }
      toggle(card, '.cat-card', !card.classList.contains('open'));
    });
    card.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); toggle(card, '.cat-card', !card.classList.contains('open')); }
    });
  });

  // How-it-works steps
  document.querySelectorAll('.step-card').forEach((card) => {
    const go = () => toggle(card, '.step-card', !card.classList.contains('open'));
    card.addEventListener('click', go);
    card.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); go(); } });
  });

  // FAQ
  document.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    q?.addEventListener('click', () => {
      const open = !item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach((o) => { o.classList.remove('open'); o.querySelector('.faq-q')?.setAttribute('aria-expanded', 'false'); });
      item.classList.toggle('open', open);
      q.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- highlight the nav link of the section in view ---------- */
  const links = [...document.querySelectorAll('.navbar .nav-links a[href^="#"]')].filter((a) => a.getAttribute('href').length > 1 && !a.classList.contains('btn'));
  if ('IntersectionObserver' in window && links.length) {
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.remove('nav-active'));
        map.get(en.target.id)?.classList.add('nav-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const sec = document.getElementById(id); if (sec) io.observe(sec); });
  }
})();
