/* Shared helpers: alphabet ordering, sanitising, formatting. */
window.GI = window.GI || {};

(function (GI) {
  'use strict';

  var TERMINATOR = '$';

  // The terminator must sort before every other symbol, independent of its char code.
  function rank(ch) {
    return ch === TERMINATOR ? -1 : ch.charCodeAt(0);
  }

  function compareChars(a, b) {
    return rank(a) - rank(b);
  }

  function sanitize(raw) {
    return String(raw).replace(/\s+/g, '').split(TERMINATOR).join('');
  }

  function alphabetOf(text) {
    var seen = Object.create(null);
    var list = [];
    for (var i = 0; i < text.length; i++) {
      if (!seen[text[i]]) {
        seen[text[i]] = true;
        list.push(text[i]);
      }
    }
    list.sort(compareChars);
    return list;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  GI.TERMINATOR = TERMINATOR;
  GI.rank = rank;
  GI.compareChars = compareChars;
  GI.sanitize = sanitize;
  GI.alphabetOf = alphabetOf;
  GI.escapeHtml = escapeHtml;
})(window.GI);
