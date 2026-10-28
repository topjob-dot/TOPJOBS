'use strict';
// Chat widget — talks to the 'chat-assistant' Supabase Edge Function (CHAT_FUNCTION_URL in supabase-config.js).
// If the function is down or not configured, it still answers common questions locally and points to WhatsApp,
// so visitors never hit a dead chat box.

(function () {
  const SESSION_KEY = 'tjs_chat_session_id';
  let sessionId = null;
  try { sessionId = localStorage.getItem(SESSION_KEY); } catch (e) { /* private mode */ }
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).slice(2) + Date.now();
    try { localStorage.setItem(SESSION_KEY, sessionId); } catch (e) { /* ignore */ }
  }

  let history = [];
  let sending = false;
  let greeted = false;

  const toggleBtn = document.getElementById('chatToggleBtn');
  const panel = document.getElementById('chatPanel');
  const messagesEl = document.getElementById('chatMessages');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const closeBtn = document.getElementById('chatCloseBtn');
  const sendBtn = form?.querySelector('button[type="submit"]');
  if (!toggleBtn || !panel || !messagesEl || !form || !input) return;

  const WA = 'https://wa.me/254748801685';
  const CHIPS = ['Find a job in Kenya', 'Jobs abroad', 'How do I apply?', 'Check my application', 'Join WhatsApp'];

  // Escape first, then turn links into clickable anchors (safe: no raw HTML from the model ever reaches the page)
  function render(text) {
    const safe = String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return safe.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  function addMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.innerHTML = render(text);
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function addChips() {
    const wrap = document.createElement('div');
    wrap.className = 'chat-chips';
    CHIPS.forEach((label) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.addEventListener('click', () => { wrap.remove(); send(label); });
      wrap.appendChild(b);
    });
    messagesEl.appendChild(wrap);
  }
  function setTyping(on) {
    document.getElementById('typingIndicator')?.remove();
    if (!on) return;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble assistant typing';
    bubble.id = 'typingIndicator';
    bubble.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Local answers used only when the server can't reply
  function offlineAnswer(q) {
    const t = q.toLowerCase();
    if (/whatsapp|channel|group|join/.test(t)) return 'Join our WhatsApp channel and group from the "Never Miss a New Job" section on this page (or tap Join WhatsApp in the menu). You can also chat with us directly: ' + WA;
    if (/apply|cv|resume|upload|submit/.test(t)) return 'To apply: scroll to the Jobs section, click the job you like, read the details, then fill in the short form and upload your CV (PDF or Word). It is emailed straight to our team, who review CVs within 48 hours.';
    if (/status|track/.test(t)) return 'You can see your CV status by logging in to the Portal (top of the page). Or WhatsApp us: ' + WA;
    if (/kenya|local|nairobi|mombasa/.test(t)) return 'Open the Jobs section and tap the "Kenya" tab to see local jobs. Click any job to view details and apply.';
    if (/abroad|overseas|international|dubai|uae|qatar|saudi|canada|uk|germany/.test(t)) return 'Open the Jobs section and tap the "International" tab for roles abroad. Click any job to view details and apply.';
    if (/fee|cost|price|pay/.test(t)) return 'For anything about fees please confirm directly with our team on WhatsApp: ' + WA;
    return 'I can\'t reach my assistant brain right now, but our team can help straight away on WhatsApp: ' + WA;
  }

  function open() {
    panel.classList.add('open');
    if (!greeted) {
      greeted = true;
      addMessage('assistant', "Hi! I'm the TOPJOBSEEKERS assistant. Ask me about open jobs in Kenya or abroad, how to apply, or your CV status.");
      addChips();
    }
    input.focus();
  }
  toggleBtn.addEventListener('click', () => (panel.classList.contains('open') ? panel.classList.remove('open') : open()));
  closeBtn?.addEventListener('click', () => panel.classList.remove('open'));

  async function send(text) {
    text = (text || '').trim();
    if (!text || sending) return;
    document.querySelector('.chat-chips')?.remove();
    addMessage('user', text);
    input.value = '';
    sending = true;
    if (sendBtn) sendBtn.disabled = true;
    setTyping(true);

    let reply = '';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      if (typeof CHAT_FUNCTION_URL === 'undefined') throw new Error('CHAT_FUNCTION_URL missing');
      const res = await fetch(CHAT_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '' },
        body: JSON.stringify({ message: text, history, session_id: sessionId }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (data && data.error) console.warn('chat-assistant:', data.error);
      reply = (data && data.reply || '').trim();
      // only remember real answers (the server rejects empty turns, which used to break every later message)
      if (reply && !data.error) {
        history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
        if (history.length > 12) history = history.slice(-12);
      }
      if (!reply) reply = offlineAnswer(text);
    } catch (err) {
      console.warn('Chat request failed:', err);
      reply = offlineAnswer(text);
    } finally {
      clearTimeout(timer);
      setTyping(false);
      addMessage('assistant', reply);
      sending = false;
      if (sendBtn) sendBtn.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
})();
