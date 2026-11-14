'use strict';

// ---- tab switching ----
const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authMsg = document.getElementById('authMsg');

function showMsg(text, type) {
  authMsg.textContent = text;
  authMsg.className = `auth-msg ${type}`;
}
function clearMsg() {
  authMsg.className = 'auth-msg';
  authMsg.textContent = '';
}


// ---- button states: spinner -> green tick / red cross ----
function btnLoading(btn, text) { btn.disabled = true; btn.classList.remove('is-ok', 'is-err'); btn.innerHTML = '<span class="btn-spin"></span>' + text; }
function btnOk(btn, text, reset) { btn.classList.add('is-ok'); btn.innerHTML = '<i class="fas fa-check-circle"></i> ' + text; setTimeout(() => btnReset(btn, reset), 3500); }
function btnErr(btn, text, reset) { btn.classList.add('is-err'); btn.innerHTML = '<i class="fas fa-times-circle"></i> ' + text; setTimeout(() => btnReset(btn, reset), 3000); }
function btnReset(btn, text) { btn.disabled = false; btn.classList.remove('is-ok', 'is-err'); btn.textContent = text; }

// ---- validation helpers ----
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

// ---- show/hide password toggle (eye icon) ----
document.querySelectorAll('.pw-toggle').forEach(icon => {
  icon.addEventListener('click', () => {
    const input = document.getElementById(icon.dataset.target);
    if (!input) return;
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    icon.classList.toggle('fa-eye', showing);
    icon.classList.toggle('fa-eye-slash', !showing);
  });
});
function isValidPhone(value) {
  const cleaned = value.replace(/[\s\-()]/g, '');
  return /^\+?\d{7,15}$/.test(cleaned);
}
function checkPasswordRules(pw) {
  return {
    len: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    num: /[0-9]/.test(pw),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=~`[\];'/\\]/.test(pw),
  };
}
function passwordIsStrong(pw) {
  const r = checkPasswordRules(pw);
  return r.len && r.upper && r.lower && r.num && r.special;
}

function wireEmailValidation(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (!input) return;
  input.addEventListener('blur', () => {
    if (!input.value) return;
    const valid = isValidEmail(input.value);
    input.classList.toggle('field-invalid', !valid);
    input.classList.toggle('field-valid', valid);
    error.classList.toggle('show', !valid);
  });
  input.addEventListener('input', () => {
    if (input.classList.contains('field-invalid') && isValidEmail(input.value)) {
      input.classList.remove('field-invalid'); input.classList.add('field-valid');
      error.classList.remove('show');
    }
  });
}
wireEmailValidation('loginEmail', 'loginEmailError');
wireEmailValidation('signupEmail', 'signupEmailError');

// ---- phone: live validation on signup ----
const signupPhoneInput = document.getElementById('signupPhone');
const signupPhoneError = document.getElementById('signupPhoneError');
signupPhoneInput.addEventListener('blur', () => {
  if (!signupPhoneInput.value) return; // phone is optional
  const valid = isValidPhone(signupPhoneInput.value);
  signupPhoneInput.classList.toggle('field-invalid', !valid);
  signupPhoneInput.classList.toggle('field-valid', valid);
  signupPhoneError.classList.toggle('show', !valid);
});
signupPhoneInput.addEventListener('input', () => {
  if (signupPhoneInput.classList.contains('field-invalid') && isValidPhone(signupPhoneInput.value)) {
    signupPhoneInput.classList.remove('field-invalid'); signupPhoneInput.classList.add('field-valid');
    signupPhoneError.classList.remove('show');
  }
});

// ---- password: live checklist as the person types ----
const signupPasswordInput = document.getElementById('signupPassword');
const pwChecklist = document.getElementById('pwChecklist');
const pwItems = { len: 'pwLen', upper: 'pwUpper', lower: 'pwLower', num: 'pwNum', special: 'pwSpecial' };

signupPasswordInput.addEventListener('focus', () => pwChecklist.classList.add('show'));
signupPasswordInput.addEventListener('input', () => {
  const rules = checkPasswordRules(signupPasswordInput.value);
  Object.keys(pwItems).forEach(key => {
    document.getElementById(pwItems[key]).classList.toggle('met', rules[key]);
  });
  const strong = passwordIsStrong(signupPasswordInput.value);
  signupPasswordInput.classList.toggle('field-valid', strong && signupPasswordInput.value.length > 0);
  signupPasswordInput.classList.toggle('field-invalid', false); // don't red-flag mid-typing, just show checklist
});

const authTitle = document.getElementById('authTitle');
const authSub = document.getElementById('authSub');
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active'); tabSignup.classList.remove('active');
  loginForm.classList.add('active'); signupForm.classList.remove('active');
  authTitle.textContent = 'Welcome back';
  authSub.textContent = 'Log in to your portal. Job seekers, employers & staff.';
  clearMsg();
});
tabSignup.addEventListener('click', () => {
  tabSignup.classList.add('active'); tabLogin.classList.remove('active');
  signupForm.classList.add('active'); loginForm.classList.remove('active');
  authTitle.textContent = 'Create your account';
  authSub.textContent = 'Takes about a minute. Free for job seekers.';
  clearMsg();
});

// ---- role selector on signup ----
let selectedRole = 'job_seeker';
document.querySelectorAll('.role-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.role-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedRole = opt.dataset.role;
    document.getElementById('companyGroup').style.display = selectedRole === 'employer' ? 'block' : 'none';
    document.getElementById('jobSeekerOnlyGroup').style.display = selectedRole === 'employer' ? 'none' : 'block';
  });
});

// ---- redirect if already logged in ----
(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) window.location.href = 'dashboard.html';
})();

// ---- login ----
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsg();
  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'Logging in...';

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!isValidEmail(email)) {
    showMsg('Please enter a valid email address.', 'error');
    btn.disabled = false; btn.textContent = 'Log In';
    return;
  }

  let error = null;
  try { ({ error } = await supabaseClient.auth.signInWithPassword({ email, password })); }
  catch (e) { console.error(e); error = { message: 'Could not reach the login service. Please refresh the page and try again.' }; }

  if (error) {
    showMsg(error.message, 'error');
    btn.disabled = false; btn.textContent = 'Log In';
    return;
  }
  window.location.href = 'dashboard.html';
});

// ---- signup ----
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsg();
  const btn = document.getElementById('signupBtn');
  btnLoading(btn, 'Creating account...');

  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const full_name = document.getElementById('signupName').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const company_name = document.getElementById('signupCompany').value.trim();
  const country = document.getElementById('signupCountry').value;
  const education_level = document.getElementById('signupEducation').value;
  const privacy_accepted = document.getElementById('signupPrivacy').checked;

  if (!privacy_accepted) {
    showMsg('Please accept the Privacy Policy to continue.', 'error');
    btnErr(btn, 'Could not sign up', 'Create Account');
    return;
  }

  if (!isValidEmail(email)) {
    showMsg('Please enter a valid email address.', 'error');
    btnErr(btn, 'Could not sign up', 'Create Account');
    return;
  }

  if (phone && !isValidPhone(phone)) {
    showMsg('Please enter a valid phone number.', 'error');
    btnErr(btn, 'Could not sign up', 'Create Account');
    return;
  }

  if (!passwordIsStrong(password)) {
    showMsg('Your password does not meet all the requirements shown below the password field.', 'error');
    pwChecklist.classList.add('show');
    btnErr(btn, 'Could not sign up', 'Create Account');
    return;
  }

  let error = null;
  try {
    ({ error } = await supabaseClient.auth.signUp({
      email, password,
      options: {
        data: { role: selectedRole, full_name, phone, company_name, country, education_level, privacy_accepted },
        emailRedirectTo: window.location.origin + '/login.html',
      },
    }));
  } catch (e) { console.error(e); error = { message: 'Could not reach the sign-up service. Please refresh the page and try again.' }; }

  if (error) {
    showMsg(error.message, 'error');
    btnErr(btn, 'Could not sign up', 'Create Account');
    return;
  }

  if (selectedRole === 'employer') {
    showMsg('Account created! An admin needs to approve employer access before you can view candidates — you can still log in and check status.', 'success');
  } else {
    showMsg('Account created! Check your email to confirm, then log in.', 'success');
  }
  btnOk(btn, 'Account created', 'Create Account');
});


// ---- social icons (configured in site-config.js > SITE_CONFIG.social) ----
(function renderSocial() {
  const list = (typeof SITE_CONFIG !== 'undefined' && Array.isArray(SITE_CONFIG.social)) ? SITE_CONFIG.social : [];
  const safeUrl = (u) => /^https?:\/\//i.test(u);
  document.querySelectorAll('[data-social]').forEach(row => {
    list.filter(s => s.url && safeUrl(s.url)).forEach(s => {
      const link = document.createElement('a');
      link.href = s.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', s.name); link.title = s.name;
      if (s.img) {
        const img = document.createElement('img');
        img.src = s.img; img.alt = s.name;
        img.addEventListener('error', () => { link.innerHTML = '<i class="' + s.icon + '"></i>'; }); // fall back to built-in icon
        link.appendChild(img);
      } else {
        link.innerHTML = '<i class="' + s.icon + '"></i>';
      }
      row.appendChild(link);
    });
    if (!row.children.length) { const box = row.closest('.brand-foot, .mobile-social'); if (box) box.style.display = 'none'; }
  });
})();

// ---- Google sign-in ----
async function googleSignIn(btn, fromSignup) {
  clearMsg();
  if (fromSignup) {
    if (selectedRole === 'employer') {
      showMsg('Employer accounts need a company name and admin approval, so please sign up with email below. Google sign-in is for job seekers.', 'error');
      return;
    }
    if (!document.getElementById('signupPrivacy').checked) {
      showMsg('Please tick the Privacy Policy box before continuing with Google.', 'error');
      return;
    }
  }
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Opening Google...';
  let error = null;
  try {
    ({ error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard.html' },
    }));
  } catch (e) { console.error(e); error = { message: 'Could not reach Google sign-in. Please refresh and try again.' }; }
  if (error) {
    showMsg(error.message, 'error');
    btn.disabled = false; btn.innerHTML = original;
  }
  // on success the browser is redirected to Google, then back to the dashboard
}
document.getElementById('googleBtnLogin').addEventListener('click', (e) => googleSignIn(e.currentTarget, false));
document.getElementById('googleBtnSignup').addEventListener('click', (e) => googleSignIn(e.currentTarget, true));

// ---- show errors Google/Supabase send back in the URL (e.g. user cancelled) ----
(function showOAuthError() {
  const params = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''));
  const desc = params.get('error_description');
  if (desc) showMsg(desc.replace(/\+/g, ' '), 'error');
})();
