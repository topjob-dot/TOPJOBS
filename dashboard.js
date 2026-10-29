'use strict';

const dashBody = document.getElementById('dashBody');
const rolePill = document.getElementById('rolePill');

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
});

function statusPill(status) {
  return `<span class="status-pill status-${status}">${status}</span>`;
}

async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    dashBody.innerHTML = `<div class="empty-state">Could not load your profile. Please try logging in again.</div>`;
    return;
  }

  rolePill.textContent = profile.role.replace('_', ' ');

  if (profile.role === 'job_seeker') renderJobSeekerView(session.user.id, profile);
  else if (profile.role === 'employer') renderEmployerView(profile);
  else if (profile.role === 'admin') renderAdminView(profile);
}

// ===================== JOB SEEKER VIEW =====================
function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

async function renderJobSeekerView(userId, profile) {
  const { data, error } = await supabaseClient
    .from('cv_submissions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const submissions = (!error && data) ? data : [];
  const total = submissions.length;
  const shortlisted = submissions.filter(s => s.status === 'shortlisted').length;
  const placed = submissions.filter(s => s.status === 'placed').length;

  const rows = total
    ? submissions.map(s => `
        <tr>
          <td>${new Date(s.created_at).toLocaleDateString()}</td>
          <td>${s.job_category || '—'}</td>
          <td>${s.destination || '—'}</td>
          <td>${statusPill(s.status)}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" class="empty-state">No CV submissions yet. Submit one from the main site.</td></tr>`;

  const joined = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : '—';
  const balance = Number(profile.wallet_balance || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });

  dashBody.innerHTML = `
    <div class="dash-card profile-card reveal-dash">
      <div class="profile-card-top">
        <div class="profile-avatar">${initials(profile.full_name)}</div>
        <div>
          <h3 style="margin-bottom:2px;">${profile.full_name || 'Job Seeker'}</h3>
          <p style="color:var(--text-muted);font-size:13px;">Member since ${joined}</p>
        </div>
      </div>
      <div class="profile-detail-grid">
        <div class="profile-detail"><i class="fas fa-envelope"></i><span>${profile.email || '—'}</span></div>
        <div class="profile-detail"><i class="fas fa-phone"></i><span>${profile.phone || '—'}</span></div>
        <div class="profile-detail"><i class="fas fa-globe-africa"></i><span>${profile.country || '—'}</span></div>
        <div class="profile-detail"><i class="fas fa-graduation-cap"></i><span>${profile.education_level || 'Not specified'}</span></div>
      </div>
      ${profile.privacy_accepted ? `<p class="privacy-note"><i class="fas fa-shield-alt"></i> Privacy Policy accepted</p>` : ''}
    </div>

    <div class="wallet-card reveal-dash">
      <div class="wallet-label"><i class="fas fa-wallet"></i> Savings Balance</div>
      <div class="wallet-amount">KSH <span id="walletAmountNum">0</span></div>
      <p class="wallet-note">Balance held toward future service payment. Updated by TOPJOBSEEKERS admin.</p>
    </div>

    <div class="stats-row reveal-dash">
      <div class="stat-chip"><span class="stat-num">${total}</span><span class="stat-label">Applications</span></div>
      <div class="stat-chip"><span class="stat-num">${shortlisted}</span><span class="stat-label">Shortlisted</span></div>
      <div class="stat-chip"><span class="stat-num">${placed}</span><span class="stat-label">Placed</span></div>
    </div>

    <div class="dash-card reveal-dash">
      <h3>Submit a CV</h3>
      <p style="color:var(--text-muted);margin-bottom:20px;">Submit directly from here — it'll appear in your history below instantly.</p>
      <form id="dashCvForm">
        <div class="form-row">
          <div class="form-group">
            <label>Destination</label>
            <select id="dashDestination">
              <option value="">Select country</option>
              <option>UAE</option><option>Qatar</option><option>Saudi Arabia</option>
              <option>United Kingdom</option><option>Germany</option><option>Canada</option>
              <option>Singapore</option><option>Australia</option><option>Kuwait</option>
              <option>Open to Any</option>
            </select>
          </div>
          <div class="form-group">
            <label>Job Category</label>
            <select id="dashJobCat">
              <option value="">Select category</option>
              <option>Healthcare</option><option>Construction</option><option>Hospitality</option>
              <option>Information Technology</option><option>Finance</option>
              <option>Education</option><option>Domestic Staff</option><option>Logistics</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Upload CV (PDF or Word) *</label>
          <div class="file-drop" id="dashFileDrop">
            <i class="fas fa-cloud-upload-alt"></i>
            <span id="dashFileLabel">Tap to choose your CV</span>
            <input type="file" id="dashCvFile" accept=".pdf,.doc,.docx" hidden />
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-full" id="dashCvSubmitBtn"><i class="fas fa-paper-plane"></i> Submit CV</button>
        <div class="field-error show" id="dashCvError" style="display:none;"></div>
      </form>
    </div>

    <div class="dash-card reveal-dash">
      <h3>Application History</h3>
      <p style="color:var(--text-muted);margin-bottom:20px;">Track the status of your CV submissions below.</p>
      <table class="dash-table">
        <thead><tr><th>Date</th><th>Category</th><th>Destination</th><th>Status</th></tr></thead>
        <tbody id="dashHistoryBody">${rows}</tbody>
      </table>
    </div>
  `;

  requestAnimationFrame(() => {
    document.querySelectorAll('.reveal-dash').forEach((el, i) => {
      el.style.transitionDelay = `${i * 0.08}s`;
      requestAnimationFrame(() => el.classList.add('in-view-dash'));
    });
    animateWalletNumber(Number(profile.wallet_balance || 0));
  });

  wireDashCvForm(userId, profile);
}

function animateWalletNumber(target) {
  const el = document.getElementById('walletAmountNum');
  if (!el) return;
  const duration = 900, start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased).toLocaleString('en-KE');
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

let dashSelectedCvFile = null;

function wireDashCvForm(userId, profile) {
  const drop = document.getElementById('dashFileDrop');
  const fileInput = document.getElementById('dashCvFile');
  const label = document.getElementById('dashFileLabel');
  drop?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', () => {
    if (fileInput.files[0]) {
      dashSelectedCvFile = fileInput.files[0];
      label.textContent = dashSelectedCvFile.name;
    }
  });

  document.getElementById('dashCvForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = document.getElementById('dashCvSubmitBtn');
    const errorEl = document.getElementById('dashCvError');
    errorEl.style.display = 'none';

    if (!dashSelectedCvFile) {
      errorEl.textContent = 'Please attach your CV (PDF or Word document).';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
      const safeName = dashSelectedCvFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${userId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabaseClient.storage.from('cvs').upload(filePath, dashSelectedCvFile);
      if (uploadError) throw uploadError;

      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      const emailToUse = profile.email || authUser?.email;

      const { error: insertError } = await supabaseClient.from('cv_submissions').insert({
        user_id: userId,
        full_name: profile.full_name, phone: profile.phone, email: emailToUse,
        destination: document.getElementById('dashDestination').value || null,
        job_category: document.getElementById('dashJobCat').value || null,
        cv_file_path: filePath,
      });
      if (insertError) throw insertError;

      btn.innerHTML = '<i class="fas fa-check"></i> Submitted!';
      btn.style.background = '#0a7c4e';
      dashSelectedCvFile = null;
      this.reset();
      label.textContent = 'Tap to choose your CV';

      // refresh the whole view so the Applications count and history update immediately
      renderJobSeekerView(userId, profile);
    } catch (err) {
      console.error(err);
      errorEl.textContent = err.message || 'Something went wrong. Please try again.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit CV';
    }
  });
}

