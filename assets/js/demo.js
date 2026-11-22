/* Sara Automates — interactive front-desk demo.
   Fictional clinic, preset choices only: the demo never asks visitors for personal or medical
   details, never sends data anywhere and never touches a real calendar.
   All content is created with DOM methods (no innerHTML), so nothing a visitor does can inject code. */
(function () {
  'use strict';

  var REGIONS = {
    uae: {
      clinic: 'Harbour Dental', initials: 'HD', area: 'Jumeirah, Dubai', doctor: 'Dr. Lina Haddad',
      currency: 'AED', closedDay: 5, /* Friday */ channel: 'WhatsApp',
      services: [
        { id: 'checkup', name: 'Check-up', mins: 30, price: 'AED 150' },
        { id: 'cleaning', name: 'Cleaning', mins: 45, price: 'AED 250' },
        { id: 'whitening', name: 'Whitening', mins: 60, price: 'AED 900' },
        { id: 'consult', name: 'Consultation', mins: 30, price: 'Free' }
      ],
      hours: 'Saturday to Thursday, 9 a.m. to 6 p.m. Friday closed.',
      where: 'We are on Jumeirah Beach Road, next to the pharmacy, with free parking at the back.'
    },
    uk: {
      clinic: 'Kensington Dental Studio', initials: 'KD', area: 'London', doctor: 'Dr. Emily Shaw',
      currency: 'GBP', closedDay: 0, /* Sunday */ channel: 'SMS',
      services: [
        { id: 'checkup', name: 'Check-up', mins: 30, price: '£65' },
        { id: 'hygiene', name: 'Hygiene clean', mins: 45, price: '£95' },
        { id: 'whitening', name: 'Whitening', mins: 60, price: '£350' },
        { id: 'consult', name: 'Consultation', mins: 30, price: 'Free' }
      ],
      hours: 'Monday to Saturday, 9 a.m. to 6 p.m. Sunday closed.',
      where: 'We are a two-minute walk from High Street Kensington station.'
    }
  };

  var SLOTS = ['09:00', '09:30', '10:30', '11:00', '13:30', '14:00', '16:00', '17:00'];
  var DAY_START = 9, DAY_END = 18, ROW_PX = 52;
  var SAMPLE_NAMES = ['S. Khan', 'M. Ali', 'J. Patel', 'R. Thomas', 'A. Rahman', 'L. Chen', 'D. Okafor', 'N. Haddad'];
  var SAMPLE_SVCS = ['Check-up', 'Cleaning', 'Filling', 'Consultation', 'X-ray'];

  /* ---------- tiny DOM helper ---------- */
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function svgCheck(color) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '14'); s.setAttribute('height', '14'); s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path'); p.setAttribute('d', 'M5 12.5l4.5 4.5L19 7.5'); p.setAttribute('fill', 'none'); p.setAttribute('stroke', color || '#fff'); p.setAttribute('stroke-width', '3'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    s.appendChild(p); return s;
  }

  /* ---------- time helpers ---------- */
  function toMin(hhmm) { var p = hhmm.split(':'); return +p[0] * 60 + +p[1]; }
  function fmt12(mins) {
    var hh = Math.floor(mins / 60), mm = mins % 60, ap = hh >= 12 ? 'PM' : 'AM', h12 = ((hh + 11) % 12) + 1;
    return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap;
  }
  function dayKey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function dayLabel(d, style) {
    return d.toLocaleDateString('en-GB', style === 'long' ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function openDays(region, n) {
    var out = [], d = new Date(); d.setHours(12, 0, 0, 0);
    while (out.length < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== region.closedDay) out.push(new Date(d)); }
    return out;
  }
  /* deterministic fictional appointments per day */
  function sampleAppointments(date) {
    var seed = date.getDate() * 7 + date.getMonth() * 3;
    var starts = [0, 60, 120, 270, 330, 420, 480];
    var out = [];
    starts.forEach(function (offset, i) {
      if ((seed + i) % 3 === 0) return;
      out.push({ start: DAY_START * 60 + offset, mins: (seed + i) % 2 ? 30 : 45, name: SAMPLE_NAMES[(seed + i) % SAMPLE_NAMES.length], svc: SAMPLE_SVCS[(seed + i * 2) % SAMPLE_SVCS.length] });
    });
    return out;
  }
  function overlaps(appts, start, mins) {
    return appts.some(function (a) { return start < a.start + a.mins && a.start < start + mins; });
  }

  /* ---------- reception schedule (staff view) ---------- */
  function Schedule(root, region) {
    this.root = root; this.region = region; this.extra = {}; this.inboxItems = [];
    this.render(openDays(region, 1)[0]);
  }
  Schedule.prototype.render = function (date, highlightStart) {
    var self = this; this.date = date; clear(this.root);
    var key = dayKey(date);
    var appts = sampleAppointments(date).concat(this.extra[key] || []);
    var times = h('div', { class: 'sched-times', 'aria-hidden': 'true' });
    for (var hr = DAY_START; hr < DAY_END; hr++) times.appendChild(h('div', { text: (hr > 12 ? hr - 12 : hr) + (hr >= 12 ? ' pm' : ' am') }));
    var col = h('div', { class: 'sched-col', role: 'list', 'aria-label': 'Appointments on ' + dayLabel(date, 'long') });
    col.style.height = ((DAY_END - DAY_START) * ROW_PX) + 'px';
    appts.sort(function (a, b) { return a.start - b.start; }).forEach(function (a) {
      var short = a.mins < 45;
      var el = h('div', { class: 'appt' + (short ? ' short' : '') + (a.isNew ? ' new' : '') + (a.moved ? ' moved' : ''), role: 'listitem' },
        h('b', { text: fmt12(a.start) + ' · ' + a.svc }), short ? ' · ' : h('br'), a.name + (a.confirmed ? ' · confirmed ✓' : ''));
      el.style.top = ((a.start - DAY_START * 60) / 60 * ROW_PX + 2) + 'px';
      el.style.height = Math.max(30, a.mins / 60 * ROW_PX - 4) + 'px';
      col.appendChild(el);
      if (a.isNew && a.start === highlightStart) setTimeout(function () { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 80);
    });
    var head = h('div', { class: 'schedule-head' },
      h('div', null, h('strong', { text: 'Reception calendar' }), h('br'), h('span', { text: this.region.clinic + ' · ' + this.region.doctor })),
      h('span', { class: 'pill pill-teal', text: dayLabel(date) }));
    var inbox = h('div', { class: 'inbox' }, h('h4', { text: 'Reception inbox' }));
    if (!this.inboxItems.length) inbox.appendChild(h('p', { class: 'inbox-empty', text: 'No handovers yet. Questions the assistant can’t answer appear here.' }));
    this.inboxItems.forEach(function (it) {
      inbox.appendChild(h('div', { class: 'inbox-item' }, h('span', { class: 'tag', text: it.tag }), h('span', null, h('b', { text: it.title }), h('br'), it.body)));
    });
    var gridWrap = h('div', { class: 'sched-scroll' }, h('div', { class: 'sched-grid' }, times, col));
    this.root.appendChild(head); this.root.appendChild(gridWrap); this.root.appendChild(inbox);
    void self;
  };
  Schedule.prototype.add = function (date, appt) {
    var key = dayKey(date);
    (this.extra[key] = this.extra[key] || []).forEach(function (a) { a.isNew = false; });
    this.extra[key].push(appt);
    this.render(date, appt.start);
  };
  Schedule.prototype.move = function (fromDate, appt, toDate, toStart) {
    var fk = dayKey(fromDate), list = this.extra[fk] || [];
    var i = list.indexOf(appt); if (i > -1) list.splice(i, 1);
    appt.start = toStart; appt.moved = true; appt.isNew = true;
    var tk = dayKey(toDate); (this.extra[tk] = this.extra[tk] || []).push(appt);
    this.render(toDate, toStart);
  };
  Schedule.prototype.handover = function (tag, title, body) {
    this.inboxItems.unshift({ tag: tag, title: title, body: body });
    this.render(this.date);
  };

  /* ---------- the demo widget ---------- */
  function Demo(root) {
    this.root = root;
    this.region = REGIONS[root.getAttribute('data-region')] || REGIONS.uae;
    var schedSel = root.getAttribute('data-schedule');
    var schedEl = schedSel ? document.querySelector(schedSel) : null;
    this.schedule = schedEl ? new Schedule(schedEl, this.region) : null;
    this.booking = null;
    this.build();
  }
  Demo.prototype.build = function () {
    var self = this, r = this.region;
    clear(this.root);
    this.root.classList.add('demo');
    var top = h('div', { class: 'demo-top' },
      h('span', { class: 'clinic-logo', 'aria-hidden': 'true', text: r.initials }),
      h('div', null, h('strong', { text: r.clinic }), h('span', { text: r.area + ' · patient view' })),
      h('span', { class: 'pill sample', text: 'Sample clinic' }));
    var tabs = h('div', { class: 'demo-tabs', role: 'tablist', 'aria-label': 'Demo workflows' });
    this.body = h('div', { class: 'demo-body', role: 'tabpanel', 'aria-live': 'polite' });
    var defs = [['book', 'Book an appointment'], ['remind', 'Send a reminder'], ['ask', 'Answer a question']];
    this.tabButtons = defs.map(function (d, i) {
      var b = h('button', { type: 'button', class: 'demo-tab', role: 'tab', 'aria-selected': i === 0 ? 'true' : 'false', text: d[1],
        onclick: function () { self.show(d[0]); } });
      b.dataset.tab = d[0];
      tabs.appendChild(b); return b;
    });
    tabs.addEventListener('keydown', function (e) {
      var i = self.tabButtons.indexOf(document.activeElement); if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var n = self.tabButtons[(i + (e.key === 'ArrowRight' ? 1 : 2)) % 3]; n.focus(); n.click();
      }
    });
    this.root.appendChild(top); this.root.appendChild(tabs); this.root.appendChild(this.body);
    this.show('book');
  };
  Demo.prototype.show = function (tab) {
    this.tabButtons.forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
    clear(this.body);
    var pane = h('div', { class: 'demo-pane' });
    this.body.appendChild(pane);
    if (tab === 'book') this.paneBook(pane);
    if (tab === 'remind') this.paneRemind(pane);
    if (tab === 'ask') this.paneAsk(pane);
  };
  function step(n, label, done) {
    return h('p', { class: 'demo-step' + (done ? ' done' : '') }, h('span', { class: 'n', text: done ? '✓' : String(n) }), label);
  }

  /* ----- tab 1: booking ----- */
  Demo.prototype.paneBook = function (pane) {
    var self = this, r = this.region;
    var st = { svc: null, day: null, time: null };
    var days = openDays(r, 6);

    var svcBlock = h('div', { class: 'demo-block' });
    var dayBlock = h('div', { class: 'demo-block' });
    var timeBlock = h('div', { class: 'demo-block' });
    var doneBlock = h('div');
    pane.appendChild(svcBlock); pane.appendChild(dayBlock); pane.appendChild(timeBlock); pane.appendChild(doneBlock);

    function renderSvc() {
      clear(svcBlock);
      svcBlock.appendChild(step(1, 'Choose a service', !!st.svc));
      var g = h('div', { class: 'opt-grid' });
      r.services.forEach(function (s) {
        g.appendChild(h('button', { type: 'button', class: 'opt', 'aria-pressed': String(st.svc === s),
          onclick: function () { st.svc = s; st.time = null; renderAll(); } }, s.name, h('small', { text: s.mins + ' min · ' + s.price })));
      });
      svcBlock.appendChild(g);
    }
    function renderDay() {
      clear(dayBlock);
      if (!st.svc) return;
      dayBlock.appendChild(step(2, 'Pick a day', !!st.day));
      var row = h('div', { class: 'days' });
      days.forEach(function (d) {
        var parts = dayLabel(d).split(' ');
        row.appendChild(h('button', { type: 'button', class: 'day', 'aria-pressed': String(st.day && dayKey(st.day) === dayKey(d)), 'aria-label': dayLabel(d, 'long'),
          onclick: function () { st.day = d; st.time = null; renderAll(); if (self.schedule) self.schedule.render(d); } },
          h('small', { text: parts[0].replace(',', '') }), parts.slice(1).join(' ')));
      });
      dayBlock.appendChild(row);
    }
    function renderTime() {
      clear(timeBlock);
      if (!st.svc || !st.day) return;
      timeBlock.appendChild(step(3, 'Pick a time', !!st.time));
      var taken = sampleAppointments(st.day).concat(self.schedule ? (self.schedule.extra[dayKey(st.day)] || []) : []);
      var g = h('div', { class: 'slots' });
      SLOTS.forEach(function (t) {
        var start = toMin(t), busy = overlaps(taken, start, st.svc.mins) || start + st.svc.mins > DAY_END * 60;
        g.appendChild(h('button', { type: 'button', class: 'opt', disabled: busy, 'aria-pressed': String(st.time === t),
          'aria-label': fmt12(start) + (busy ? ' (taken)' : ''), text: fmt12(start).replace(':00', ''),
          onclick: function () { st.time = t; renderAll(); } }));
      });
      timeBlock.appendChild(g);
      if (st.time) {
        timeBlock.appendChild(h('div', { class: 'inline-form' },
          h('p', { class: 'muted', text: st.svc.name + ' · ' + dayLabel(st.day) + ' · ' + fmt12(toMin(st.time)) }),
        ));
        timeBlock.appendChild(h('button', { type: 'button', class: 'btn btn-primary', text: 'Confirm booking', onclick: confirm }));
      }
    }
    function confirm() {
      var start = toMin(st.time);
      var appt = { start: start, mins: st.svc.mins, name: 'Sample patient (you)', svc: st.svc.name, isNew: true };
      self.booking = { date: st.day, appt: appt, svc: st.svc };
      if (self.schedule) self.schedule.add(st.day, appt);
      clear(svcBlock); clear(dayBlock); clear(timeBlock); clear(doneBlock);
      doneBlock.appendChild(h('div', { class: 'confirm-card' },
        h('div', { class: 'row' }, h('span', { class: 'check' }, svgCheck()), 'Booked'),
        h('p', { text: st.svc.name + ' with ' + r.doctor + ', ' + dayLabel(st.day, 'long') + ' at ' + fmt12(start) + '.' }),
        h('p', { class: 'muted', text: 'A confirmation and a reminder are sent by ' + r.channel + '.' })));
      if (self.schedule) {
        doneBlock.appendChild(h('p', { class: 'muted', text: 'Look at the reception calendar: the appointment has just appeared there.' }));
      } else {
        var mini = h('div', { class: 'mini-cal' }, h('div', { class: 'mini-cal-head' }, h('span', { text: 'Reception calendar' }), h('span', { text: dayLabel(st.day) })));
        var list = sampleAppointments(st.day).concat([appt]).sort(function (a, b) { return a.start - b.start; });
        list.forEach(function (a) {
          mini.appendChild(h('div', { class: 'flow-row' + (a === appt ? ' done' : '') },
            h('span', { class: 'dot', text: a === appt ? '✓' : '·' }),
            h('span', null, h('b', { text: fmt12(a.start) + ' · ' + a.svc }), h('small', { text: a.name }))));
        });
        doneBlock.appendChild(mini);
      }
      doneBlock.appendChild(h('div', null,
        h('button', { type: 'button', class: 'demo-reset', text: 'Next: send this patient a reminder →', onclick: function () { self.show('remind'); } }), ' ',
        h('button', { type: 'button', class: 'demo-reset', text: 'Book another', onclick: function () { self.show('book'); } })));
    }
    function renderAll() { renderSvc(); renderDay(); renderTime(); }
    renderAll();
  };

  /* ----- tab 2: reminder ----- */
  Demo.prototype.paneRemind = function (pane) {
    var self = this, r = this.region;
    var b = this.booking;
    if (!b) {
      var d = openDays(r, 1)[0];
      var appt = { start: toMin('10:30'), mins: 45, name: 'Sample patient (you)', svc: r.services[1].name, isNew: true };
      b = this.booking = { date: d, appt: appt, svc: r.services[1] };
      if (this.schedule) this.schedule.add(d, appt);
    }
    pane.appendChild(step(1, 'The patient receives this the day before', false));
    var convo = h('div', { class: 'convo' });
    pane.appendChild(convo);
    var actions = h('div', { class: 'q-list' });
    pane.appendChild(actions);

    function say(dir, who, text) {
      convo.appendChild(h('div', { class: 'bubble ' + dir }, h('span', { class: 'who', text: who }), text));
      convo.scrollTop = convo.scrollHeight;
    }
    say('in', r.clinic + ' · ' + r.channel, 'Hi, this is ' + r.clinic + '. Reminder: your ' + b.appt.svc.toLowerCase() + ' is on ' + dayLabel(b.date, 'long') + ' at ' + fmt12(b.appt.start) + '. Reply 1 to confirm or 2 to reschedule.');

    function opts(list) { clear(actions); list.forEach(function (o) { actions.appendChild(h('button', { type: 'button', class: 'opt', text: o[0], onclick: o[1] })); }); }
    opts([
      ['1 – Confirm', function () {
        say('out', 'Patient', '1'); clear(actions);
        b.appt.confirmed = true; if (self.schedule) self.schedule.render(b.date);
        setTimeout(function () { say('in', r.clinic, 'Thank you, you’re confirmed. See you then!'); done(); }, 450);
      }],
      ['2 – Reschedule', function () {
        say('out', 'Patient', '2'); clear(actions);
        setTimeout(function () {
          var days = openDays(r, 4).slice(1);
          var alts = [];
          days.forEach(function (d) {
            var taken = sampleAppointments(d).concat(self.schedule ? (self.schedule.extra[dayKey(d)] || []) : []);
            for (var i = (alts.length * 3) % SLOTS.length; i < SLOTS.length; i++) {
              var s = toMin(SLOTS[i]);
              if (!overlaps(taken, s, b.appt.mins) && s + b.appt.mins <= DAY_END * 60) { alts.push({ d: d, s: s }); break; }
            }
          });
          say('in', r.clinic, 'No problem. These times are free. Which suits you?');
          opts(alts.map(function (a) {
            return [dayLabel(a.d) + ', ' + fmt12(a.s), function () {
              say('out', 'Patient', dayLabel(a.d) + ', ' + fmt12(a.s)); clear(actions);
              var from = b.date;
              if (self.schedule) self.schedule.move(from, b.appt, a.d, a.s); else { b.appt.start = a.s; }
              b.date = a.d;
              setTimeout(function () { say('in', r.clinic, 'Done. You’re now booked for ' + dayLabel(a.d, 'long') + ' at ' + fmt12(a.s) + '. Your old slot has been released.'); done(); }, 450);
            }];
          }));
        }, 450);
      }]
    ]);
    function done() {
      actions.appendChild(h('button', { type: 'button', class: 'demo-reset', text: 'Next: answer a patient question →', onclick: function () { self.show('ask'); } }));
    }
  };

  /* ----- tab 3: questions & handover ----- */
  Demo.prototype.paneAsk = function (pane) {
    var self = this, r = this.region;
    pane.appendChild(step(1, 'Tap a question a patient might send', false));
    var convo = h('div', { class: 'convo' });
    var qs = h('div', { class: 'q-list' });
    pane.appendChild(convo); pane.appendChild(qs);
    function say(dir, who, text) {
      convo.appendChild(h('div', { class: 'bubble ' + dir }, h('span', { class: 'who', text: who }), text));
      convo.scrollTop = convo.scrollHeight;
    }
    say('in', r.clinic, 'Hello! I’m the clinic assistant. How can I help?');
    var questions = [
      ['What are your opening hours?', function () { return r.hours; }],
      ['Where are you located?', function () { return r.where; }],
      ['Do you accept my insurance?', function () {
        if (self.schedule) self.schedule.handover('Insurance', 'Insurance question', 'Patient asked if their insurer is accepted. Please reply.');
        return 'Good question. I’ve passed this to our reception team, who will check your policy and reply within 15 minutes during opening hours.';
      }],
      ['I have bad tooth pain', function () {
        if (self.schedule) self.schedule.handover('Urgent', 'Patient in pain', 'Asked for help with tooth pain. Call back first.');
        return 'I’m sorry you’re in pain. I can’t give medical advice, so I’ve flagged this to reception as urgent and someone will call you shortly. If it’s an emergency, please call emergency services.';
      }]
    ];
    questions.forEach(function (q) {
      qs.appendChild(h('button', { type: 'button', class: 'opt', text: q[0], onclick: function (e) {
        e.currentTarget.disabled = true;
        say('out', 'Patient', q[0]);
        setTimeout(function () { say('in', r.clinic, q[1]()); }, 450);
      } }));
    });
    if (!self.schedule) pane.appendChild(h('p', { class: 'muted', text: 'Questions it can’t answer go straight to the reception inbox. Try the full demo to see the staff view.' }));
  };

  document.querySelectorAll('[data-demo]').forEach(function (el) { new Demo(el); });
})();
