/* Suffix array via a general-purpose sort over suffix start positions. */
window.GI = window.GI || {};

(function (GI) {
  'use strict';

  function compareSuffixes(text, i, j) {
    var n = text.length;
    while (i < n && j < n) {
      var d = GI.rank(text[i]) - GI.rank(text[j]);
      if (d !== 0) return d;
      i++;
      j++;
    }
    return (n - i) - (n - j);
  }

  function build(text) {
    var sa = [];
    for (var i = 0; i < text.length; i++) sa.push(i);
    sa.sort(function (a, b) {
      return compareSuffixes(text, a, b);
    });
    return sa;
  }

  function inverse(sa) {
    var isa = new Array(sa.length);
    for (var r = 0; r < sa.length; r++) isa[sa[r]] = r;
    return isa;
  }

  /* LCP of adjacent suffixes in the suffix array (Kasai not needed at these sizes). */
  function lcpArray(text, sa) {
    var lcp = [0];
    for (var r = 1; r < sa.length; r++) {
      var i = sa[r - 1];
      var j = sa[r];
      var k = 0;
      while (i + k < text.length && j + k < text.length && text[i + k] === text[j + k]) k++;
      lcp.push(k);
    }
    return lcp;
  }

  /* Binary search over the suffix array: returns the half-open interval of matches. */
  function search(text, sa, pattern) {
    function cmpPrefix(pos) {
      for (var k = 0; k < pattern.length; k++) {
        if (pos + k >= text.length) return -1;
        var d = GI.rank(text[pos + k]) - GI.rank(pattern[k]);
        if (d !== 0) return d;
      }
      return 0;
    }
    var lo = 0, hi = sa.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (cmpPrefix(sa[mid]) < 0) lo = mid + 1;
      else hi = mid;
    }
    var start = lo;
    hi = sa.length;
    while (lo < hi) {
      var mid2 = (lo + hi) >> 1;
      if (cmpPrefix(sa[mid2]) <= 0) lo = mid2 + 1;
      else hi = mid2;
    }
    return { start: start, end: lo };
  }

  GI.suffixArray = {
    build: build,
    inverse: inverse,
    lcpArray: lcpArray,
    search: search,
    compareSuffixes: compareSuffixes
  };
})(window.GI);
