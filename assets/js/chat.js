/* Sara Automates — "Ask Sara Automates" chat.
   Works in two modes:
   1. Approved answers only (default): replies come from the FAQ list below, in the browser.
   2. AI agent: if SITE_CONFIG.CHAT_ENDPOINT is set (the Apps Script /exec URL from chat-backend.gs), questions are sent there
      and the agent's reply is shown. If the agent is unreachable, the approved answers are used.
   Visitors' messages are never stored by this script. If SITE_CONFIG.CHAT_LOG_ENDPOINT is set,
   only a topic label, whether it was answered, and the page are sent, so Sara can count topics.
   No innerHTML: everything is built with DOM methods. */
(function () {
  'use strict';
  var cfg = window.SITE_CONFIG || {};
  var EMAIL = cfg.CONTACT_EMAIL || 'sara@saraautomates.com';
  var MAX_LEN = 500;

  /* ---------- approved answers (edit these) ----------
     Each answer is a list of parts: plain strings, or [label, href] for a link. */
  var FAQ = [
    { topic: 'pricing', keys: ['cost', 'price', 'pricing', 'how much', 'fee', 'charge', 'pay', 'quote', 'expensive', 'cheap', 'budget', '$', 'usd', 'aed', 'month'],
      answer: ['Setup starts from $900 (USD), one-time. Ongoing care — hosting, monitoring, changes and support — is from $99 per month. The final quote depends on your booking system, your messaging channels and which workflows you need. ', ['See what’s included', 'solutions.html'], ' or ', ['book a clinic demo', 'book.html'], ' for a quote.'] },
    { topic: 'pilot', keys: ['pilot', 'free', 'trial', 'offer', 'discount', 'launch'],
      answer: ['There’s a launch offer: a free 7-day pilot for the first 3 clinics. Sara goes through what the pilot covers for your clinic on a short call. ', ['Claim a pilot', 'book.html'], '.'] },
    { topic: 'integrations', keys: ['system', 'software', 'integrat', 'connect', 'emr', 'ehr', 'pms', 'practice management', 'api', 'calendar', 'google', 'sheet', 'work with', 'compatible', 'dentrix', 'dentally', 'cliniko', 'okadoc'],
      answer: ['Works out of the box: Google Calendar and Google Sheets, email reminders, WhatsApp Business (the official platform) and a booking page or widget on your website. Your practice-management or EMR system needs a quick check on a call to see whether it offers a secure connection (API). If it doesn’t, the assistant can still book into a shared calendar that reception checks. ', ['Book a call', 'book.html'], ' and mention which system you use.'] },
    { topic: 'whatsapp-arabic', keys: ['whatsapp', 'arabic', 'عربي', 'العربية', 'language', 'uae', 'dubai', 'abu dhabi', 'sharjah', 'emirates'],
      answer: ['Yes. For UAE clinics, patients can book, confirm and ask questions on WhatsApp, in English or Arabic, on the official WhatsApp Business platform. Replies match the patient’s language. ', ['See the English and Arabic example', 'uae.html'], '.'] },
    { topic: 'uk', keys: ['uk', 'united kingdom', 'england', 'london', 'nhs', 'gdpr', 'sms', 'text message', 'email reminder'],
      answer: ['For UK practices: a booking page or widget on your website, reminders by SMS or email with confirm and reschedule links, and handover to your practice team. It’s set up with UK GDPR in mind, and a data processing agreement is signed before go-live. ', ['See the UK setup', 'uk.html'], '.'] },
    { topic: 'reschedule', keys: ['reschedul', 'cancel', 'change time', 'change the time', 'no-show', 'no show', 'missed', 'remind'],
      answer: ['Yes. Patients get a reminder before each appointment and can confirm or reschedule in one tap; rescheduling frees the old slot so it can be refilled. Try it: in the ', ['live demo', 'demo.html'], ', book an appointment, then choose “Send a reminder” and reply “2 – Reschedule”.'] },
    { topic: 'demo', keys: ['demo', 'try', 'sample', 'see it', 'example', 'show me', 'my services', 'our services', 'with my clinic', 'our clinic'],
      answer: ['You can try a sample booking right now — no sign-up. The clinic is fictional and nothing you click is sent anywhere. ', ['Open the live demo', 'demo.html'], '. To see it with your own services and timings, ', ['book a 20-minute call', 'book.html'], '.'] },
    { topic: 'privacy', keys: ['privacy', 'data', 'secure', 'security', 'safe', 'patient information', 'confidential', 'store', 'hipaa', 'dha', 'doh', 'patient data', 'real patient', 'personal data'],
      answer: ['The public demo is fictional and never asks for anyone’s details. For live clinics, each clinic gets its own credentials with only the permissions it needs, API keys stay on the server, and data in logs is kept to a minimum. Record-keeping requirements are agreed with you before anything goes live. ', ['Read Security & Privacy', 'privacy.html'], '.'] },
    { topic: 'medical', keys: ['medical', 'diagnos', 'symptom', 'clinical', 'treatment advice', 'pain', 'emergency', 'urgent'],
      answer: ['No — the assistant never gives medical advice. It answers everyday questions like hours, location and bookings. Anything medical goes to your clinic team, and urgent messages are flagged first.'] },
    { topic: 'setup-time', keys: ['how long', 'setup time', 'set up', 'timeline', 'when can', 'go live', 'go-live', 'start', 'onboard', 'days', 'weeks'],
      answer: ['It starts with a 30-minute discovery call. In week 1, Sara builds the workflows using a separate test calendar. In week 2 they are tested with real-life questions, and you approve every answer. Then there’s staff training and go-live on your chosen date, with a review after the first week. ', ['See how it works', 'solutions.html'], '.'] },
    { topic: 'services', keys: ['what do you do', 'what is this', 'services', 'offer', 'workflow', 'booking', 'appointment', 'faq', 'enquir', 'handover', 'reception'],
      answer: ['Four workflows that take routine work off reception: online booking into your calendar, reminders with confirm and reschedule, answers to your approved everyday questions, and handover to reception for anything that needs a person. Start with one or set up all four. ', ['See Solutions', 'solutions.html'], '.'] },
    { topic: 'phone-number', keys: ['phone number', 'new number', 'same number', 'number'],
      answer: ['Usually you keep your existing clinic number, on the official WhatsApp Business platform or with your current SMS provider.'] },
    { topic: 'contract', keys: ['contract', 'stop', 'cancel subscription', 'lock', 'commitment', 'leave', 'anytime', 'any time', 'cancel my', 'notice period'],
      answer: ['Monthly care is month-to-month, and your calendar and data stay yours.'] },
    { topic: 'assistant-disclosure', keys: ['bot', 'robot', 'ai', 'human', 'real person', 'know they'],
      answer: ['Patients are told they’re talking to the clinic’s assistant, and it offers a person whenever one is needed.'] },
    { topic: 'contact', keys: ['contact', 'email', 'talk to', 'speak', 'call', 'sara', 'meeting', 'book a'],
      answer: ['You can ', ['book a 20-minute call', 'book.html'], ' or email ', [EMAIL, 'mailto:' + EMAIL], '. Sara replies within one working day.'] },
    { topic: 'greeting', keys: ['hi', 'hello', 'hey', 'salam', 'assalam', 'good morning', 'good evening'],
      answer: ['Hello! Ask me anything about booking, reminders or patient questions for your clinic — for example cost, setup time or whether it works with your system.'] },
    { topic: 'thanks', keys: ['thank', 'thanks', 'shukran', 'great', 'ok', 'okay'],
      answer: ['You’re welcome! If you’d like to see it with your clinic’s services, ', ['book a clinic demo', 'book.html'], '.'] }
  ];
  var FALLBACK = { topic: 'unanswered', answered: false,
    answer: ['I don’t have an approved answer for that yet. Sara can answer it on a short call — ', ['book a clinic demo', 'book.html'], ' — or email ', [EMAIL, 'mailto:' + EMAIL], '.'] };

  var STARTERS = [
    { label: 'How much does it cost?', ask: 'How much does it cost?' },
    { label: 'Will it work with our system?', ask: 'Will it work with our booking system?' },
    { label: 'Try a sample booking', href: 'demo.html', topic: 'demo' }
  ];

  /* ---------- helpers ---------- */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function norm(s) { return ' ' + String(s).toLowerCase().replace(/[’']/g, '').replace(/[^\w؀-ۿ$ -]+/g, ' ').replace(/\s+/g, ' ') + ' '; }
  function safeHref(href) {
    return /^(mailto:[^\s<>"]+|https:\/\/[^\s<>"]+|[a-z0-9-]+\.html(#[\w-]+)?)$/i.test(href) ? href : null;
  }

  function match(q) {
    var t = norm(q), best = null, bestScore = 0;
    FAQ.forEach(function (f) {
      var score = 0;
      f.keys.forEach(function (k) {
        var key = k.toLowerCase();
        var hit = key.length <= 3 ? t.indexOf(' ' + key + ' ') !== -1 : t.indexOf(key) !== -1;
        if (hit) score += key.length > 6 ? 3 : 2;
      });
      if (f.topic === 'greeting' || f.topic === 'thanks') score = score && t.trim().split(' ').length <= 4 ? score : 0;
      if (score > bestScore) { bestScore = score; best = f; }
    });
    return best ? { topic: best.topic, answered: true, answer: best.answer } : FALLBACK;
  }

  function logTopic(topic, answered, source) {
    var url = cfg.CHAT_LOG_ENDPOINT;
    if (!url || !/^https:\/\//.test(url)) return;
    try {
      fetch(url, { method: 'POST', mode: 'no-cors', credentials: 'omit', referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: 'chat_topic', topic: topic, answered: answered, source: source, page: location.pathname }) });
    } catch (e) { /* ignore */ }
  }

  /* ---------- UI ---------- */
  var launcher = h('button', { type: 'button', class: 'chat-launcher', 'aria-expanded': 'false', 'aria-controls': 'sa-chat' }, [
    h('span', { class: 'chat-launcher-dot', 'aria-hidden': 'true' }), 'Ask a question'
  ]);
  var log = h('div', { class: 'chat-log', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversation' });
  var input = h('input', { type: 'text', class: 'chat-input', maxlength: String(MAX_LEN), autocomplete: 'off', placeholder: 'Type your question…', 'aria-label': 'Your question' });
  var sendBtn = h('button', { type: 'submit', class: 'chat-send', 'aria-label': 'Send' }, ['Send']);
  var form = h('form', { class: 'chat-form' }, [input, sendBtn]);
  var closeBtn = h('button', { type: 'button', class: 'chat-close', 'aria-label': 'Close chat', text: '×' });
  var panel = h('section', { id: 'sa-chat', class: 'chat-panel', role: 'dialog', 'aria-label': 'Ask Sara Automates', hidden: '' }, [
    h('header', { class: 'chat-head' }, [
      h('div', {}, [h('strong', { text: 'Ask Sara Automates' }), h('span', { class: 'chat-sub', text: 'Answers about booking, reminders and setup' })]),
      closeBtn
    ]),
    log,
    h('div', { class: 'chat-starters' }),
    form,
    h('p', { class: 'chat-note', text: 'Please don’t share any patient details here.' })
  ]);
  var starters = panel.querySelector('.chat-starters');
  var history = [];
  var busy = false;

  function bubble(who, parts) {
    var p = h('div', { class: 'chat-msg ' + who });
    parts.forEach(function (part) {
      if (typeof part === 'string') { p.appendChild(document.createTextNode(part)); return; }
      var href = safeHref(part[1]);
      if (!href) { p.appendChild(document.createTextNode(part[0])); return; }
      var a = h('a', { href: href, text: part[0] });
      if (/book\.html/.test(href)) a.addEventListener('click', function () { logTopic('clicked-book-demo', true, 'chat'); });
      p.appendChild(a);
    });
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    return p;
  }

  function typing() { return bubble('bot typing', ['Typing…']); }

  /* Agent replies are plain text. Links to the site's own pages are allowed as [label](page.html). */
  function parseAgentReply(text) {
    var parts = [], re = /\[([^\]]{1,80})\]\(([^)\s]{1,200})\)/g, last = 0, m;
    text = String(text).slice(0, 1500);
    while ((m = re.exec(text))) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      parts.push([m[1], m[2]]);
      last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  function answerLocally(q, source) {
    var r = match(q);
    bubble('bot', r.answer);
    logTopic(r.topic, r.answered, source);
  }

  function ask(q, source) {
    q = String(q || '').trim().slice(0, MAX_LEN);
    if (!q || busy) return;
    bubble('me', [q]);
    history.push({ role: 'user', text: q });
    var ep = cfg.CHAT_ENDPOINT;
    if (!ep || !/^https:\/\//.test(ep)) { answerLocally(q, source); return; }

    busy = true; sendBtn.disabled = true;
    var t = typing();
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 20000);
    fetch(ep, {
      method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ message: q, history: history.slice(-6), page: location.pathname }),
      signal: controller ? controller.signal : undefined
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || typeof j.reply !== 'string' || !j.reply.trim()) throw new Error('empty');
      t.remove();
      bubble('bot', parseAgentReply(j.reply));
      history.push({ role: 'assistant', text: j.reply.slice(0, 600) });
    }).catch(function () {
      t.remove();
      answerLocally(q, source);
    }).then(function () { clearTimeout(timer); busy = false; sendBtn.disabled = false; });
  }

  STARTERS.forEach(function (s) {
    var el = s.href
      ? h('a', { class: 'chat-chip', href: s.href, text: s.label, onclick: function () { logTopic(s.topic, true, 'starter'); } })
      : h('button', { type: 'button', class: 'chat-chip', text: s.label, onclick: function () { ask(s.ask, 'starter'); } });
    starters.appendChild(el);
  });

  form.addEventListener('submit', function (e) { e.preventDefault(); var q = input.value; input.value = ''; ask(q, 'typed'); });

  var greeted = false;
  function open() {
    panel.hidden = false; launcher.setAttribute('aria-expanded', 'true'); launcher.classList.add('is-open');
    if (!greeted) { greeted = true; bubble('bot', ['Hi! I can answer questions about booking, reminders and setup for your clinic. Pick a question below or type your own.']); }
    input.focus();
  }
  function close() { panel.hidden = true; launcher.setAttribute('aria-expanded', 'false'); launcher.classList.remove('is-open'); launcher.focus(); }
  launcher.addEventListener('click', function () { if (panel.hidden) open(); else close(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });

  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  /* For testing in the browser console: SA_CHAT_MATCH('how much is it') */
  window.SA_CHAT_MATCH = function (q) { return match(q).topic; };
})();
