/* Sara Automates — Book a Demo form.
   Client-side checks are for convenience only; the server (form-backend.gs) validates again. */
(function () {
  'use strict';
  var form = document.getElementById('demo-form');
  if (!form) return;
  var cfg = window.SITE_CONFIG || {};
  var status = document.getElementById('form-status');
  var submit = form.querySelector('[type="submit"]');
  var loadedAt = Date.now();
  var LIMITS = { name: 80, clinic: 120, email: 120, phone: 30, system: 120, message: 1000 };
  var EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
  var PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

  function fieldWrap(name) { var el = form.elements[name]; return el && el.closest ? el.closest('.field') : null; }
  function setError(name, msg) {
    var wrap = fieldWrap(name); if (!wrap) return;
    var err = wrap.querySelector('.err');
    if (!err) { err = document.createElement('span'); err.className = 'err'; err.id = 'err-' + name; wrap.appendChild(err); }
    err.textContent = msg || '';
    wrap.classList.toggle('invalid', !!msg);
    var input = form.elements[name];
    if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', err.id); }
    else { input.removeAttribute('aria-invalid'); }
  }
  function val(name) { var el = form.elements[name]; return el ? String(el.value || '').trim() : ''; }

  function validate() {
    var ok = true, first = null;
    function fail(name, msg) { setError(name, msg); ok = false; if (!first) first = form.elements[name]; }
    ['name', 'clinic', 'email', 'phone', 'country'].forEach(function (n) { setError(n, ''); });
    if (!val('name')) fail('name', 'Please enter your name.');
    if (!val('clinic')) fail('clinic', 'Please enter your clinic’s name.');
    if (!val('country')) fail('country', 'Please choose a country.');
    if (!EMAIL_RE.test(val('email'))) fail('email', 'Please enter a valid work email.');
    if (val('phone') && !PHONE_RE.test(val('phone'))) fail('phone', 'Please use digits, spaces and + only.');
    Object.keys(LIMITS).forEach(function (k) { if (val(k).length > LIMITS[k]) fail(k, 'This is too long.'); });
    if (!form.elements.consent.checked) { ok = false; status.className = 'form-status error'; status.textContent = 'Please tick the box to agree to be contacted.'; if (!first) first = form.elements.consent; }
    if (first) first.focus();
    return ok;
  }

  function showFallback() {
    status.className = 'form-status error';
    status.textContent = 'Sorry, your request could not be sent right now. Please email ';
    var a = document.createElement('a');
    a.href = 'mailto:' + cfg.CONTACT_EMAIL + '?subject=' + encodeURIComponent('Clinic demo request');
    a.textContent = cfg.CONTACT_EMAIL;
    status.appendChild(a);
    status.appendChild(document.createTextNode(' and I’ll reply within one working day.'));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.className = 'form-status'; status.textContent = '';
    if (form.elements.company_website && form.elements.company_website.value) return; // honeypot
    if (!validate()) return;
    if (Date.now() - loadedAt < 3000) { status.textContent = 'Please wait a moment and try again.'; return; }

    var payload = {
      name: val('name'), clinic: val('clinic'), country: val('country'), email: val('email'), phone: val('phone'),
      system: val('system'),
      workflows: Array.prototype.slice.call(form.querySelectorAll('input[name="workflows"]:checked')).map(function (c) { return c.value; }),
      message: val('message'), consent: true, page: location.pathname, elapsed_ms: Date.now() - loadedAt
    };
    if (!cfg.FORM_ENDPOINT || !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(cfg.FORM_ENDPOINT)) { showFallback(); return; }

    submit.disabled = true; submit.textContent = 'Sending…';
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timeout = setTimeout(function () { if (controller) controller.abort(); }, 15000);
    fetch(cfg.FORM_ENDPOINT, {
      method: 'POST', body: JSON.stringify(payload), credentials: 'omit', redirect: 'follow', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: controller ? controller.signal : undefined
    }).then(function (r) { return r.json(); }).then(function (j) {
      clearTimeout(timeout);
      if (!j || j.ok !== true) throw new Error('rejected');
      form.hidden = true;
      document.getElementById('form-success').hidden = false;
      document.getElementById('form-success').focus();
    }).catch(function () {
      clearTimeout(timeout);
      submit.disabled = false; submit.textContent = 'Request my demo';
      showFallback();
    });
  });
})();
