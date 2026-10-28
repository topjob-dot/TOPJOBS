/* ====================================================
   TOPJOBSEEKERS — Jobs system
   - Kenya + International jobs, mixed ~80/20 on the "All" tab
   - Click a card → auto-generated details + CV upload (emailed to the team)
   - Success placements, WhatsApp community links
   ==================================================== */
'use strict';

let JOBS = [];                 // every active job, normalised
let activeTab = 'all';         // 'all' | 'kenya' | 'international'
let visibleCount = SITE_CONFIG.pageSize;
let currentList = [];          // jobs matching the current tab + filters
let openJob = null;            // job shown in the modal
let modalFile = null;          // CV chosen in the modal

/* ---------- helpers ---------- */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lines = (txt) => String(txt || '').split(/\r?\n/).map((l) => l.replace(/^[\s•\-*·]+/, '').trim()).filter(Boolean);

function timeAgo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const w = Math.floor(days / 7);
  return w === 1 ? '1 week ago' : `${w} weeks ago`;
}

const KENYA_WORDS = ['kenya', 'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'thika', 'nyeri', 'machakos', 'kiambu', 'naivasha', 'malindi', 'kisii', 'kakamega', 'embu', 'meru', 'garissa', 'kajiado', 'ruiru', 'kitale'];
function regionOf(j) {
  if (j.region === 'kenya' || j.region === 'international') return j.region;
  const hay = `${j.country || ''} ${j.location || ''}`.toLowerCase().trim();
  if (!hay) return 'kenya';
  return KENYA_WORDS.some((w) => hay.includes(w)) ? 'kenya' : 'international';
}

// The dashboard says "Information Technology", the filter says "IT" — treat them as the same thing.
function categoryKey(c) {
  const s = String(c || '').toLowerCase();
  if (s.startsWith('information') || s === 'it' || s === 'technology') return 'IT';
  if (s.startsWith('domestic')) return 'Domestic';
  if (s.startsWith('finance')) return 'Finance';
  if (s.startsWith('logistic')) return 'Logistics';
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Other';
}

/* ---------- 80/20 mix ---------- */
// Every cycle: up to `kenyaShare` Kenyan jobs, then up to `intlShare` international ones (4:1 = 80/20).
function mixJobs(list) {
  const kenya = list.filter((j) => j.region === 'kenya');
  const intl = list.filter((j) => j.region === 'international');
  const out = [];
  let k = 0, i = 0;
  while (k < kenya.length || i < intl.length) {
    for (let n = 0; n < SITE_CONFIG.kenyaShare && k < kenya.length; n++) out.push(kenya[k++]);
    for (let n = 0; n < SITE_CONFIG.intlShare && i < intl.length; n++) out.push(intl[i++]);
  }
  return out;
}

/* ---------- load ---------- */
async function loadJobs() {
  const { data, error } = await supabaseClient.from('jobs').select('*').eq('active', true).order('created_at', { ascending: false });
  if (error) { console.error('Failed to load jobs:', error.message); JOBS = []; }
  else {
    JOBS = data.map((j) => ({
      id: j.id, title: j.title || 'Untitled role', company: j.company || 'Employer', location: j.location || j.country || 'Kenya',
      country: j.country || '', category: categoryKey(j.category), salary: j.salary || 'Negotiable — inquire',
      type: j.job_type || 'Full-time', badge: j.badge || 'new', icon: j.icon || '💼',
      posted: timeAgo(j.created_at), slots: j.slots || 1, image_url: j.image_url, description: j.description,
      requirements: j.requirements, responsibilities: j.responsibilities, benefits: j.benefits,
      apply_method: j.apply_method || 'cv', apply_url: j.apply_url, apply_email: j.apply_email,
      source: j.source || 'manual', source_url: j.source_url, deadline: j.deadline, region: regionOf(j),
    }));
  }
  updateTabCounts();
  applyFilters(false);
}

// Jobs added/changed in the dashboard (or by the auto-fetch) appear without a reload.
function subscribeJobsLive() {
  supabaseClient.channel('jobs-live').on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => loadJobs()).subscribe();
  setInterval(loadJobs, 5 * 60 * 1000);
}

