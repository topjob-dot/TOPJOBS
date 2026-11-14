/* extras.js: dark/light toggle, loader, Instagram, notification bell, profile + payments + payouts cards.
   Load in <head> (no defer) so the saved theme applies before the page paints. */
'use strict';
(function () {
  const KEY = 'tjs_theme';
  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const theme = read() || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);

  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sb = () => (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  const IG = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.instagramUrl) || 'https://www.instagram.com/topjobsseekers';

  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch (e) { /* private mode */ }
    document.querySelectorAll('.xt-theme i').forEach((i) => { i.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon'; });
  }
  function themeBtn(extra) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'xt-btn xt-theme ' + (extra || ''); b.setAttribute('aria-label', 'Toggle dark mode');
    b.innerHTML = `<i class="${document.documentElement.dataset.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'}"></i>`;
    b.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    return b;
  }
  const igLink = (cls) => { const a = document.createElement('a'); a.href = IG; a.target = '_blank'; a.rel = 'noopener'; a.className = cls || 'xt-btn'; a.setAttribute('aria-label', 'Instagram'); a.innerHTML = '<i class="fab fa-instagram"></i>'; return a; };

  /* ---------------- loader ---------------- */
  const hideLoader = () => $('#pageLoader')?.classList.add('done');
  window.addEventListener('load', () => setTimeout(hideLoader, 250));
  setTimeout(hideLoader, 6000);

  /* ---------------- notification bell ---------------- */
  async function buildBell(user) {
    const wrap = document.createElement('span'); wrap.className = 'xt-tools';
    wrap.innerHTML = `<button type="button" class="xt-btn" id="xtBell" aria-label="Notifications"><i class="fas fa-bell"></i><span class="xt-badge" hidden>0</span></button><div class="xt-panel" id="xtPanel"></div>`;
    const btn = $('#xtBell', wrap), badge = $('.xt-badge', wrap), panel = $('#xtPanel', wrap);
    const client = sb();
    const [{ data: notes }, { data: prof }, { data: apps }] = await Promise.all([
      client.from('notifications').select('*').order('created_at', { ascending: false }).limit(20),
      client.from('profiles').select('residence,current_work,preferred_location,role').eq('id', user.id).maybeSingle(),
      client.from('applications').select('job_id,job_title').eq('user_id', user.id)]);
    const items = (notes || []).map((n) => ({ icon: { application: 'fa-paper-plane', job_match: 'fa-briefcase', payment: 'fa-wallet' }[n.type] || 'fa-bell', t: n.title, s: n.body, href: n.link, unread: !n.read, id: n.id }));
    if (prof && prof.role === 'job_seeker') {
      const missing = [!prof.residence && 'where you live', !prof.current_work && 'your current work', !prof.preferred_location && 'where you want to work'].filter(Boolean);
      if (missing.length) items.unshift({ icon: 'fa-user-edit', t: 'Complete your profile', s: 'Add ' + missing.join(', ') + ' to get matching job alerts.', href: 'dashboard.html#profile', unread: true });
      if (!(apps || []).length) items.unshift({ icon: 'fa-file-upload', t: 'Add your CV', s: 'Send your CV so employers can find you.', href: 'dashboard.html', unread: true });
      const ids = (apps || []).map((a) => a.job_id).filter(Boolean);
      if (ids.length) {
        const today = new Date().toISOString().slice(0, 10), soon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
        const { data: jobs } = await client.from('jobs').select('title,deadline').in('id', ids).gte('deadline', today).lte('deadline', soon);
        (jobs || []).forEach((j) => items.unshift({ icon: 'fa-hourglass-half', t: 'Deadline soon', s: `${j.title}: closes ${j.deadline}`, href: 'index.html#jobsList', unread: true }));
      }
    }
    const unread = items.filter((i) => i.unread).length;
    badge.textContent = unread; badge.hidden = !unread;
    panel.innerHTML = '<h4>Notifications</h4>' + (items.length ? items.map((i) => `<a class="xt-item ${i.unread ? 'unread' : ''}" href="${esc(i.href || '#')}"><b><i class="fas ${i.icon}"></i>${esc(i.t)}</b><span>${esc(i.s || '')}</span></a>`).join('') : '<div class="xt-empty">You are all caught up.</div>');
    btn.addEventListener('click', async (e) => {
      e.stopPropagation(); panel.classList.toggle('open');
      if (panel.classList.contains('open') && (notes || []).some((n) => !n.read)) {
        await client.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
        badge.hidden = true; panel.querySelectorAll('.unread').forEach((x) => x.classList.remove('unread'));
      }
    });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) panel.classList.remove('open'); });
    return wrap;
  }

  /* ---------------- mount tools on each page ---------------- */
  async function mount() {
    const client = sb();
    const { data: { session } } = client ? await client.auth.getSession() : { data: {} };
    const user = session?.user;
    const bell = user ? await buildBell(user).catch((e) => { console.warn('bell', e); return null; }) : null;

    // public site: desktop nav + mobile drawer + footer
    const nav = $('.nav-links');
    if (nav) {
      const li = document.createElement('li'); li.className = 'xt-li'; const box = document.createElement('span'); box.className = 'xt-tools';
      box.append(igLink('xt-btn'), themeBtn()); if (bell) box.append(bell); li.append(box); nav.insertBefore(li, nav.querySelector('.nav-sep'));
    }
    const drawer = $('.drawer-cta');
    if (drawer) { const row = document.createElement('div'); row.className = 'xt-tools'; row.style.cssText = 'justify-content:center;margin-top:12px'; row.append(igLink('xt-btn'), themeBtn()); drawer.append(row); }
    const social = $('.footer .social-links') || $('.footer-bottom');
    if (social && !$('[aria-label="Instagram"]', $('.footer'))) social.append(igLink(social.classList.contains('social-links') ? '' : 'xt-btn'));
    document.querySelectorAll('.social-links a[aria-label="Instagram"]').forEach((a) => { a.href = IG; a.target = '_blank'; a.rel = 'noopener'; });

    // portal header
    const dh = $('.dash-header .container > div:last-child');
    if (dh) { const box = document.createElement('span'); box.className = 'xt-tools'; box.style.marginRight = '10px'; box.append(themeBtn('xt-dark')); if (bell) box.append(bell); dh.prepend(box); }
    // login page
    if ($('.auth-wrap')) { const f = document.createElement('div'); f.className = 'xt-auth-theme'; f.append(themeBtn('xt-dark')); document.body.append(f); }

    if (dh && user) watchDashboard(user);
  }

  /* ---------------- dashboard cards ---------------- */
  const money = (n) => 'KES ' + Number(n).toLocaleString('en-KE');
  const pill = (s) => `<span class="pay-pill pay-${esc(s)}">${esc(s)}</span>`;

  function watchDashboard(user) {
    const body = $('#dashBody'); if (!body) return;
    let busy = false;
    const run = async () => {
      if (busy) return; busy = true;
      const role = ($('#rolePill')?.textContent || '').trim();
      if (role === 'job seeker' && $('#dashCvForm') && !$('#xtPayCard')) { await addProfileCard(user, body); await addPayCard(user, body); await addWithdrawCard(user, body); }
      if (role === 'admin' && $('.dash-card') && !$('#xtPayoutCard')) await addPayoutCard(body);
      busy = false;
    };
    new MutationObserver(run).observe(body, { childList: true }); run();
  }

  async function addProfileCard(user, body) {
    const { data: p } = await sb().from('profiles').select('residence,current_work,preferred_location,job_alerts').eq('id', user.id).maybeSingle();
    const card = document.createElement('div'); card.className = 'dash-card'; card.id = 'xtProfileCard';
    card.innerHTML = `<h3 id="profile"><i class="fas fa-user-edit"></i> Job preferences</h3><p style="color:var(--text-muted);margin-bottom:16px">We use this to match new jobs to you.</p>
      <form id="xtProfileForm"><div class="xt-row">
        <div class="form-group"><label>Where do you live now?</label><input id="xtRes" value="${esc(p?.residence)}" placeholder="e.g. Nairobi, Kenya"></div>
        <div class="form-group"><label>What work do you do now?</label><input id="xtWork" value="${esc(p?.current_work)}" placeholder="e.g. Nurse, Driver, Accountant"></div>
        <div class="form-group"><label>Where do you want to work?</label><input id="xtLoc" value="${esc(p?.preferred_location)}" placeholder="e.g. Qatar, Dubai, Mombasa"></div></div>
        <label style="display:flex;gap:8px;align-items:center;font-size:13px;margin:6px 0 14px"><input type="checkbox" id="xtAlerts" ${p?.job_alerts === false ? '' : 'checked'}> Send me job alerts here and by email</label>
        <button class="btn btn-primary" type="submit">Save preferences</button><div class="xt-msg" id="xtProfMsg"></div></form>`;
    body.querySelector('.stats-row')?.after(card);
    $('#xtProfileForm').addEventListener('submit', async (e) => {
      e.preventDefault(); const m = $('#xtProfMsg');
      const { error } = await sb().rpc('update_my_profile', { p_residence: $('#xtRes').value, p_current_work: $('#xtWork').value, p_preferred_location: $('#xtLoc').value, p_job_alerts: $('#xtAlerts').checked });
      m.className = 'xt-msg ' + (error ? 'err' : 'ok'); m.textContent = error ? 'Could not save: ' + error.message : 'Saved. You will now get matching job alerts.';
    });
  }

  async function addPayCard(user, body) {
    const card = document.createElement('div'); card.className = 'dash-card'; card.id = 'xtPayCard';
    card.innerHTML = `<h3><i class="fas fa-credit-card"></i> Make a payment</h3><p style="color:var(--text-muted);margin-bottom:16px">Pay by M-Pesa, card or bank in one secure checkout.</p>
      <form id="xtPayForm"><div class="xt-row">
        <div class="form-group"><label>Amount (KES)</label><input id="xtAmt" type="number" min="10" step="1" required></div>
        <div class="form-group"><label>M-Pesa number (Safaricom)</label><input id="xtPhone" type="tel" placeholder="07XX XXX XXX" required></div>
        <div class="form-group"><label>Payment for</label><input id="xtFor" value="Service fee" maxlength="120"></div></div>
        <button class="btn btn-primary" type="submit" id="xtPayBtn"><i class="fas fa-lock"></i> Pay securely</button><div class="xt-msg" id="xtPayMsg"></div></form>
      <h3 style="margin-top:26px">Payment history</h3><div style="overflow:auto"><table class="dash-table"><thead><tr><th>Date</th><th>For</th><th>Amount</th><th>Status</th></tr></thead><tbody id="xtPayRows"></tbody></table></div>`;
    body.append(card);
    const loadRows = async () => {
      const { data } = await sb().from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(15);
      $('#xtPayRows').innerHTML = (data || []).length ? data.map((r) => `<tr><td>${new Date(r.created_at).toLocaleDateString()}</td><td>${esc(r.purpose)}</td><td>${money(r.amount)}</td><td>${pill(r.status)}</td></tr>`).join('') : '<tr><td colspan="4" class="empty-state">No payments yet.</td></tr>';
      return data || [];
    };
    await loadRows();
    // returning from checkout: the webhook confirms the payment, so we only wait and show what it says
    const ref = new URLSearchParams(location.search).get('paid');
    if (ref) {
      const m = $('#xtPayMsg'); m.className = 'xt-msg'; m.textContent = 'Confirming your payment…';
      let tries = 0; const t = setInterval(async () => {
        const rows = await loadRows(); const r = rows.find((x) => x.api_ref === ref); tries++;
        if (r && (r.status === 'complete' || r.status === 'failed')) { clearInterval(t); m.className = 'xt-msg ' + (r.status === 'complete' ? 'ok' : 'err'); m.textContent = r.status === 'complete' ? 'Payment received. Thank you!' : 'Payment failed. You were not charged.'; }
        else if (tries > 20) { clearInterval(t); m.textContent = 'Still processing. It will update here once confirmed.'; }
      }, 3000);
    }
    $('#xtPayForm').addEventListener('submit', async (e) => {
      e.preventDefault(); const b = $('#xtPayBtn'), m = $('#xtPayMsg'); m.textContent = '';
      b.disabled = true; b.innerHTML = '<span class="btn-spin"></span> Starting checkout…';
      const { data, error } = await sb().functions.invoke('create-payment', { body: { amount: $('#xtAmt').value, phone: $('#xtPhone').value, purpose: $('#xtFor').value } });
      if (error || !data?.url) { m.className = 'xt-msg err'; m.textContent = data?.error || 'Could not start the payment. Please try again.'; b.disabled = false; b.innerHTML = '<i class="fas fa-lock"></i> Pay securely'; return; }
      if (data.url) { location.href = data.url; return; }
      m.className = 'xt-msg'; m.textContent = 'Check your phone and enter your M-Pesa PIN…';
      let tries = 0; const t = setInterval(async () => {
        const rows = await loadRows(); const r = rows.find((x) => x.api_ref === data.api_ref); tries++;
        if (r && (r.status === 'complete' || r.status === 'failed')) { clearInterval(t); b.disabled = false; b.innerHTML = '<i class="fas fa-lock"></i> Pay securely'; m.className = 'xt-msg ' + (r.status === 'complete' ? 'ok' : 'err'); m.textContent = r.status === 'complete' ? 'Payment received. Thank you!' : 'Payment was not completed. You were not charged.'; }
        else if (tries > 30) { clearInterval(t); b.disabled = false; b.innerHTML = '<i class="fas fa-lock"></i> Pay securely'; m.textContent = 'Still waiting. It will update in your history once confirmed.'; }
      }, 3000);
    });
  }


  async function addWithdrawCard(user, body) {
    const w = body.querySelector('.wallet-card'); if (!w || $('#xtWdCard')) return;
    const MIN = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.minWithdrawal) || 100;
    const getProfile = async () => (await sb().from('profiles').select('wallet_balance,phone').eq('id', user.id).maybeSingle()).data || {};
    const prof = await getProfile();
    const card = document.createElement('div'); card.className = 'dash-card xt-wd'; card.id = 'xtWdCard';
    card.innerHTML = `<div class="xt-wd-head"><span class="xt-wd-icon"><i class="fas fa-mobile-screen-button"></i></span>
        <div><h3 style="margin:0">Withdraw to M-Pesa</h3><p style="color:var(--text-muted);font-size:13px;margin:2px 0 0">Available: <b id="xtWdAvail">${money(prof.wallet_balance || 0)}</b></p></div></div>
      <form id="xtWdForm" novalidate>
        <div class="xt-row">
          <div class="form-group"><label>Amount (KES)</label><input id="xtWdAmt" type="number" inputmode="numeric" min="${MIN}" step="1" placeholder="Min ${MIN}" required>
            <button type="button" class="xt-link" id="xtWdAll">Withdraw everything</button></div>
          <div class="form-group"><label>M-Pesa number</label><input id="xtWdPhone" type="tel" inputmode="tel" placeholder="07XX XXX XXX" value="${esc(prof.phone || '')}" required></div>
        </div>
        <p class="xt-wd-note"><i class="fas fa-shield-alt"></i> The amount is held as soon as you request it. We review and send it to your M-Pesa; if declined it returns to your balance.</p>
        <button class="btn btn-primary btn-full" type="submit" id="xtWdBtn"><i class="fas fa-paper-plane"></i> Request withdrawal</button><div class="xt-msg" id="xtWdMsg"></div></form>
      <h4 style="margin:22px 0 6px;font-size:14px">Recent withdrawals</h4>
      <div style="overflow:auto"><table class="dash-table"><thead><tr><th>Date</th><th>Amount</th><th>M-Pesa</th><th>Status</th></tr></thead><tbody id="xtWdRows"></tbody></table></div>`;
    w.after(card);

    const refresh = async () => {
      const [{ data }, p] = await Promise.all([sb().from('withdrawals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10), getProfile()]);
      $('#xtWdRows').innerHTML = (data || []).map((r) => `<tr><td>${new Date(r.created_at).toLocaleDateString()}</td><td>${money(r.amount)}</td><td>${esc(r.phone)}</td><td>${pill(r.status)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">No withdrawals yet.</td></tr>';
      const bal = Number(p.wallet_balance || 0);
      $('#xtWdAvail').textContent = money(bal);
      const big = document.getElementById('walletAmountNum'); if (big) big.textContent = bal.toLocaleString('en-KE');   // keep the Savings Balance card in step
      return bal;
    };
    await refresh();
    $('#xtWdAll').addEventListener('click', async () => { $('#xtWdAmt').value = Math.floor(await refresh()) || ''; });

    $('#xtWdForm').addEventListener('submit', async (e) => {
      e.preventDefault(); const m = $('#xtWdMsg'), b = $('#xtWdBtn');
      const amt = Number($('#xtWdAmt').value), phone = $('#xtWdPhone').value.trim();
      const fail = (t) => { m.className = 'xt-msg err'; m.textContent = t; };
      if (!Number.isInteger(amt) || amt < MIN) return fail('Enter a whole amount of at least ' + money(MIN) + '.');
      if (!/^(\+?254|0)[17]\d{8}$/.test(phone.replace(/[\s\-()]/g, ''))) return fail('Enter a valid Safaricom number, e.g. 0712 345 678.');
      b.disabled = true; b.innerHTML = '<span class="btn-spin"></span>Sending request...'; m.textContent = '';
      const { error } = await sb().rpc('request_withdrawal', { p_amount: amt, p_phone: phone });
      b.disabled = false; b.innerHTML = '<i class="fas fa-paper-plane"></i> Request withdrawal';
      if (error) return fail(error.message);
      m.className = 'xt-msg ok'; m.textContent = 'Request sent. We will review it shortly and send it to your M-Pesa.';
      $('#xtWdAmt').value = ''; refresh();
    });
  }

  async function addPayoutCard(body) {
    const card = document.createElement('div'); card.className = 'dash-card'; card.id = 'xtPayoutCard';
    card.innerHTML = `<h3><i class="fas fa-money-check-alt"></i> Payments &amp; payouts</h3>
      <h4 style="margin:6px 0">Recent client payments</h4><div style="overflow:auto"><table class="dash-table"><tbody id="xtAdminPays"></tbody></table></div>
      <h4 style="margin:22px 0 6px">Withdrawal requests</h4><div style="overflow:auto"><table class="dash-table"><tbody id="xtWdAdmin"></tbody></table></div>
      <h4 style="margin:22px 0 6px">Log a payout</h4>
      <form id="xtPayoutForm"><div class="xt-row"><div class="form-group"><label>Recipient</label><input id="xtPoWho" required></div><div class="form-group"><label>Phone</label><input id="xtPoPhone"></div>
        <div class="form-group"><label>Amount (KES)</label><input id="xtPoAmt" type="number" min="1" required></div><div class="form-group"><label>Reason</label><input id="xtPoWhy"></div></div>
        <button class="btn btn-primary" type="submit">Log payout</button><div class="xt-msg" id="xtPoMsg"></div></form>
      <div style="overflow:auto;margin-top:14px"><table class="dash-table"><tbody id="xtPayouts"></tbody></table></div>`;
    body.append(card);
    const load = async () => {
      const [{ data: pays }, { data: outs }] = await Promise.all([sb().from('payments').select('*').order('created_at', { ascending: false }).limit(10), sb().from('payouts').select('*').order('created_at', { ascending: false }).limit(15)]);
      const { data: wds } = await sb().from('withdrawals').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(15);
      $('#xtWdAdmin').innerHTML = (wds || []).map((r) => `<tr><td>${esc(r.profiles?.full_name || '')}</td><td>${money(r.amount)}</td><td>${esc(r.phone)}</td><td>${pill(r.status)}</td><td>${r.status === 'pending' ? `<button class="btn btn-primary small-btn" data-wd="approved" data-id="${r.id}">Approve</button> <button class="btn btn-outline small-btn" data-wd="rejected" data-id="${r.id}">Reject</button>` : r.status === 'approved' ? `<button class="btn btn-outline small-btn" data-wd="paid" data-id="${r.id}">Mark paid</button>` : ''}</td></tr>`).join('') || '<tr><td class="empty-state">No requests.</td></tr>';
      $('#xtAdminPays').innerHTML = (pays || []).map((r) => `<tr><td>${new Date(r.created_at).toLocaleDateString()}</td><td>${esc(r.phone)}</td><td>${esc(r.purpose)}</td><td>${money(r.amount)}</td><td>${pill(r.status)}</td></tr>`).join('') || '<tr><td class="empty-state">No payments yet.</td></tr>';
      $('#xtPayouts').innerHTML = (outs || []).map((r) => `<tr><td>${esc(r.recipient)}</td><td>${money(r.amount)}</td><td>${esc(r.reason)}</td><td>${pill(r.status)}</td><td>${r.status === 'pending' ? `<button class="btn btn-primary small-btn" data-po="approved" data-id="${r.id}">Approve</button> <button class="btn btn-outline small-btn" data-po="rejected" data-id="${r.id}">Reject</button>` : r.status === 'approved' ? `<button class="btn btn-outline small-btn" data-po="paid" data-id="${r.id}">Mark paid</button>` : ''}</td></tr>`).join('') || '<tr><td class="empty-state">No payouts logged.</td></tr>';
    };
    await load();
    $('#xtWdAdmin').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-wd]'); if (!b) return; b.disabled = true;
      const { error } = await sb().rpc('decide_withdrawal', { p_id: b.dataset.id, p_status: b.dataset.wd });
      if (error) alert(error.message); load();
    });
    $('#xtPayouts').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-po]'); if (!b) return;
      const { data: { user } } = await sb().auth.getUser();
      await sb().from('payouts').update({ status: b.dataset.po, approved_by: b.dataset.po === 'approved' ? user.id : undefined, approved_at: b.dataset.po === 'approved' ? new Date().toISOString() : undefined }).eq('id', b.dataset.id); load();
    });
    $('#xtPayoutForm').addEventListener('submit', async (e) => {
      e.preventDefault(); const m = $('#xtPoMsg');
      const { error } = await sb().from('payouts').insert({ recipient: $('#xtPoWho').value, phone: $('#xtPoPhone').value || null, amount: $('#xtPoAmt').value, reason: $('#xtPoWhy').value || null });
      m.className = 'xt-msg ' + (error ? 'err' : 'ok'); m.textContent = error ? error.message : 'Logged. Waiting for your approval.'; if (!error) { e.target.reset(); load(); }
    });
  }

  document.addEventListener('DOMContentLoaded', () => mount().catch((e) => console.warn('extras', e)));
})();