// ===================== EMPLOYER VIEW =====================
async function renderEmployerView(profile) {
  if (!profile.approved) {
    dashBody.innerHTML = `
      <div class="pending-banner"><i class="fas fa-clock"></i> Your employer account for <strong>${profile.company_name || ''}</strong> is pending admin approval. You'll be able to browse candidates once approved.</div>
    `;
    return;
  }

  const { data, error } = await supabaseClient
    .from('cv_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  const rows = (!error && data && data.length)
    ? data.map(s => `
        <tr>
          <td>${s.full_name}</td>
          <td>${s.job_category || '—'}</td>
          <td>${s.destination || '—'}</td>
          <td>${s.email}<br/><small>${s.phone}</small></td>
          <td>${statusPill(s.status)}</td>
        </tr>`).join('')
    : `<tr><td colspan="5" class="empty-state">No candidates in the pool yet.</td></tr>`;

  dashBody.innerHTML = `
    <div class="dash-card">
      <h3>Candidate Pool — ${profile.company_name || 'Your Company'}</h3>
      <table class="dash-table">
        <thead><tr><th>Name</th><th>Category</th><th>Destination</th><th>Contact</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ===================== ADMIN VIEW =====================
async function renderAdminView() {
  dashBody.innerHTML = `
    <div class="dash-card" id="adminHotCard"></div>
    <div class="dash-card" id="adminPostJobCard"></div>
    <div class="dash-card" id="adminJobsCard"><h3>Manage Jobs</h3><div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div></div>
    <div class="dash-card" id="adminPlacementsCard"></div>
    <div class="dash-card" id="adminWalletCard"><h3>Wallet Management</h3><div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div></div>
    <div class="dash-card" id="adminCvCard"><h3>CV Submissions</h3><div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div></div>
    <div class="dash-card" id="adminEmployerCard"><h3>Employer Approvals</h3><div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div></div>
    <div class="dash-card" id="adminTestiCard"><h3>Testimonials</h3><div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div></div>
  `;
  renderHotForm();
  renderPostJobForm();
  loadAdminJobs();
  renderPlacementsCard();
  loadAdminWallet();
  loadAdminCvs();
  loadAdminEmployers();
  loadAdminTestimonials();
}

let postJobSelectedPhoto = null;

const ADMIN_FLAGS = { 'kenya': '🇰🇪', 'uae': '🇦🇪', 'qatar': '🇶🇦', 'saudi arabia': '🇸🇦', 'united kingdom': '🇬🇧', 'uk': '🇬🇧', 'germany': '🇩🇪', 'canada': '🇨🇦', 'singapore': '🇸🇬', 'australia': '🇦🇺', 'kuwait': '🇰🇼', 'bahrain': '🇧🇭', 'netherlands': '🇳🇱', 'japan': '🇯🇵', 'oman': '🇴🇲', 'usa': '🇺🇸', 'united states': '🇺🇸' };
const adminEsc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderPostJobForm() {
  postJobSelectedPhoto = null;
  const card = document.getElementById('adminPostJobCard');
  const ta = 'style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;resize:vertical;"';
  card.innerHTML = `
    <h3><i class="fas fa-bullhorn"></i> Post a Job</h3>
    <p style="color:var(--text-muted);margin-bottom:16px;">Goes live on the site instantly. Visitors click the card, read these details and upload their CV, which is emailed to you. Leave requirements/responsibilities empty and the site fills in typical ones for the role.</p>

    <div class="form-row">
      <div class="form-group">
        <label>Where is this job? *</label>
        <select id="pjRegion"><option value="kenya">Kenya (local)</option><option value="international">International (abroad)</option></select>
      </div>
      <div class="form-group"><label>Job Title *</label><input type="text" id="pjTitle" placeholder="e.g. Registered Nurse" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Company</label><input type="text" id="pjCompany" placeholder="e.g. Al Razi Medical Center" /></div>
      <div class="form-group"><label>Country</label><input type="text" id="pjCountry" placeholder="Kenya, UAE, Qatar..." /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Location / City</label><input type="text" id="pjLocation" placeholder="e.g. Nairobi, Kenya" /></div>
      <div class="form-group">
        <label>Category</label>
        <select id="pjCategory">
          <option>Healthcare</option><option>Construction</option><option>Hospitality</option>
          <option>Information Technology</option><option>Finance</option><option>Education</option>
          <option>Domestic</option><option>Logistics</option><option>Sales</option><option>Admin</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Salary (optional)</label><input type="text" id="pjSalary" placeholder="e.g. KSH 80,000/mo or Negotiable" /></div>
      <div class="form-group">
        <label>Job type</label>
        <select id="pjType"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Live-in</option></select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Openings</label><input type="number" id="pjSlots" min="1" value="1" /></div>
      <div class="form-group"><label>Application deadline (optional)</label><input type="date" id="pjDeadline" /></div>
    </div>
    <div class="form-group"><label>About the role</label><textarea id="pjCaption" rows="3" ${ta} placeholder="A short description of the job."></textarea></div>
    <div class="form-group"><label>Responsibilities (one per line, optional)</label><textarea id="pjResp" rows="3" ${ta}></textarea></div>
    <div class="form-group"><label>Requirements (one per line, optional)</label><textarea id="pjReq" rows="3" ${ta}></textarea></div>
    <div class="form-group"><label>Benefits / package (one per line, optional)</label><textarea id="pjBen" rows="2" ${ta}></textarea></div>

    <div class="form-group">
      <label>Job Photo (optional — a matching stock photo is used if you skip this)</label>
      <div class="file-drop" id="postJobPhotoDrop">
        <i class="fas fa-image"></i>
        <span id="postJobPhotoLabel">Tap to choose a photo</span>
        <input type="file" id="postJobPhotoFile" accept="image/*" hidden />
      </div>
    </div>

    <div class="form-group">
      <label>How should candidates apply?</label>
      <div class="role-selector" style="display:flex;gap:10px;flex-wrap:wrap;">
        <div class="role-option selected" data-method="cv" style="flex:1;min-width:150px;text-align:center;padding:12px;border:1.5px solid var(--blue);background:var(--blue-light);border-radius:10px;cursor:pointer;"><i class="fas fa-file-upload"></i> Site CV form<br><small>(emailed to you)</small></div>
        <div class="role-option" data-method="email" style="flex:1;min-width:150px;text-align:center;padding:12px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;"><i class="fas fa-envelope"></i> To employer's email<br><small>(you're copied)</small></div>
        <div class="role-option" data-method="link" style="flex:1;min-width:150px;text-align:center;padding:12px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;"><i class="fas fa-link"></i> Also an external link<br><small>(Google Form, etc.)</small></div>
      </div>
    </div>
    <div class="form-group" id="pjLinkGroup" style="display:none;"><label>Application Link</label><input type="url" id="pjApplyLink" placeholder="https://docs.google.com/forms/..." /></div>
    <div class="form-group" id="pjEmailGroup" style="display:none;"><label>Employer's Application Email</label><input type="email" id="pjApplyEmail" placeholder="hr@company.com" /></div>

    <button class="btn btn-primary btn-full" id="postJobBtn"><i class="fas fa-paper-plane"></i> Post Job</button>
    <div class="field-error" id="postJobMsg" style="margin-top:12px;"></div>
  `;

  // Kenya/International → sensible defaults for country
  const region = document.getElementById('pjRegion'), country = document.getElementById('pjCountry');
  region.addEventListener('change', () => { if (region.value === 'kenya' && !country.value) country.value = 'Kenya'; });
  country.value = 'Kenya';

  const drop = document.getElementById('postJobPhotoDrop'), fileInput = document.getElementById('postJobPhotoFile'), label = document.getElementById('postJobPhotoLabel');
  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) { postJobSelectedPhoto = fileInput.files[0]; label.textContent = postJobSelectedPhoto.name; } });

  let applyMethod = 'cv';
  card.querySelectorAll('.role-option').forEach((opt) => opt.addEventListener('click', () => {
    applyMethod = opt.dataset.method;
    card.querySelectorAll('.role-option').forEach((o) => { const on = o === opt; o.classList.toggle('selected', on); o.style.borderColor = on ? 'var(--blue)' : 'var(--border)'; o.style.background = on ? 'var(--blue-light)' : ''; });
    document.getElementById('pjLinkGroup').style.display = applyMethod === 'link' ? 'block' : 'none';
    document.getElementById('pjEmailGroup').style.display = applyMethod === 'email' ? 'block' : 'none';
  }));

  document.getElementById('postJobBtn').addEventListener('click', async () => {
    const msg = document.getElementById('postJobMsg');
    msg.classList.remove('show');
    const fail = (t) => { msg.textContent = t; msg.classList.add('show'); };
    const val = (id) => document.getElementById(id).value.trim();
    const title = val('pjTitle');
    if (!title) return fail('Job title is required.');
    if (applyMethod === 'link' && !val('pjApplyLink')) return fail('Please add an application link.');
    if (applyMethod === 'email' && !val('pjApplyEmail')) return fail('Please add the employer\'s application email.');

    const btn = document.getElementById('postJobBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
    try {
      let imageUrl = null;
      if (postJobSelectedPhoto) {
        const filePath = `${Date.now()}-${postJobSelectedPhoto.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        const { error: upErr } = await supabaseClient.storage.from('job-photos').upload(filePath, postJobSelectedPhoto);
        if (upErr) throw upErr;
        imageUrl = supabaseClient.storage.from('job-photos').getPublicUrl(filePath).data.publicUrl;
      }
      const isKenya = val('pjRegion') === 'kenya';
      const { error: insertError } = await supabaseClient.from('jobs').insert({
        title, company: val('pjCompany') || null,
        country: val('pjCountry') || (isKenya ? 'Kenya' : null), location: val('pjLocation') || null,
        region: val('pjRegion'), category: val('pjCategory'), slots: parseInt(val('pjSlots')) || 1,
        salary: val('pjSalary') || 'Negotiable — inquire', job_type: val('pjType'),
        description: val('pjCaption') || null, responsibilities: val('pjResp') || null, requirements: val('pjReq') || null, benefits: val('pjBen') || null,
        deadline: val('pjDeadline') || null, image_url: imageUrl,
        apply_method: applyMethod,
        apply_url: applyMethod === 'link' ? val('pjApplyLink') : null,
        apply_email: applyMethod === 'email' ? val('pjApplyEmail') : null,
        source: 'manual', active: true, badge: 'new', icon: '💼',
      });
      if (insertError) throw insertError;
      btn.innerHTML = '<i class="fas fa-check"></i> Posted!'; btn.style.background = '#0a7c4e';
      loadAdminJobs();
      setTimeout(renderPostJobForm, 1200);
    } catch (err) {
      console.error(err);
      fail(err.message || 'Something went wrong. If it mentions a missing column, run supabase-setup.sql first.');
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Job';
    }
  });
}


