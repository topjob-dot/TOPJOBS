/* ====================================================
   TOPJOBSEEKERS – Main JavaScript (Supabase-wired)
   ==================================================== */

'use strict';

// JOBS now lives in jobs.js

const COUNTRY_LIST = [
  { flag: '🇦🇪', name: 'UAE' }, { flag: '🇶🇦', name: 'Qatar' },
  { flag: '🇸🇦', name: 'Saudi Arabia' }, { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇩🇪', name: 'Germany' }, { flag: '🇨🇦', name: 'Canada' },
  { flag: '🇸🇬', name: 'Singapore' }, { flag: '🇦🇺', name: 'Australia' },
  { flag: '🇰🇼', name: 'Kuwait' }, { flag: '🇧🇭', name: 'Bahrain' },
  { flag: '🇳🇱', name: 'Netherlands' }, { flag: '🇯🇵', name: 'Japan' },
];

// ===== MARQUEE (flag glued to country name, duplicated for seamless loop) =====
function renderMarquee() {
  const track = document.getElementById('marqueeTrack');
  if (!track) return;
  const items = COUNTRY_LIST.map(c => `<span>${c.flag} ${c.name}</span>`).join('');
  track.innerHTML = items + items; // duplicate once for the infinite scroll illusion
}

// ===== PEXELS PHOTO HELPER (stock photos for hero + job cards) =====
// Pexels photos are free for commercial use with no attribution required —
// this pulls a real, diverse photo for each profession every time the page
// loads, so you never have to manually source or license images yourself.
async function fetchPexelsPhoto(query, orientation = 'square', perPage = 1) {
  if (!PEXELS_API_KEY || PEXELS_API_KEY.includes('YOUR-PEXELS')) return perPage === 1 ? null : [];
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!res.ok) return perPage === 1 ? null : [];
    const data = await res.json();
    if (perPage === 1) return data.photos && data.photos[0] ? data.photos[0] : null;
    return data.photos || [];
  } catch (err) {
    console.error('Pexels fetch failed:', err);
    return perPage === 1 ? null : [];
  }
}

// ===== BIG STATIC HERO PHOTO =====
async function loadHeroPhoto() {
  const img = document.getElementById('heroPhoto');
  if (!img) return;
  const photo = await fetchPexelsPhoto('confident black professional smiling office portrait', 'portrait');
  if (photo) {
    img.src = photo.src.large2x || photo.src.large;
    img.alt = 'Kenyan professional placed abroad';
    document.getElementById('heroPhotoWrap')?.classList.add('loaded');
  }
}

// ===== JOB CARD PHOTOS (real photos matched to job TITLE, via Pexels) =====
// Feeds sometimes tag loosely-related job titles with a category that
// doesn't really fit them (e.g. a "Sales Consultant" listing returned inside
// a logistics search). To avoid mismatched photos, we scan the ACTUAL job
// title for keywords first, and only fall back to the stored category if no
// keyword matches. A small POOL of photos (not just one) is fetched per
// matched query, and each job picks one from that pool via a stable hash of
// its id, so the same job always shows the same photo.
const photoPoolCache = {};
const POOL_SIZE = 6;

const TITLE_KEYWORD_QUERIES = [
  { keywords: ['nurse', 'nursing', 'midwife', 'caregiver medical'], query: 'black nurse hospital patient care' },
  { keywords: ['civil engineer', 'construction', 'welder', 'site engineer', 'electrician', 'plumber', 'mason', 'fitter'], query: 'black construction engineer hard hat site' },
  { keywords: ['chef', 'cook', 'kitchen', 'culinary', 'baker'], query: 'black chef restaurant kitchen cooking' },
  { keywords: ['developer', 'programmer', 'software', 'wordpress', 'notion', 'web design', 'frontend', 'backend', 'full stack', 'it support', 'system admin'], query: 'black programmer computer screen office' },
  { keywords: ['teacher', 'tutor', 'instructor', 'lecturer', 'professor'], query: 'black teacher classroom students' },
  { keywords: ['logistics', 'warehouse', 'forklift', 'supply chain', 'freight'], query: 'black warehouse worker forklift logistics' },
  { keywords: ['driver', 'delivery', 'courier', 'chauffeur'], query: 'black delivery driver van smiling' },
  { keywords: ['sales', 'account executive', 'business development', 'retail assistant'], query: 'black salesperson office client meeting' },
  { keywords: ['accountant', 'finance', 'tax', 'treasury', 'investment', 'audit', 'bookkeeper'], query: 'black accountant finance analyst calculator desk' },
  { keywords: ['nanny', 'housekeeper', 'domestic worker', 'house manager'], query: 'black housekeeper nanny caregiver smiling' },
  { keywords: ['receptionist', 'administrator', 'office assistant', 'secretary', 'admin'], query: 'black office administrator typing desk' },
  { keywords: ['security guard', 'security officer'], query: 'black security guard professional uniform' },
  { keywords: ['hotel', 'housekeeping', 'hospitality'], query: 'black hotel staff hospitality smiling' },
];

const CATEGORY_QUERIES = {
  'Healthcare': 'black nurse hospital patient care',
  'Construction': 'black construction engineer hard hat site',
  'Engineering': 'black engineer blueprint site work',
  'Hospitality': 'black hotel staff hospitality smiling',
  'IT': 'black programmer computer screen office',
  'Technology': 'black programmer computer screen office',
  'Education': 'black teacher classroom students',
  'Logistics': 'black warehouse worker forklift logistics',
  'Finance': 'black accountant finance analyst calculator desk',
  'Domestic': 'black housekeeper nanny caregiver smiling',
  'Sales': 'black salesperson office client meeting',
  'Admin': 'black office administrator typing desk',
};
const DEFAULT_QUERY = 'black professional working office smiling';

