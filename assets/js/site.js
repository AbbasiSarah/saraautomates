/* Sara Automates — shared page behaviour: mobile menu, sliders, language switch.
   No inline scripts, no innerHTML: everything is built with DOM methods. */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- mobile menu ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.getElementById('main-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus();
      }
    });
  }

  /* ---------- announcement banner ---------- */
  var announce = document.querySelector('.announce');
  if (announce) {
    try { if (sessionStorage.getItem('sa-announce') === 'closed') announce.hidden = true; } catch (e) { /* storage blocked */ }
    var close = announce.querySelector('.announce-close');
    if (close) close.addEventListener('click', function () {
      announce.hidden = true;
      try { sessionStorage.setItem('sa-announce', 'closed'); } catch (e) { /* ignore */ }
    });
  }

  /* ---------- reveal on scroll + number count-up ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  function countUp(el) {
    var end = parseFloat(el.getAttribute('data-count')), suffix = el.getAttribute('data-suffix') || '', prefix = el.getAttribute('data-prefix') || '';
    if (reduceMotion) { el.textContent = prefix + end + suffix; return; }
    var t0 = null;
    function tick(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1200); el.textContent = prefix + Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix; if (p < 1) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        en.target.querySelectorAll('[data-count]').forEach(countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); el.querySelectorAll('[data-count]').forEach(countUp); });
  }

  /* ---------- footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- sliders ---------- */
  document.querySelectorAll('[data-slider]').forEach(function (root) {
    var track = root.querySelector('.slider-track');
    var slides = Array.prototype.slice.call(root.querySelectorAll('.slide'));
    var prev = root.querySelector('[data-prev]');
    var next = root.querySelector('[data-next]');
    var dotsWrap = root.querySelector('[data-dots]');
    var autoplayMs = parseInt(root.getAttribute('data-autoplay') || '0', 10);
    var index = 0, timer = null, paused = false;

    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');
    slides.forEach(function (s, i) {
      s.setAttribute('role', 'group');
      s.setAttribute('aria-roledescription', 'slide');
      s.setAttribute('aria-label', (i + 1) + ' of ' + slides.length);
    });

    var dots = slides.map(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      b.addEventListener('click', function () { go(i); restart(); });
      if (dotsWrap) dotsWrap.appendChild(b);
      return b;
    });

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-100 * index) + '%)';
      slides.forEach(function (s, j) {
        var active = j === index;
        s.setAttribute('aria-hidden', String(!active));
        if (active) s.removeAttribute('inert'); else s.setAttribute('inert', '');
      });
      dots.forEach(function (d, j) { d.setAttribute('aria-current', String(j === index)); });
    }
    function restart() {
      if (!autoplayMs || reduceMotion) return;
      clearInterval(timer);
      timer = setInterval(function () { if (!paused && !document.hidden) go(index + 1); }, autoplayMs);
    }
    if (prev) prev.addEventListener('click', function () { go(index - 1); restart(); });
    if (next) next.addEventListener('click', function () { go(index + 1); restart(); });
    root.addEventListener('keydown', function (e) {
      if (e.target.closest('input,select,textarea')) return;
      if (e.key === 'ArrowLeft') { go(index - 1); restart(); }
      if (e.key === 'ArrowRight') { go(index + 1); restart(); }
    });
    ['mouseenter', 'focusin'].forEach(function (ev) { root.addEventListener(ev, function () { paused = true; }); });
    ['mouseleave', 'focusout'].forEach(function (ev) { root.addEventListener(ev, function () { paused = false; }); });

    /* swipe */
    var startX = null;
    track.addEventListener('pointerdown', function (e) { startX = e.clientX; });
    track.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX; startX = null;
      if (Math.abs(dx) > 50) { go(index + (dx < 0 ? 1 : -1)); restart(); }
    });

    go(0); restart();
  });

  /* ---------- English / Arabic switch (UAE page) ---------- */
  document.querySelectorAll('[data-lang-switch]').forEach(function (sw) {
    var target = document.getElementById(sw.getAttribute('data-lang-switch'));
    if (!target) return;
    var buttons = sw.querySelectorAll('button[data-set-lang]');
    function setLang(lang) {
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === lang)); });
      target.querySelectorAll('[data-lang]').forEach(function (el) { el.hidden = el.getAttribute('data-lang') !== lang; });
      target.classList.toggle('rtl', lang === 'ar');
      target.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      target.setAttribute('lang', lang);
    }
    buttons.forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang')); }); });
    setLang('en');
  });
})();