// ---------- Hot alerts (quick post, shows in the "Hot Job Alerts" strip until it expires) ----------
function renderHotForm() {
  const card = document.getElementById('adminHotCard');
  if (!card) return;
  card.innerHTML = `
    <h3><i class="fas fa-fire" style="color:#e5484d"></i> Post a Hot Alert</h3>
    <p style="color:var(--text-muted);margin-bottom:16px;">For urgent, last-minute openings. It appears at the top of the site straight away, people can apply with their CV, and it leaves the Hot strip automatically when time is up.</p>
    <div class="form-row">
      <div class="form-group"><label>Job title *</label><input type="text" id="hotTitle" placeholder="e.g. 10 Drivers needed in Mombasa" /></div>
      <div class="form-group"><label>Where? *</label><select id="hotRegion"><option value="kenya">Kenya (local)</option><option value="international">International (abroad)</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Location</label><input type="text" id="hotLocation" placeholder="e.g. Mombasa, Kenya" /></div>
      <div class="form-group"><label>Company (optional)</label><input type="text" id="hotCompany" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Category</label>
        <select id="hotCategory"><option>Logistics</option><option>Healthcare</option><option>Construction</option><option>Hospitality</option><option>Information Technology</option><option>Finance</option><option>Education</option><option>Domestic</option><option>Sales</option><option>Admin</option></select></div>
      <div class="form-group"><label>Show as hot for</label>
        <select id="hotHours"><option value="6">6 hours</option><option value="24" selected>24 hours</option><option value="72">3 days</option><option value="168">7 days</option></select></div>
    </div>
    <div class="form-group"><label>Details (a few lines: pay, requirements, how many people)</label><textarea id="hotDesc" rows="3" style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;"></textarea></div>
    <button class="btn btn-primary btn-full" id="hotPostBtn"><i class="fas fa-fire"></i> Post Hot Alert</button>
    <div class="field-error" id="hotMsg" style="margin-top:12px;"></div>`;

  document.getElementById('hotPostBtn').addEventListener('click', async () => {
    const msg = document.getElementById('hotMsg'); msg.classList.remove('show');
    const v = (id) => document.getElementById(id).value.trim();
    const fail = (t) => { msg.textContent = t; msg.classList.add('show'); };
    if (!v('hotTitle')) return fail('Please enter the job title.');
    const btn = document.getElementById('hotPostBtn'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
    const until = new Date(Date.now() + parseInt(v('hotHours')) * 3600000);
    const kenya = v('hotRegion') === 'kenya';
    const { error } = await supabaseClient.from('jobs').insert({
      title: v('hotTitle'), company: v('hotCompany') || null, location: v('hotLocation') || null,
      country: kenya ? 'Kenya' : null, region: v('hotRegion'), category: v('hotCategory'),
      description: v('hotDesc') || null, salary: 'Negotiable — inquire', job_type: 'Full-time', slots: 1,
      is_hot: true, hot_until: until.toISOString(), deadline: until.toISOString().slice(0, 10),
      badge: 'hot', icon: '🔥', apply_method: 'cv', source: 'manual', active: true,
    });
    if (error) {
      console.error(error);
      fail((error.message || 'Could not post.') + ' (If this mentions a missing column, run supabase-setup.sql first.)');
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-fire"></i> Post Hot Alert'; return;
    }
    btn.innerHTML = '<i class="fas fa-check"></i> Live on the site!';
    loadAdminJobs();
    setTimeout(renderHotForm, 1400);
  });
}

// ---------- Manage jobs (switch off / delete / fetch Kenyan jobs) ----------
async function loadAdminJobs() {
  const card = document.getElementById('adminJobsCard');
  const { data, error } = await supabaseClient.from('jobs').select('id,title,company,region,source,active,created_at,is_hot,hot_until').order('created_at', { ascending: false }).limit(40);
  const head = `<h3><i class="fas fa-list"></i> Manage Jobs</h3>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:6px;">
      <button class="btn btn-outline small-btn" id="syncJobsBtn"><i class="fas fa-sync"></i> Fetch Kenyan jobs now</button>
      <span id="syncMsg" class="dash-hint" style="margin:0;"></span>
    </div>
    <p class="dash-hint">Auto-fetched jobs come from the Kenyan feeds set up in the sync function. Your own posts are never overwritten.</p>`;
  if (error || !data) { card.innerHTML = head + `<div class="empty-state">Could not load jobs.</div>`; wireSync(); return; }
  card.innerHTML = head + (data.length ? `<div class="mini-list">${data.map((j) => `
      <div class="mini-row">
        <div class="mini-ph" style="font:700 11px var(--font);color:var(--blue)">${j.is_hot ? '🔥' : (j.region === 'international' ? 'INTL' : 'KE')}</div>
        <div class="mini-main"><strong>${adminEsc(j.title)}</strong><span class="sub">${adminEsc(j.company || '—')} · ${String(j.source || 'manual').startsWith('rss:') ? 'auto-fetched' : 'manual'}${j.active ? '' : ' · hidden'}</span></div>
        <button class="small-btn" data-toggle="${j.id}" data-active="${j.active}">${j.active ? 'Hide' : 'Show'}</button>
        <button class="small-btn danger" data-del="${j.id}">Delete</button>
      </div>`).join('')}</div>` : `<div class="empty-state">No jobs yet.</div>`);
  card.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', async () => {
    await supabaseClient.from('jobs').update({ active: b.dataset.active !== 'true' }).eq('id', b.dataset.toggle); loadAdminJobs();
  }));
  card.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this job permanently?')) return;
    await supabaseClient.from('jobs').delete().eq('id', b.dataset.del); loadAdminJobs();
  }));
  wireSync();
}

