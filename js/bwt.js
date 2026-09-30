/* Burrows-Wheeler transform and FM-index (C table, Occ table, backward search, LF mapping). */
window.GI = window.GI || {};

(function (GI) {
  'use strict';

  /* Rotation k of the sorted Burrows-Wheeler matrix starts at sa[k], because the
     unique terminator makes rotation order identical to suffix order. */
  function rotationAt(text, start) {
    return text.slice(start) + text.slice(0, start);
  }

  function transform(text, sa) {
    var n = text.length;
    var last = '';
    var first = '';
    for (var k = 0; k < n; k++) {
      first += text[sa[k]];
      last += text[(sa[k] + n - 1) % n];
    }
    return { bwt: last, firstColumn: first };
  }

  function buildFmIndex(text, sa) {
    var t = transform(text, sa);
    var bwt = t.bwt;
    var n = bwt.length;
    var alphabet = GI.alphabetOf(text);

    var counts = Object.create(null);
    alphabet.forEach(function (c) { counts[c] = 0; });
    for (var i = 0; i < n; i++) counts[bwt[i]]++;

    // C[c] = number of symbols in T that are strictly smaller than c.
    var C = Object.create(null);
    var running = 0;
    alphabet.forEach(function (c) {
      C[c] = running;
      running += counts[c];
    });

    // Occ[c][i] = occurrences of c in bwt[0 .. i-1]; length n+1 per symbol.
    var occ = Object.create(null);
    alphabet.forEach(function (c) {
      occ[c] = new Array(n + 1).fill(0);
    });
    for (var j = 0; j < n; j++) {
      alphabet.forEach(function (c) {
        occ[c][j + 1] = occ[c][j] + (bwt[j] === c ? 1 : 0);
      });
    }

    var lf = new Array(n);
    for (var k = 0; k < n; k++) lf[k] = C[bwt[k]] + occ[bwt[k]][k];

    return {
      text: text,
      sa: sa,
      bwt: bwt,
      firstColumn: t.firstColumn,
      alphabet: alphabet,
      counts: counts,
      C: C,
      occ: occ,
      lf: lf,
      n: n
    };
  }

  /* Backward search: narrows [sp, ep) one pattern symbol at a time, right to left. */
  function backwardSearch(fm, pattern) {
    var sp = 0;
    var ep = fm.n;
    var steps = [];

    for (var i = pattern.length - 1; i >= 0; i--) {
      var c = pattern[i];
      if (!(c in fm.C)) {
        steps.push({ char: c, sp: 0, ep: 0, size: 0, unknown: true });
        return { sp: 0, ep: 0, steps: steps, found: false, positions: [] };
      }
      sp = fm.C[c] + fm.occ[c][sp];
      ep = fm.C[c] + fm.occ[c][ep];
      steps.push({ char: c, sp: sp, ep: ep, size: Math.max(0, ep - sp), unknown: false });
      if (sp >= ep) return { sp: sp, ep: ep, steps: steps, found: false, positions: [] };
    }

    var positions = [];
    for (var k = sp; k < ep; k++) positions.push(fm.sa[k]);
    positions.sort(function (a, b) { return a - b; });
    return { sp: sp, ep: ep, steps: steps, found: ep > sp, positions: positions };
  }

  /* Walk LF mapping from the row of the terminator to rebuild T from the BWT alone. */
  function inverseTransform(fm) {
    var row = fm.bwt.indexOf(GI.TERMINATOR);
    var out = '';
    for (var i = 0; i < fm.n; i++) {
      out = fm.bwt[row] + out;
      row = fm.lf[row];
    }
    return out;
  }

  GI.bwt = {
    rotationAt: rotationAt,
    transform: transform,
    buildFmIndex: buildFmIndex,
    backwardSearch: backwardSearch,
    inverseTransform: inverseTransform
  };
})(window.GI);