function queryForJob(job) {
  const title = (job.title || '').toLowerCase();
  const bucket = TITLE_KEYWORD_QUERIES.find(b => b.keywords.some(k => title.includes(k)));
  if (bucket) return bucket.query;
  return CATEGORY_QUERIES[job.category] || DEFAULT_QUERY;
}

function hashToIndex(str, mod) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash % mod;
}

async function getPhotoPoolForQuery(query) {
  if (photoPoolCache[query] !== undefined) return photoPoolCache[query];
  const photos = await fetchPexelsPhoto(query, 'square', POOL_SIZE);
  photoPoolCache[query] = photos.map(p => p.src.medium);
  return photoPoolCache[query];
}

// After the job grid is drawn, resolve each job's best-fit search query
// (title keywords first, category as fallback), fetch each unique query's
// photo pool once, then assign every card a specific photo and fade it in.
async function loadJobPhotos(jobs) {
  const needsPhoto = jobs.filter(j => !j.image_url); // manual posts already have their own photo
  if (needsPhoto.length === 0) return;

  const jobsWithQuery = needsPhoto.map(j => ({ job: j, query: queryForJob(j) }));
  const uniqueQueries = [...new Set(jobsWithQuery.map(x => x.query))];

  const pools = {};
  await Promise.all(uniqueQueries.map(async (q) => { pools[q] = await getPhotoPoolForQuery(q); }));

  jobsWithQuery.forEach(({ job, query }) => {
    const pool = pools[query];
    if (!pool || pool.length === 0) return;
    const url = pool[hashToIndex(String(job.id), pool.length)];
    const img = document.querySelector(`.job-photo[data-job-id="${job.id}"] img`);
    if (img) {
      img.src = url;
      img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
    }
  });
}

// ===== TESTIMONIALS: load from Supabase =====
async function loadTestimonials() {
  const grid = document.getElementById('testimonialsGrid');
  if (!grid) return;

  const { data, error } = await supabaseClient
    .from('testimonials')
    .select('*')
    .eq('approved', true)
    .order('created_at', { ascending: false });

  if (error || !data) { grid.innerHTML = ''; return; }

  grid.innerHTML = data.map(t => `
    <div class="testi-card reveal ${t.featured ? 'featured' : ''}">
      <div class="testi-quote"><i class="fas fa-quote-left"></i></div>
      <p>"${t.quote}"</p>
      <div class="testi-author">
        <div class="testi-avatar" style="background:${t.avatar_color}">${t.avatar_initials}</div>
        <div>
          <strong>${t.name}</strong>
          <span>${t.role_title} ${t.country_flag || ''}</span>
        </div>
      </div>
    </div>
  `).join('');

  observeReveal();
}

// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) navbar?.classList.add('scrolled');
  else navbar?.classList.remove('scrolled');

  const btn = document.getElementById('backTop');
  if (window.scrollY > 400) btn?.classList.add('visible');
  else btn?.classList.remove('visible');
}, { passive: true });

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger?.addEventListener('click', () => navLinks?.classList.toggle('open'));
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

// ===== BACK TO TOP =====
document.getElementById('backTop')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ===== COUNTER ANIMATION =====
function animateCounters() {
  document.querySelectorAll('.trust-num').forEach(el => {
    const target = parseInt(el.dataset.target);
    let current = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 30);
  });
}

// ===== SCROLL REVEAL =====
function observeReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal:not(.in-view)').forEach(el => observer.observe(el));
}

let counterFired = false;
const heroObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !counterFired) {
      counterFired = true;
      animateCounters();
    }
  });
}, { threshold: 0.4 });
const heroSection = document.querySelector('.hero');
if (heroSection) heroObserver.observe(heroSection);

function addRevealClasses() {
  const selectors = ['.cat-card', '.step-card', '.emp-stat-card', '.contact-item'];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = `${i * 0.07}s`;
    });
  });
}

// ===== FILE DROP ZONE =====
let selectedCvFile = null;

function initFileDrop() {
  const drop = document.getElementById('fileDrop');
  const input = document.getElementById('cvFile');
  const label = document.getElementById('fileLabel');
  if (!drop || !input) return;

  drop.addEventListener('click', () => input.click());

  drop.addEventListener('dragover', e => {
    e.preventDefault();
    drop.style.borderColor = 'var(--blue)';
    drop.style.background = 'var(--blue-light)';
  });

  drop.addEventListener('dragleave', () => {
    drop.style.borderColor = '';
    drop.style.background = '';
  });

  drop.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
    drop.style.borderColor = '';
    drop.style.background = '';
  });

  input.addEventListener('change', () => {
    if (input.files[0]) handleFile(input.files[0]);
  });

  function handleFile(file) {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      alert('Please upload a PDF or Word document.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('File is too large. Please upload a CV under 8MB.');
      return;
    }
    selectedCvFile = file;
    label.innerHTML = `<i class="fas fa-file-check" style="color:var(--blue)"></i> <strong style="color:var(--navy)">${file.name}</strong> selected ✓`;
    drop.style.borderColor = 'var(--blue)';
  }
}

// ===== CONTACT FORM SUBMIT (kept simulated — hook up to a 'contact_messages' table the same way if needed) =====
document.getElementById('contactForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  const btn = document.getElementById('contactSubmitBtn');
  const success = document.getElementById('contactSuccess');

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  setTimeout(() => {
    btn.innerHTML = '<i class="fas fa-check"></i> Sent!';
    btn.style.background = '#0a7c4e';
    success?.classList.remove('hidden');
    this.reset();
  }, 1600);
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderMarquee();
  loadHeroPhoto();
  loadTestimonials();
  addRevealClasses();
  observeReveal();
  initFileDrop();
});