/* ---------- filter + tabs ---------- */
function applyFilters(resetPaging = true) {
  if (resetPaging) visibleCount = SITE_CONFIG.pageSize;
  const kw = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const loc = document.getElementById('locationFilter')?.value || '';
  const cat = document.getElementById('categoryFilter')?.value || '';

  let list = JOBS.filter((j) => {
    if (activeTab !== 'all' && j.region !== activeTab) return false;
    if (kw && !(`${j.title} ${j.company} ${j.category} ${j.location}`.toLowerCase().includes(kw))) return false;
    if (loc === 'Kenya' && j.region !== 'kenya') return false;
    if (loc && loc !== 'Kenya' && !(j.country === loc || j.location.includes(loc))) return false;
    if (cat && j.category !== categoryKey(cat)) return false;
    return true;
  });
  currentList = activeTab === 'all' ? mixJobs(list) : list;
  renderJobs();
}

function updateTabCounts() {
  const k = JOBS.filter((j) => j.region === 'kenya').length;
  const set = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  set('tabCountAll', JOBS.length); set('tabCountKenya', k); set('tabCountIntl', JOBS.length - k);
}

document.querySelectorAll('.jobs-tab').forEach((btn) => btn.addEventListener('click', () => {
  activeTab = btn.dataset.tab;
  document.querySelectorAll('.jobs-tab').forEach((b) => b.classList.toggle('active', b === btn));
  applyFilters();
}));

function filterAndScroll() { applyFilters(); document.getElementById('jobsList')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
document.getElementById('searchBtn')?.addEventListener('click', filterAndScroll);
document.getElementById('searchInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') filterAndScroll(); });
document.getElementById('locationFilter')?.addEventListener('change', () => applyFilters());
document.getElementById('categoryFilter')?.addEventListener('change', () => applyFilters());
document.querySelectorAll('.cat-card').forEach((card) => card.addEventListener('click', () => {
  const sel = document.getElementById('categoryFilter');
  if (sel) sel.value = card.dataset.category;
  filterAndScroll();
}));

/* ---------- render cards ---------- */
function renderJobs() {
  const grid = document.getElementById('jobsGrid');
  const more = document.getElementById('jobsMoreWrap');
  const count = document.getElementById('jobsCount');
  if (!grid) return;

  if (count) count.textContent = currentList.length ? `${currentList.length} job${currentList.length === 1 ? '' : 's'} found` : '';
  if (!currentList.length) {
    grid.innerHTML = `
      <div class="jobs-empty">
        <i class="fas fa-search"></i><strong>No jobs found</strong>
        <p>Try a different keyword, or <a href="#cv-upload">submit your CV</a> and we'll match you as new roles come in.</p>
      </div>`;
    more?.classList.add('hidden');
    return;
  }

  const shown = currentList.slice(0, visibleCount);
  grid.innerHTML = shown.map((j) => {
    const isKenya = j.region === 'kenya';
    return `
    <article class="job-card reveal" tabindex="0" role="button" aria-label="View details and apply: ${esc(j.title)}" data-job-id="${esc(j.id)}">
      <div class="job-photo" data-job-id="${esc(j.id)}">
        <img alt="" loading="lazy" ${j.image_url ? `src="${esc(j.image_url)}" class="loaded"` : ''} />
        <span class="job-photo-fallback">${esc(j.icon)}</span>
        <span class="job-badge badge-${esc(j.badge)}">${esc(String(j.badge).toUpperCase())}</span>
        <span class="region-pill ${isKenya ? 'kenya' : 'intl'}">${isKenya ? '🇰🇪 Kenya' : '🌍 International'}</span>
      </div>
      <div class="job-title">${esc(j.title)}</div>
      <div class="job-company"><i class="fas fa-building" style="color:var(--blue);margin-right:5px;"></i>${esc(j.company)}</div>
      <div class="job-meta">
        <span class="job-tag"><i class="fas fa-map-marker-alt"></i>${esc(j.location)}</span>
        <span class="job-tag"><i class="fas fa-briefcase"></i>${esc(j.type)}</span>
        <span class="job-tag"><i class="fas fa-users"></i>${esc(j.slots)} slot${j.slots > 1 ? 's' : ''}</span>
      </div>
      <div class="job-salary">${esc(j.salary)}</div>
      <div class="job-footer">
        <span class="job-date"><i class="fas fa-clock" style="margin-right:4px;"></i>${esc(j.posted)}</span>
        <span class="btn btn-primary btn-apply">View &amp; Apply</span>
      </div>
    </article>`;
  }).join('');

  if (more) more.classList.toggle('hidden', currentList.length <= visibleCount);
  observeReveal();
  loadJobPhotos(shown);   // stock photo for cards without their own picture (script.js)
}