function wireSync() {
  const btn = document.getElementById('syncJobsBtn'); if (!btn) return;
  btn.addEventListener('click', async () => {
    const msg = document.getElementById('syncMsg');
    btn.disabled = true; msg.textContent = 'Fetching...';
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const res = await fetch(SUPABASE_URL + '/functions/v1/sync-external-jobs', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, apikey: SUPABASE_ANON_KEY } });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Failed');
      msg.textContent = `Added ${out.inserted}, refreshed ${out.updated}.` + (out.errors?.length ? ` Problems: ${out.errors.join(' | ')}` : '');
      loadAdminJobs();
    } catch (e) { msg.textContent = 'Could not run the sync. Has the sync-external-jobs function been deployed? (' + e.message + ')'; }
    btn.disabled = false;
  });
}

// ---------- Successful placements ----------
let placementPhoto = null;
function renderPlacementsCard() {
  placementPhoto = null;
  const card = document.getElementById('adminPlacementsCard');
  card.innerHTML = `
    <h3><i class="fas fa-trophy"></i> Successful Placements</h3>
    <p style="color:var(--text-muted);margin-bottom:16px;">Add a person you placed. It appears on the site's "Successful Placements" cards. Only post photos of people who agreed to it.</p>
    <div class="form-group">
      <label>Photo</label>
      <div class="file-drop" id="plDrop"><i class="fas fa-camera"></i><span id="plLabel">Tap to choose a photo</span><input type="file" id="plFile" accept="image/*" hidden /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Name *</label><input type="text" id="plName" placeholder="e.g. Faith Achieng" /></div>
      <div class="form-group"><label>Job / Role *</label><input type="text" id="plRole" placeholder="e.g. Registered Nurse" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Country placed in *</label><input type="text" id="plCountry" placeholder="e.g. UAE or Kenya" /></div>
      <div class="form-group"><label>Employer (optional)</label><input type="text" id="plEmployer" placeholder="e.g. Al Razi Medical Center" /></div>
    </div>
    <div class="form-group"><label>Short quote (optional)</label><input type="text" id="plQuote" placeholder="e.g. TOPJOBSEEKERS made it easy." /></div>
    <button class="btn btn-primary btn-full" id="plSave"><i class="fas fa-plus"></i> Add Placement</button>
    <div class="field-error" id="plMsg" style="margin-top:12px;"></div>
    <div id="plList"></div>`;
  const drop = document.getElementById('plDrop'), f = document.getElementById('plFile');
  drop.addEventListener('click', () => f.click());
  f.addEventListener('change', () => { if (f.files[0]) { placementPhoto = f.files[0]; document.getElementById('plLabel').textContent = placementPhoto.name; } });

  document.getElementById('plSave').addEventListener('click', async () => {
    const msg = document.getElementById('plMsg'); msg.classList.remove('show');
    const v = (id) => document.getElementById(id).value.trim();
    const fail = (t) => { msg.textContent = t; msg.classList.add('show'); };
    if (!v('plName') || !v('plRole') || !v('plCountry')) return fail('Name, role and country are required.');
    const btn = document.getElementById('plSave'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    try {
      let photo_url = null;
      if (placementPhoto) {
        const path = `${Date.now()}-${placementPhoto.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        const { error: upErr } = await supabaseClient.storage.from('placement-photos').upload(path, placementPhoto);
        if (upErr) throw upErr;
        photo_url = supabaseClient.storage.from('placement-photos').getPublicUrl(path).data.publicUrl;
      }
      const country = v('plCountry');
      const { error } = await supabaseClient.from('placements').insert({
        name: v('plName'), role: v('plRole'), country, country_flag: ADMIN_FLAGS[country.toLowerCase()] || '🌍',
        employer: v('plEmployer') || null, quote: v('plQuote') || null, photo_url, active: true,
      });
      if (error) throw error;
      renderPlacementsCard();
    } catch (err) {
      console.error(err);
      fail((err.message || 'Could not save.') + ' (If this says the table does not exist, run supabase-setup.sql.)');
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Add Placement';
    }
  });
  loadPlacementList();
}
async function loadPlacementList() {
  const box = document.getElementById('plList'); if (!box) return;
  const { data } = await supabaseClient.from('placements').select('id,name,role,country,country_flag,photo_url').order('created_at', { ascending: false }).limit(30);
  if (!data || !data.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<h4 style="margin:24px 0 8px;color:var(--navy);">On the site now</h4><div class="mini-list">${data.map((p) => `
    <div class="mini-row">
      ${p.photo_url ? `<img src="${adminEsc(p.photo_url)}" alt="" />` : `<div class="mini-ph">🙂</div>`}
      <div class="mini-main"><strong>${adminEsc(p.name)}</strong><span class="sub">${adminEsc(p.role)} · ${adminEsc(p.country_flag || '')} ${adminEsc(p.country || '')}</span></div>
      <button class="small-btn danger" data-pdel="${p.id}">Remove</button>
    </div>`).join('')}</div>`;
  box.querySelectorAll('[data-pdel]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Remove this placement from the site?')) return;
    await supabaseClient.from('placements').delete().eq('id', b.dataset.pdel); loadPlacementList();
  }));
}

async function loadAdminWallet() {
  const card = document.getElementById('adminWalletCard');
  const { data, error } = await supabaseClient
    .from('profiles').select('id, full_name, email, wallet_balance').eq('role', 'job_seeker').order('full_name');

  if (error || !data || data.length === 0) {
    card.innerHTML = `<h3>Wallet Management</h3><div class="empty-state">No job seeker accounts yet.</div>`;
    return;
  }

  const options = data.map(p =>
    `<option value="${p.id}">${p.full_name || 'Unnamed'} — ${p.email || ''} (KSH ${Number(p.wallet_balance || 0).toLocaleString('en-KE')})</option>`
  ).join('');

  card.innerHTML = `
    <h3>Wallet Management</h3>
    <p style="color:var(--text-muted);margin-bottom:16px;">Add or subtract from a job seeker's savings balance. Every change is logged.</p>
    <div class="form-group">
      <label>Job Seeker</label>
      <select id="walletUserSelect">${options}</select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Amount (KSH)</label>
        <input type="number" id="walletAmountInput" min="0" step="1" placeholder="e.g. 5000" />
      </div>
      <div class="form-group">
        <label>Reason (optional)</label>
        <input type="text" id="walletReasonInput" placeholder="e.g. Placement fee deposit" />
      </div>
    </div>
    <div style="display:flex;gap:12px;">
      <button class="btn btn-primary" id="walletAddBtn" style="flex:1;"><i class="fas fa-plus"></i> Add Funds</button>
      <button class="btn btn-outline" id="walletSubtractBtn" style="flex:1;"><i class="fas fa-minus"></i> Deduct Funds</button>
    </div>
    <div class="field-error" id="walletMsg" style="margin-top:12px;"></div>
  `;

  async function applyWalletChange(sign) {
    const userSelect = document.getElementById('walletUserSelect');
    const amountInput = document.getElementById('walletAmountInput');
    const reasonInput = document.getElementById('walletReasonInput');
    const msg = document.getElementById('walletMsg');
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
      msg.textContent = 'Enter a valid amount greater than 0.';
      msg.classList.add('show');
      return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    const { error } = await supabaseClient.from('wallet_transactions').insert({
      user_id: userSelect.value,
      amount: amount * sign,
      reason: reasonInput.value.trim() || null,
      created_by: user.id,
    });

    if (error) {
      msg.textContent = error.message;
      msg.classList.add('show');
      return;
    }

    msg.classList.remove('show');
    amountInput.value = '';
    reasonInput.value = '';
    loadAdminWallet(); // refresh so the dropdown shows the new balance
  }

  document.getElementById('walletAddBtn').addEventListener('click', () => applyWalletChange(1));
  document.getElementById('walletSubtractBtn').addEventListener('click', () => applyWalletChange(-1));
}

async function loadAdminCvs() {
  const card = document.getElementById('adminCvCard');
  const { data, error } = await supabaseClient
    .from('cv_submissions').select('*').order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    card.innerHTML = `<h3>CV Submissions</h3><div class="empty-state">No submissions yet.</div>`;
    return;
  }

  const statuses = ['new', 'reviewed', 'shortlisted', 'placed', 'rejected'];
  const rows = data.map(s => `
    <tr>
      <td>${new Date(s.created_at).toLocaleDateString()}</td>
      <td>${s.full_name}<br/><small>${s.email} · ${s.phone}</small></td>
      <td>${s.job_category || '—'}</td>
      <td>${s.destination || '—'}</td>
      <td>
        <select class="status-select" data-id="${s.id}" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border);">
          ${statuses.map(st => `<option value="${st}" ${st === s.status ? 'selected' : ''}>${st}</option>`).join('')}
        </select>
      </td>
    </tr>`).join('');

  card.innerHTML = `
    <h3>CV Submissions (${data.length})</h3>
    <table class="dash-table">
      <thead><tr><th>Date</th><th>Candidate</th><th>Category</th><th>Destination</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  card.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      await supabaseClient.from('cv_submissions').update({ status: sel.value }).eq('id', sel.dataset.id);
    });
  });
}

async function loadAdminEmployers() {
  const card = document.getElementById('adminEmployerCard');
  const { data, error } = await supabaseClient
    .from('profiles').select('*').eq('role', 'employer').order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    card.innerHTML = `<h3>Employer Approvals</h3><div class="empty-state">No employer accounts yet.</div>`;
    return;
  }

  const rows = data.map(p => `
    <tr>
      <td>${p.company_name || '—'}</td>
      <td>${p.full_name || '—'}</td>
      <td>${p.approved ? statusPill('placed') : statusPill('new')}</td>
      <td>
        ${p.approved
          ? `<button class="btn btn-outline small-btn revoke-btn" data-id="${p.id}">Revoke</button>`
          : `<button class="btn btn-primary small-btn approve-btn" data-id="${p.id}">Approve</button>`}
      </td>
    </tr>`).join('');

  card.innerHTML = `
    <h3>Employer Approvals</h3>
    <table class="dash-table">
      <thead><tr><th>Company</th><th>Contact</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  card.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.from('profiles').update({ approved: true }).eq('id', btn.dataset.id);
      loadAdminEmployers();
    });
  });
  card.querySelectorAll('.revoke-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.from('profiles').update({ approved: false }).eq('id', btn.dataset.id);
      loadAdminEmployers();
    });
  });
}

