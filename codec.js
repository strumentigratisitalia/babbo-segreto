// Codifica dei bigliettini: i dati stanno solo nel frammento "#" del link,
// quindi non arrivano mai a nessun server. L'offuscamento serve a non far
// leggere il nome estratto a chi guarda il link, non è crittografia.
(function (global) {
  var KEY = 'babbo-segreto:fiocco-di-neve:2026';

  function xor(bytes) {
    var out = new Uint8Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) {
      out[i] = bytes[i] ^ KEY.charCodeAt(i % KEY.length) ^ ((i * 31) & 255);
    }
    return out;
  }

  function toB64url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromB64url(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    var s = atob(str);
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function encode(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    return toB64url(xor(bytes));
  }

  function decode(str) {
    try {
      var bytes = xor(fromB64url(str.trim()));
      var obj = JSON.parse(new TextDecoder().decode(bytes));
      return obj && obj.n && obj.r ? obj : null;
    } catch (e) {
      return null;
    }
  }

  // Estrazione con vincoli: nessuno pesca se stesso o una persona esclusa.
  // names: array di nomi; excluded: Set di coppie "i>j" vietate.
  // Prima verifica che un abbinamento esista (matching bipartito), poi
  // cerca un'estrazione casuale con un tetto di passi; se il tetto scatta,
  // usa l'abbinamento trovato su un ordine casuale.
  function draw(names, excluded) {
    var n = names.length;
    var fallback = matching(n, excluded);
    if (!fallback) return null;
    for (var t = 0; t < 20; t++) {
      var result = solve(n, excluded, 20000);
      if (result) return result;
    }
    return fallback;
  }

  function matching(n, excluded) {
    var owner = new Array(n).fill(-1);
    var givers = shuffle(range(n));
    function augment(g, seen) {
      var opts = shuffle(range(n));
      for (var o = 0; o < n; o++) {
        var r = opts[o];
        if (r === g || seen[r] || excluded.has(g + '>' + r)) continue;
        seen[r] = true;
        if (owner[r] < 0 || augment(owner[r], seen)) { owner[r] = g; return true; }
      }
      return false;
    }
    for (var i = 0; i < n; i++) if (!augment(givers[i], new Array(n).fill(false))) return null;
    var assign = new Array(n);
    for (var r = 0; r < n; r++) assign[owner[r]] = r;
    return assign;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }

  function rand() {
    var b = new Uint32Array(1);
    crypto.getRandomValues(b);
    return b[0] / 4294967296;
  }

  function solve(n, excluded, budget) {
    var steps = 0;
    var order = shuffle(range(n));
    var taken = new Array(n).fill(false);
    var assign = new Array(n);
    function step(k) {
      if (k === n) return true;
      if (++steps > budget) return false;
      var giver = order[k];
      var options = shuffle(range(n));
      for (var o = 0; o < n; o++) {
        var r = options[o];
        if (r === giver || taken[r] || excluded.has(giver + '>' + r)) continue;
        taken[r] = true; assign[giver] = r;
        if (step(k + 1)) return true;
        taken[r] = false;
      }
      return false;
    }
    return step(0) ? assign : null;
  }

  function range(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    return a;
  }

  global.BS = { encode: encode, decode: decode, draw: draw };
})(window);
