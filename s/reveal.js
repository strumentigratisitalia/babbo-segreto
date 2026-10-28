(function () {
  function track(ev) { try { if (window.goatcounter && goatcounter.count) goatcounter.count({ path: ev, title: ev, event: true }); } catch (e) {} }
  var data = BS.decode(location.hash.slice(1));
  var $ = function (id) { return document.getElementById(id); };

  if (!data) { $('bad').hidden = false; return; }

  $('gGroup').textContent = data.g;
  $('gHello').textContent = 'Ciao ' + data.n + ', questo bigliettino è per te.';
  $('notMe').textContent = 'Non sei ' + data.n + '? Chiudi la pagina senza aprirlo.';
  $('gate').hidden = false;

  $('open').onclick = function () {
    $('gate').hidden = true;
    $('rName').textContent = data.r;
    if (data.i) { $('rIdea').textContent = 'Idea: ' + data.i; $('rIdea').hidden = false; }
    var facts = $('facts');
    addFact(facts, 'Gruppo', data.g);
    if (data.b) addFact(facts, 'Budget', data.b + ' €');
    if (data.d) addFact(facts, 'Scambio dei regali', formatDate(data.d));
    if (data.m) { $('rMsg').textContent = '“' + data.m + '”'; $('rMsg').hidden = false; }
    if (data.b) $('ideas').href = '../idee-regalo/#sotto-' + bucket(+data.b);
    $('result').hidden = false;
    track('bigliettino-aperto');
    requestAnimationFrame(function () { $('ticket').classList.add('open'); });
    prepareCard();
  };

  function addFact(dl, k, v) {
    var dt = document.createElement('dt'); dt.textContent = k;
    var dd = document.createElement('dd'); dd.textContent = v;
    dl.append(dt, dd);
  }

  function bucket(b) { return b <= 10 ? 10 : b <= 20 ? 20 : b <= 30 ? 30 : 50; }

  function formatDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // La card si prepara prima del tocco: così navigator.share() parte dentro il gesto dell'utente.
  var cardBlob = null;
  function prepareCard() { makeCard().then(function (b) { cardBlob = b; }, function () {}); }

  $('share').onclick = function () {
    track('condividi-storia');
    var site = location.origin + location.pathname.replace(/s\/(index\.html)?$/, '');
    var text = 'Ho pescato il mio Babbo Natale segreto 🎁 Organizza il tuo: ' + site;
    var fallback = function () {
      if (cardBlob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(cardBlob);
        a.download = 'babbo-segreto.png';
        a.click();
      } else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    };
    var file = cardBlob && new File([cardBlob], 'babbo-segreto.png', { type: 'image/png' });
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], text: text }).catch(function (e) { if (e && e.name !== 'AbortError') fallback(); });
    } else if (navigator.share) {
      navigator.share({ text: text }).catch(function (e) { if (e && e.name !== 'AbortError') fallback(); });
    } else fallback();
  };

  function makeCard() {
    var c = document.createElement('canvas');
    c.width = 1080; c.height = 1920;
    var x = c.getContext('2d');
    return document.fonts.ready.then(function () {
      x.fillStyle = '#123d30'; x.fillRect(0, 0, 1080, 1920);
      // fiocchi
      x.fillStyle = 'rgba(255,255,255,.12)';
      for (var i = 0; i < 70; i++) {
        x.beginPath();
        x.arc((i * 397) % 1080, (i * 811) % 1920, 4 + (i % 5) * 3, 0, Math.PI * 2);
        x.fill();
      }
      // bigliettino
      x.save();
      x.translate(540, 900); x.rotate(-0.06);
      x.fillStyle = '#fbf6ea';
      x.fillRect(-380, -330, 760, 660);
      x.fillStyle = 'rgba(0,0,0,.06)';
      x.fillRect(-380, -10, 760, 20);
      x.fillStyle = '#c3262f';
      x.beginPath(); x.arc(0, -330, 70, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fbf6ea';
      x.font = '72px "Bagel Fat One"'; x.textAlign = 'center';
      x.fillText('B', 0, -306);
      x.fillStyle = '#5c544a';
      x.font = '600 44px Figtree';
      x.fillText('Il mio regalo va a…', 0, -150);
      x.fillStyle = '#1d1a17';
      x.font = '150px "Gochi Hand"';
      x.fillText('segreto!', 0, 40);
      x.fillStyle = '#5c544a';
      x.font = '600 40px Figtree';
      wrap(x, data.g, 0, 210, 640, 50);
      x.restore();
      x.fillStyle = '#fbf6ea';
      x.textAlign = 'center';
      x.font = '84px "Bagel Fat One"';
      x.fillText('Ho pescato!', 540, 380);
      x.font = '600 46px Figtree';
      x.fillText('Organizza il tuo Babbo Natale segreto', 540, 1500);
      x.fillStyle = '#e9b44c';
      x.font = '800 56px Figtree';
      x.fillText('Babbo Segreto', 540, 1590);
      return new Promise(function (res) { c.toBlob(res, 'image/png'); });
    });
  }

  function wrap(ctx, text, x, y, max, lh) {
    var words = String(text).split(' '), line = '';
    for (var i = 0; i < words.length; i++) {
      var t = line + words[i] + ' ';
      if (ctx.measureText(t).width > max && line) { ctx.fillText(line.trim(), x, y); line = words[i] + ' '; y += lh; }
      else line = t;
    }
    ctx.fillText(line.trim(), x, y);
  }
})();