async function loadAdminTestimonials() {
  const card = document.getElementById('adminTestiCard');
  const { data, error } = await supabaseClient
    .from('testimonials').select('*').order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    card.innerHTML = `<h3>Testimonials</h3><div class="empty-state">No testimonials yet.</div>`;
    return;
  }

  const rows = data.map(t => `
    <tr>
      <td>${t.name}<br/><small>${t.role_title}</small></td>
      <td style="max-width:280px;">${t.quote.slice(0, 80)}${t.quote.length > 80 ? '…' : ''}</td>
      <td>${t.approved ? statusPill('placed') : statusPill('new')}</td>
      <td>
        ${t.approved
          ? `<button class="btn btn-outline small-btn testi-hide-btn" data-id="${t.id}">Hide</button>`
          : `<button class="btn btn-primary small-btn testi-approve-btn" data-id="${t.id}">Approve</button>`}
      </td>
    </tr>`).join('');

  card.innerHTML = `
    <h3>Testimonials (${data.length})</h3>
    <table class="dash-table">
      <thead><tr><th>Person</th><th>Quote</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  card.querySelectorAll('.testi-approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.from('testimonials').update({ approved: true }).eq('id', btn.dataset.id);
      loadAdminTestimonials();
    });
  });
  card.querySelectorAll('.testi-hide-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.from('testimonials').update({ approved: false }).eq('id', btn.dataset.id);
      loadAdminTestimonials();
    });
  });
}

init();
