(function () {
  function track(ev) { try { if (window.goatcounter && goatcounter.count) goatcounter.count({ path: ev, title: ev, event: true }); } catch (e) {} }
  var STORE = 'babbo-segreto:gruppo';
  var form = document.getElementById('form');
  var list = document.getElementById('list');
  var exList = document.getElementById('exList');
  var err = document.getElementById('err');
  var out = document.getElementById('out');
  var linksEl = document.getElementById('links');
  var countEl = document.getElementById('count');

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }

  var nextPid = 0;
  function addPerson(name, idea) {
    var li = el('li', { class: 'person', 'data-pid': String(nextPid++) });
    var n = el('input', { 'aria-label': 'Nome', placeholder: 'Nome', maxlength: '24', class: 'p-name' });
    var i = el('input', { 'aria-label': 'Idea regalo (facoltativa)', placeholder: 'Idea regalo (facoltativa)', maxlength: '80', class: 'p-idea' });
    var x = el('button', { type: 'button', class: 'x', 'aria-label': 'Togli questa persona' }, '×');
    n.value = name || ''; i.value = idea || '';
    x.onclick = function () { li.remove(); refresh(); };
    n.addEventListener('input', refresh);
    li.append(n, i, x);
    list.append(li);
    refresh();
    return n;
  }

  function names() {
    return Array.prototype.map.call(list.querySelectorAll('.p-name'), function (e) { return e.value.trim(); });
  }

  function addExclusion(a, b, bothOn) {
    var row = el('div', { class: 'ex' });
    var s1 = el('select', { 'aria-label': 'Chi', class: 'ex-a' });
    var s2 = el('select', { 'aria-label': 'Non pesca', class: 'ex-b' });
    var lbl = el('span', {}, 'non pesca');
    var both = el('label', { class: 'both' });
    var cb = el('input', { type: 'checkbox', class: 'ex-both' });
    cb.checked = bothOn !== false;
    both.append(cb, document.createTextNode(' e viceversa'));
    var x = el('button', { type: 'button', class: 'x', 'aria-label': 'Togli esclusione' }, '×');
    x.onclick = function () { row.remove(); };
    row.append(s1, lbl, s2, both, x);
    exList.append(row);
    fillSelects();
    if (a != null) s1.value = a;
    if (b != null) s2.value = b;
  }

  function fillSelects() {
    var rows = list.querySelectorAll('.person');
    exList.querySelectorAll('select').forEach(function (s) {
      var v = s.value;
      s.innerHTML = '';
      rows.forEach(function (r) {
        var n = r.querySelector('.p-name').value.trim();
        if (!n) return;
        s.append(el('option', { value: r.getAttribute('data-pid') }, n));
      });
      if (v !== '' && s.querySelector('option[value="' + v + '"]')) s.value = v;
    });
  }

  function refresh() {
    var filled = names().filter(Boolean).length;
    countEl.textContent = filled < 3 ? '(almeno 3)' : '(' + filled + ')';
    fillSelects();
  }

  function fail(msg) {
    err.textContent = msg;
    err.hidden = false;
    err.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    err.hidden = true;
    var rows = Array.prototype.slice.call(list.querySelectorAll('.person'));
    var people = [];
    var indexMap = {};
    rows.forEach(function (r) {
      var n = r.querySelector('.p-name').value.trim();
      if (!n) return;
      indexMap[r.getAttribute('data-pid')] = people.length;
      people.push({ n: n, i: r.querySelector('.p-idea').value.trim() });
    });
    if (people.length < 3) return fail('Servono almeno 3 persone per un Babbo Natale segreto.');
    var seen = {};
    for (var p = 0; p < people.length; p++) {
      var key = people[p].n.toLowerCase();
      if (seen[key]) return fail('Il nome "' + people[p].n + '" compare due volte. Aggiungi un cognome o un soprannome per distinguerli.');
      seen[key] = true;
    }
    var excluded = new Set();
    var exSaved = [];
    exList.querySelectorAll('.ex').forEach(function (row) {
      var a = indexMap[row.querySelector('.ex-a').value];
      var b = indexMap[row.querySelector('.ex-b').value];
      if (a == null || b == null || a === b) return;
      var both = row.querySelector('.ex-both').checked;
      excluded.add(a + '>' + b);
      if (both) excluded.add(b + '>' + a);
      exSaved.push([people[a].n, people[b].n, both]);
    });
    var result = BS.draw(people.map(function (x) { return x.n; }), excluded);
    if (!result) return fail('Con queste esclusioni non c\'è un modo valido di estrarre. Togline qualcuna e riprova.');

    var fd = new FormData(form);
    var group = (fd.get('group') || '').trim() || 'Babbo Natale segreto';
    var meta = {
      g: group,
      b: budget(fd.get('budget')),
      d: fd.get('date') || '',
      m: (fd.get('msg') || '').trim()
    };
    var base = location.href.replace(/[#?].*$/, '').replace(/index\.html$/, '') + 's/#';
    var links = people.map(function (giver, gi) {
      var rec = people[result[gi]];
      var payload = { n: giver.n, r: rec.n, g: meta.g, b: meta.b, d: meta.d, m: meta.m, i: rec.i };
      return { name: giver.n, url: base + BS.encode(payload) };
    });
    var saved = { meta: meta, people: people, ex: exSaved, links: links, at: Date.now() };
    try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch (e) {}
    track('estrazione-' + Math.min(people.length, 20));
    showLinks(saved);
  });

  function budget(v) {
    var n = parseFloat(String(v || '').replace(',', '.').replace(/[^\d.]/g, ''));
    return isFinite(n) && n > 0 ? String(Math.round(n)) : '';
  }

  var current = null;

  function waText(name, url, meta) {
    return 'Ciao ' + name + '! 🎅 È il momento del Babbo Natale segreto "' + meta.g + '"' +
      (meta.b ? ' (budget ' + meta.b + ' €)' : '') +
      '. Apri il tuo bigliettino, è solo per te: ' + url;
  }

  function showLinks(saved) {
    current = saved;
    linksEl.innerHTML = '';
    saved.links.forEach(function (l) {
      var li = el('li');
      var name = el('span', { class: 'l-name' }, l.name);
      var wa = el('a', {
        class: 'btn btn-wa',
        href: 'https://wa.me/?text=' + encodeURIComponent(waText(l.name, l.url, saved.meta)),
        target: '_blank', rel: 'noopener'
      }, 'Invia su WhatsApp');
      var cp = el('button', { type: 'button', class: 'btn btn-ghost' }, 'Copia link');
      cp.onclick = function () { copy(waText(l.name, l.url, saved.meta), cp); };
      wa.addEventListener('click', function () { li.classList.add('sent'); track('invio-whatsapp'); });
      li.append(name, wa, cp);
      linksEl.append(li);
    });
    form.hidden = true;
    out.hidden = false;
    var h = document.getElementById('out-h');
    h.focus();
    h.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function copy(text, btn) {
    var done = function () {
      var t = btn.textContent;
      btn.textContent = 'Copiato';
      setTimeout(function () { btn.textContent = t; }, 1600);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { prompt('Copia il testo:', text); });
    else prompt('Copia il testo:', text);
  }

  document.getElementById('copyAll').onclick = function () {
    var saved = current;
    if (!saved) return;
    var text = saved.links.map(function (l) { return l.name + ': ' + l.url; }).join('\n\n');
    copy(text, this);
  };

  document.getElementById('again').onclick = function () {
    if (!confirm('Vuoi rifare l\'estrazione? I link già mandati non varranno più come risultato ufficiale.')) return;
    out.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth' });
  };

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE)); } catch (e) { return null; }
  }

  document.getElementById('add').onclick = function () { addPerson().focus(); };
  document.getElementById('addEx').onclick = function () {
    if (names().filter(Boolean).length < 2) return fail('Scrivi prima almeno due nomi.');
    addExclusion();
  };

  var saved = load();
  if (saved && saved.people) {
    saved.people.forEach(function (p) { addPerson(p.n, p.i); });
    var pidOf = {};
    list.querySelectorAll('.person').forEach(function (r) { pidOf[r.querySelector('.p-name').value.trim()] = r.getAttribute('data-pid'); });
    (saved.ex || []).forEach(function (e) {
      if (pidOf[e[0]] != null && pidOf[e[1]] != null) addExclusion(pidOf[e[0]], pidOf[e[1]], e[2]);
    });
    form.group.value = saved.meta.g; form.budget.value = saved.meta.b;
    form.date.value = saved.meta.d; form.msg.value = saved.meta.m;
    showLinks(saved);
    out.hidden = false;
    document.getElementById('out-h').blur();
    window.scrollTo(0, 0);
  } else {
    for (var k = 0; k < 4; k++) addPerson();
  }
})();