document.getElementById('jobsMoreBtn')?.addEventListener('click', () => { visibleCount += SITE_CONFIG.pageSize; renderJobs(); });

// one listener for every card (works for cards drawn later too)
document.getElementById('jobsGrid')?.addEventListener('click', (e) => {
  const card = e.target.closest('.job-card'); if (card) openJobModal(card.dataset.jobId);
});
document.getElementById('jobsGrid')?.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('job-card')) { e.preventDefault(); openJobModal(e.target.dataset.jobId); }
});

/* ---------- auto-generated job details ---------- */
// If you filled in requirements / responsibilities / benefits in the dashboard, those are shown.
// Otherwise the modal builds a sensible overview for that category so every card has full details.
const ROLE_TEMPLATES = {
  Healthcare: { resp: ['Provide safe, professional patient care in line with facility protocols', 'Keep accurate patient records and hand over clearly between shifts', 'Work with doctors and the wider care team', 'Follow infection-control and safety standards'],
                req: ['Relevant diploma or degree and professional registration/licence', 'Previous clinical or ward experience (as stated by the employer)', 'Good communication and teamwork', 'Valid ID/passport and certificates'] },
  Construction: { resp: ['Carry out site or technical work to specification and on schedule', 'Follow health and safety rules and use required PPE', 'Read drawings and report progress to supervisors', 'Maintain tools, equipment and work areas'],
                  req: ['Relevant trade certificate, diploma or degree', 'Hands-on experience in a similar role', 'Ability to work in a team on site', 'Physical fitness and safety awareness'] },
  Hospitality: { resp: ['Deliver friendly, high-standard guest service', 'Prepare, serve or maintain areas to hotel/restaurant standards', 'Follow food-safety and hygiene practices', 'Support the team during busy periods and shifts'],
                 req: ['Hospitality training or relevant experience', 'Good spoken English (other languages are a plus)', 'Presentable, reliable and customer-focused', 'Willingness to work shifts'] },
  IT: { resp: ['Design, build, support or maintain systems and software', 'Troubleshoot issues and document solutions', 'Work with the team to meet project deadlines', 'Keep up with security and quality practices'],
        req: ['Degree/diploma in IT or a related field, or equivalent experience', 'Hands-on skills in the tools named in the role', 'Problem-solving and clear communication', 'Portfolio or examples of past work are an advantage'] },
  Finance: { resp: ['Prepare and review financial records, reports and reconciliations', 'Support budgeting, payments and compliance', 'Ensure accuracy and confidentiality of financial data', 'Liaise with colleagues, clients and auditors'],
             req: ['Degree/diploma in accounting, finance or related field (CPA/ACCA progress is an advantage)', 'Experience with accounting software and Excel', 'Strong attention to detail', 'Integrity and good communication'] },
  Education: { resp: ['Plan and deliver engaging lessons or training', 'Assess learners and give constructive feedback', 'Maintain a safe, organised learning environment', 'Communicate with parents, learners and colleagues'],
               req: ['Teaching qualification or relevant degree', 'Classroom or training experience', 'Strong communication skills', 'Registration/certification where required'] },
  Domestic: { resp: ['Help care for the household, children or family members as agreed', 'Keep the home clean, organised and safe', 'Prepare meals and follow household routines', 'Maintain honesty, discretion and respect for the family'],
              req: ['Previous domestic or care experience', 'Reliable, honest and good with people', 'Basic English (or the household\'s language)', 'References and valid documents'] },
  Logistics: { resp: ['Plan, coordinate or carry out transport and warehouse activities', 'Handle goods safely and keep accurate records', 'Meet delivery and stock-control targets', 'Follow safety and company procedures'],
               req: ['Relevant licence, certificate or experience (e.g. valid driving licence for drivers)', 'Good time-keeping and route/stock awareness', 'Basic record-keeping skills', 'Clean safety and conduct record'] },
  Sales: { resp: ['Find, win and look after customers', 'Meet sales and activity targets', 'Present products clearly and follow up leads', 'Share market feedback with the team'],
           req: ['Sales or customer-service experience', 'Strong communication and negotiation skills', 'Self-motivated and target-driven', 'Basic computer skills'] },
  Admin: { resp: ['Handle day-to-day office and administrative tasks', 'Prepare documents, keep records and manage schedules', 'Answer calls and emails professionally', 'Support managers and colleagues as needed'],
           req: ['Diploma/certificate in a relevant field', 'Good computer skills (Word, Excel, email)', 'Organised, with strong written and spoken English', 'Discretion and reliability'] },
};
const DEFAULT_TEMPLATE = { resp: ['Carry out the duties of the role to the employer\'s standards', 'Work well with colleagues and supervisors', 'Keep accurate records and follow company procedures', 'Represent the company professionally'],
                           req: ['Relevant qualification or experience for the role', 'Good communication skills', 'Reliable, honest and willing to learn', 'Valid ID/passport and certificates'] };

function buildDetails(j) {
  const t = ROLE_TEMPLATES[j.category] || DEFAULT_TEMPLATE;
  const resp = lines(j.responsibilities), req = lines(j.requirements), ben = lines(j.benefits);
  const abroad = j.region === 'international';
  const overview = j.description && j.description.trim()
    ? j.description.trim()
    : `${j.company} is recruiting a ${j.title} based in ${j.location}. This is a ${String(j.type).toLowerCase()} position${j.slots > 1 ? ` with ${j.slots} openings` : ''} in the ${j.category} sector. Submit your CV below and our team will review it and be in touch.`;

  const benefits = ben.length ? ben : [
    `Salary: ${j.salary}`,
    abroad ? 'Full terms (contract, accommodation, travel) are confirmed in the employer\'s offer' : 'Terms confirmed by the employer at interview',
    abroad ? 'Help from our team with CV review, interview preparation and documents' : 'Free CV review by our recruitment team',
  ];
  return {
    overview, benefits,
    resp: resp.length ? resp : t.resp, respGenerated: !resp.length,
    req: req.length ? req : t.req, reqGenerated: !req.length,
  };
}

/* ---------- job modal ---------- */
function openJobModal(id) {
  const j = JOBS.find((x) => String(x.id) === String(id));
  if (!j) return;
  openJob = j; modalFile = null;
  const d = buildDetails(j);
  const abroad = j.region === 'international';
  const li = (arr) => arr.map((x) => `<li>${esc(x)}</li>`).join('');
  const isImported = String(j.source).startsWith('rss:');
  const host = isImported ? String(j.source).slice(4) : '';
  const hasOwnLink = j.apply_method === 'link' && j.apply_url;

  document.getElementById('jobModalBody').innerHTML = `
    <div class="jm-grid">
      <div class="jm-details">
        <span class="region-pill inline ${abroad ? 'intl' : 'kenya'}">${abroad ? '🌍 International' : '🇰🇪 Kenya'}</span>
        <h2 id="jmTitle">${esc(j.title)}</h2>
        <p class="jm-company"><i class="fas fa-building"></i> ${esc(j.company)}</p>
        <div class="jm-chips">
          <span><i class="fas fa-map-marker-alt"></i> ${esc(j.location)}</span>
          <span><i class="fas fa-briefcase"></i> ${esc(j.type)}</span>
          <span><i class="fas fa-layer-group"></i> ${esc(j.category)}</span>
          <span><i class="fas fa-users"></i> ${esc(j.slots)} opening${j.slots > 1 ? 's' : ''}</span>
          <span><i class="fas fa-clock"></i> ${esc(j.posted)}</span>
          ${j.deadline ? `<span><i class="fas fa-calendar-check"></i> Closes ${esc(new Date(j.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}</span>` : ''}
        </div>
        <div class="jm-salary">${esc(j.salary)}</div>

        <h4>About the role</h4>
        ${esc(d.overview).split(/\n+/).map((p) => `<p>${p}</p>`).join('')}

        <h4>Key responsibilities${d.respGenerated ? ' <small>(typical for this role)</small>' : ''}</h4>
        <ul>${li(d.resp)}</ul>

        <h4>What you'll need${d.reqGenerated ? ' <small>(typical for this role)</small>' : ''}</h4>
        <ul>${li(d.req)}</ul>

        <h4>Package &amp; support</h4>
        <ul>${li(d.benefits)}</ul>
        ${d.respGenerated || d.reqGenerated ? '<p class="jm-note"><i class="fas fa-info-circle"></i> Where details are marked "typical", the employer confirms the final requirements at interview.</p>' : ''}
        ${isImported && j.source_url ? `<p class="jm-note"><i class="fas fa-link"></i> Originally listed on ${esc(host)}. <a href="${esc(j.source_url)}" target="_blank" rel="noopener noreferrer">View original posting</a></p>` : ''}
      </div>

      <aside class="jm-apply">
        <h3><i class="fas fa-paper-plane"></i> Apply for this job</h3>
        <p class="jm-apply-sub">Upload your CV and we email it straight to our recruitment team.</p>
        ${hasOwnLink ? `<a class="btn btn-outline btn-full jm-ext" href="${esc(j.apply_url)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> Apply on employer's form</a><div class="jm-or"><span>or send your CV here</span></div>` : ''}
        <form id="jobApplyForm" novalidate>
          <input type="text" name="website" tabindex="-1" autocomplete="off" class="hp-field" aria-hidden="true" />
          <div class="form-group"><label for="jaName">Full name *</label><input id="jaName" type="text" placeholder="e.g. Jane Wanjiku" required autocomplete="name" /></div>
          <div class="form-group"><label for="jaPhone">Phone / WhatsApp *</label><input id="jaPhone" type="tel" placeholder="+254 7XX XXX XXX" required autocomplete="tel" /></div>
          <div class="form-group"><label for="jaEmail">Email *</label><input id="jaEmail" type="email" placeholder="jane@example.com" required autocomplete="email" /></div>
          <div class="form-group">
            <label>Your CV (PDF or Word, max 8MB) *</label>
            <div class="file-drop" id="jaDrop"><i class="fas fa-cloud-upload-alt"></i><span id="jaFileLabel">Tap to choose your CV</span>
              <input type="file" id="jaFile" accept=".pdf,.doc,.docx" hidden /></div>
          </div>
          <div class="form-group"><label for="jaMsg">Short message (optional)</label><textarea id="jaMsg" rows="2" placeholder="Anything the employer should know?"></textarea></div>
          <button type="submit" class="btn btn-primary btn-full" id="jaSubmit"><i class="fas fa-paper-plane"></i> Send my application</button>
          <div class="cv-error hidden" id="jaError"><i class="fas fa-exclamation-circle"></i> <span></span></div>
        </form>
        <div class="jm-success hidden" id="jaSuccess">
          <i class="fas fa-check-circle"></i>
          <h3>Application sent!</h3>
          <p id="jaSuccessText">Thank you. Our team will review your CV and contact you within 48 hours.</p>
          <button class="btn btn-outline" type="button" data-close-modal>Back to jobs</button>
        </div>
      </aside>
    </div>`;

  wireApplyForm();
  const modal = document.getElementById('jobModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  document.getElementById('jobModalBody').scrollTop = 0;
  modal.querySelector('.jm-close')?.focus();
}

function closeJobModal() {
  const modal = document.getElementById('jobModal');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  openJob = null;
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-close-modal]') || e.target.id === 'jobModal') closeJobModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeJobModal(); });

/* ---------- application (modal + the main "Submit CV" form share this) ---------- */
function validCvFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!['pdf', 'doc', 'docx'].includes(ext)) return 'Please upload a PDF or Word document.';
  if (file.size > 8 * 1024 * 1024) return 'That file is too large. Please upload a CV under 8MB.';
  return null;
}

// Sends to the send-application function (saves + emails the CV). If that's unreachable,
// falls back to saving it straight into Supabase so the application is never lost.
async function submitApplication({ job, name, phone, email, message, file, honeypot, extra }) {
  const fd = new FormData();
  fd.append('full_name', name); fd.append('phone', phone); fd.append('email', email);
  fd.append('message', message || ''); fd.append('cv', file); fd.append('website', honeypot || '');
  fd.append('job_id', job ? String(job.id) : ''); fd.append('job_title', job ? job.title : 'General CV submission');

  try {
    const res = await fetch(SITE_CONFIG.sendApplicationUrl, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY }, body: fd });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) return { emailed: data.emailed !== false };
    if (res.status >= 400 && res.status < 500) throw new Error(data.error || 'Please check your details and try again.');
  } catch (err) {
    if (err instanceof TypeError === false) throw err;      // a real validation message: show it
    console.warn('send-application unreachable, using direct save:', err);
  }

  // ---- fallback: direct save ----
  const { data: { user } } = await supabaseClient.auth.getUser();
  const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${user ? user.id : 'anon'}/${Date.now()}-${safe}`;
  const up = await supabaseClient.storage.from('cvs').upload(path, file);
  if (up.error) throw up.error;
  const row = { user_id: user ? user.id : null, full_name: name, phone, email, intro: message || null, cv_file_path: path,
                destination: extra?.destination ?? job?.country ?? null, job_category: extra?.jobCat ?? job?.category ?? null,
                job_id: job ? String(job.id) : null, job_title: job ? job.title : null };
  let ins = await supabaseClient.from('cv_submissions').insert(row);
  if (ins.error) { delete row.job_id; delete row.job_title; ins = await supabaseClient.from('cv_submissions').insert(row); }
  if (ins.error) throw ins.error;
  return { emailed: false };
}

function wireApplyForm() {
  const drop = document.getElementById('jaDrop'), input = document.getElementById('jaFile'), label = document.getElementById('jaFileLabel');
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  const take = (file) => {
    const bad = file && validCvFile(file);
    if (bad) { showApplyError(bad); return; }
    if (file) { modalFile = file; label.innerHTML = `<strong>${esc(file.name)}</strong> ✓`; drop.classList.add('has-file'); hideApplyError(); }
  };
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); take(e.dataTransfer.files[0]); });
  input.addEventListener('change', () => take(input.files[0]));

  document.getElementById('jobApplyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideApplyError();
    const name = document.getElementById('jaName').value.trim();
    const phone = document.getElementById('jaPhone').value.trim();
    const email = document.getElementById('jaEmail').value.trim();
    if (!name || !phone || !/^\S+@\S+\.\S+$/.test(email)) return showApplyError('Please enter your name, phone number and a valid email.');
    if (!modalFile) return showApplyError('Please attach your CV (PDF or Word).');

    const btn = document.getElementById('jaSubmit');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    try {
      const r = await submitApplication({ job: openJob, name, phone, email, message: document.getElementById('jaMsg').value.trim(), file: modalFile,
                                          honeypot: e.target.elements.website.value });
      document.getElementById('jobApplyForm').classList.add('hidden');
      if (!r.emailed) document.getElementById('jaSuccessText').textContent = 'Your CV has been received. Our team will review it and contact you within 48 hours.';
      document.getElementById('jaSuccess').classList.remove('hidden');
    } catch (err) {
      console.error(err);
      showApplyError(err.message || 'Something went wrong. Please try again or WhatsApp us.');
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send my application';
    }
  });
}
function showApplyError(msg) { const b = document.getElementById('jaError'); if (!b) return; b.querySelector('span').textContent = msg; b.classList.remove('hidden'); }
function hideApplyError() { document.getElementById('jaError')?.classList.add('hidden'); }

// The general "Submit Your CV" section (no specific job) uses the same email flow
document.getElementById('cvForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const btn = document.getElementById('submitCvBtn');
  const success = document.getElementById('cvSuccess');
  const errorBox = document.getElementById('cvError');
  errorBox?.classList.add('hidden');

  const name = document.getElementById('fname')?.value.trim();
  const phone = document.getElementById('phone')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  if (!name || !phone || !email) return alert('Please fill in all required fields.');
  if (!selectedCvFile) return alert('Please attach your CV (PDF or Word document).');

  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  try {
    const dest = document.getElementById('destination')?.value || null;
    const cat = document.getElementById('jobCat')?.value || null;
    const intro = document.getElementById('intro')?.value.trim() || '';
    await submitApplication({ job: null, name, phone, email, file: selectedCvFile, honeypot: '',
                              message: [dest && `Preferred destination: ${dest}`, cat && `Category: ${cat}`, intro].filter(Boolean).join('\n'),
                              extra: { destination: dest, jobCat: cat } });
    btn.innerHTML = '<i class="fas fa-check"></i> Submitted!'; btn.style.background = '#0a7c4e';
    success?.classList.remove('hidden');
    this.reset(); selectedCvFile = null;
    document.getElementById('fileLabel').innerHTML = 'Drag & drop your CV or <strong>click to browse</strong>';
  } catch (err) {
    console.error(err);
    document.getElementById('cvErrorText').textContent = err.message || 'Something went wrong. Please try again.';
    errorBox?.classList.remove('hidden');
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit My CV';
  }
});

/* ---------- successful placements ---------- */
async function loadPlacements() {
  const section = document.getElementById('placements');
  const track = document.getElementById('placementsGrid');
  if (!section || !track) return;
  const { data, error } = await supabaseClient.from('placements').select('*').eq('active', true).order('created_at', { ascending: false }).limit(24);
  if (error || !data || !data.length) { section.classList.add('hidden'); return; }   // hidden until you add the first one

  track.innerHTML = data.map((p) => `
    <figure class="placement-card reveal">
      <div class="placement-photo">
        ${p.photo_url ? `<img src="${esc(p.photo_url)}" alt="${esc(p.name)}, ${esc(p.role)}" loading="lazy" />` : `<div class="placement-initials">${esc((p.name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase())}</div>`}
        <span class="placement-ribbon"><i class="fas fa-check-circle"></i> Placed</span>
      </div>
      <figcaption>
        <strong>${esc(p.name)}</strong>
        <span class="placement-role">${esc(p.role)}</span>
        <span class="placement-where">${esc(p.country_flag || '')} ${esc(p.country || '')}${p.employer ? ` · ${esc(p.employer)}` : ''}</span>
        ${p.quote ? `<p class="placement-quote">“${esc(p.quote)}”</p>` : ''}
      </figcaption>
    </figure>`).join('');
  section.classList.remove('hidden');
  observeReveal();
}

/* ---------- WhatsApp community links ---------- */
function initCommunityLinks() {
  const fallback = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Hi TOPJOBSEEKERS, please add me to your WhatsApp community.')}`;
  const real = (u) => u && !/YOUR_/i.test(u);
  const urls = { channel: real(SITE_CONFIG.whatsappChannelUrl) ? SITE_CONFIG.whatsappChannelUrl : fallback,
                 group: real(SITE_CONFIG.whatsappGroupUrl) ? SITE_CONFIG.whatsappGroupUrl : fallback,
                 chat: fallback };
  document.querySelectorAll('[data-wa]').forEach((a) => { a.href = urls[a.dataset.wa] || fallback; a.target = '_blank'; a.rel = 'noopener noreferrer'; });
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initCommunityLinks();
  loadJobs();
  subscribeJobsLive();
  loadPlacements();
});
