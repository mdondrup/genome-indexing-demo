/* UI wiring: build all four indexes for the current input and render each tab. */
(function (GI) {
  'use strict';

  var LIMITS = {
    text: 2000,        // suffix array / BWT / FM-index
    trieBuild: 150,    // suffix trie has O(n^2) nodes
    trieDraw: 40,
    treeDraw: 120,
    fullSuffixes: 80,  // "show all suffixes" option
    bwm: 60,           // full Burrows-Wheeler matrix option
    occ: 60            // full Occ table option
  };

  var esc = GI.escapeHtml;
  var state = { zoom: { trie: 1, tree: 1 } };

  function $(id) { return document.getElementById(id); }

  function stats(container, items) {
    container.innerHTML = items.map(function (it) {
      return '<div class="stat"><div class="k">' + esc(it.k) + '</div><div class="v">' + esc(it.v) + '</div></div>';
    }).join('');
  }

  function notify(messages) {
    var box = $('notice');
    if (!messages.length) {
      box.className = 'notice';
      box.innerHTML = '';
      return;
    }
    box.className = 'notice visible';
    box.innerHTML = messages.map(function (m) { return esc(m); }).join('<br>');
  }

  function syncOptionAvailability(n) {
    var pairs = [
      ['opt-suffixes', n <= LIMITS.fullSuffixes],
      ['opt-bwm', n <= LIMITS.bwm],
      ['opt-occ', n <= LIMITS.occ]
    ];
    pairs.forEach(function (p) {
      var box = $(p[0]);
      box.disabled = !p[1];
      if (!p[1]) box.checked = false;
    });
  }

  function build() {
    var raw = $('text-input').value;
    var clean = GI.sanitize(raw);
    var pattern = GI.sanitize($('pattern-input').value);
    var messages = [];

    if (!clean) {
      notify(['Please enter a non-empty text. Whitespace and "$" characters are removed automatically.']);
      return;
    }
    if (clean.length > LIMITS.text) {
      clean = clean.slice(0, LIMITS.text);
      messages.push('Text truncated to ' + LIMITS.text + ' characters.');
    }
    if (clean !== raw) $('text-input').value = clean;

    var text = clean + GI.TERMINATOR;
    var n = text.length;
    syncOptionAvailability(n);

    var sa = GI.suffixArray.build(text);
    var lcp = GI.suffixArray.lcpArray(text, sa);
    var fm = GI.bwt.buildFmIndex(text, sa);

    var trie = null;
    var tree = null;
    if (clean.length <= LIMITS.trieBuild) {
      trie = GI.suffixTrie.build(text);
      tree = GI.suffixTree.build(trie);
    } else {
      messages.push('Suffix trie and suffix tree are skipped above ' + LIMITS.trieBuild +
        ' characters (the trie grows quadratically).');
    }

    var model = { text: text, clean: clean, n: n, pattern: pattern, sa: sa, lcp: lcp, fm: fm, trie: trie, tree: tree };
    state.model = model;

    renderAll(model, messages);
  }

  function renderAll(m, messages) {
    messages = messages.slice();
    renderOverview(m);
    renderTrie(m, messages);
    renderTree(m, messages);
    renderArray(m);
    renderBwt(m);
    notify(messages);
  }

  /* ---------- Overview ---------- */

  function renderOverview(m) {
    stats($('overview-stats'), [
      { k: 'Text length |T$|', v: m.n },
      { k: 'Alphabet', v: m.fm.alphabet.join(' ') },
      { k: 'Alphabet size', v: m.fm.alphabet.length },
      { k: 'Pattern', v: m.pattern || '(none)' }
    ]);

    var chars = m.text.split('').map(function (c, i) {
      return '<span title="position ' + i + '">' + esc(c) + '</span>';
    }).join('');
    $('overview-text').innerHTML = 'T$ = ' + chars + '\npositions: ' +
      m.text.split('').map(function (c, i) { return i % 10; }).join('');

    var rows = [
      ['Suffix trie', 'O(n&sup2;) nodes', m.trie ? m.trie.nodeCount + ' nodes' : 'not built',
        'O(m) per match step', 'Conceptually simplest, unusable for genomes'],
      ['Suffix tree', 'O(n) nodes', m.tree ? (m.tree.internalCount + m.tree.leafCount) + ' nodes' : 'not built',
        'O(m + occ)', 'Fast, but large constant (~15-20 bytes/base)'],
      ['Suffix array', 'n integers', m.n + ' integers', 'O(m log n) with binary search',
        'Compact, simple to build with a general sort'],
      ['BWT + FM-index', 'n symbols + C + Occ', m.n + ' symbols + ' +
        (m.fm.alphabet.length * (m.n + 1)) + ' Occ entries', 'O(m) backward search',
        'Compressible; basis of Bowtie/BWA']
    ];

    $('overview-table').innerHTML =
      '<thead><tr><th>Index</th><th>Space (asymptotic)</th><th>Space (this input)</th>' +
      '<th>Search for P (|P| = m)</th><th>Remarks</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr>' + r.map(function (c, i) {
          return '<td>' + (i === 1 || i === 4 ? c : esc(c)) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';
  }

  /* ---------- Suffix trie ---------- */

  function renderTrie(m, messages) {
    var canvas = $('trie-canvas');
    if (!m.trie) {
      stats($('trie-stats'), [{ k: 'Status', v: 'not built' }]);
      canvas.innerHTML = '<p class="hint" style="padding:1rem">Text too long for a suffix trie.</p>';
      return;
    }

    stats($('trie-stats'), [
      { k: 'Nodes', v: m.trie.nodeCount },
      { k: 'Edges', v: m.trie.edgeCount },
      { k: 'Leaves', v: m.n },
      { k: 'Max depth', v: m.n }
    ]);

    if (m.clean.length > LIMITS.trieDraw) {
      canvas.innerHTML = '<p class="hint" style="padding:1rem">The trie has ' + m.trie.nodeCount +
        ' nodes &mdash; too many to draw. Use a text of at most ' + LIMITS.trieDraw +
        ' characters to see the drawing.</p>';
      messages.push('Suffix trie drawing omitted above ' + LIMITS.trieDraw + ' characters.');
      return;
    }

    GI.treeView.render(canvas, GI.suffixTrie.toRenderTree(m.trie), {
      zoom: state.zoom.trie,
      highlightPrefix: m.pattern
    });
  }

  /* ---------- Suffix tree ---------- */

  function renderTree(m, messages) {
    var canvas = $('tree-canvas');
    if (!m.tree) {
      stats($('tree-stats'), [{ k: 'Status', v: 'not built' }]);
      canvas.innerHTML = '<p class="hint" style="padding:1rem">Text too long for a suffix tree drawing.</p>';
      return;
    }

    stats($('tree-stats'), [
      { k: 'Leaves', v: m.tree.leafCount },
      { k: 'Internal nodes', v: m.tree.internalCount },
      { k: 'Total nodes', v: m.tree.leafCount + m.tree.internalCount },
      { k: 'Compression', v: m.trie.nodeCount + ' \u2192 ' + (m.tree.leafCount + m.tree.internalCount) }
    ]);

    if (m.clean.length > LIMITS.treeDraw) {
      canvas.innerHTML = '<p class="hint" style="padding:1rem">Drawing omitted above ' +
        LIMITS.treeDraw + ' characters.</p>';
      messages.push('Suffix tree drawing omitted above ' + LIMITS.treeDraw + ' characters.');
      return;
    }

    GI.treeView.render(canvas, m.tree.root, {
      zoom: state.zoom.tree,
      highlightPrefix: m.pattern
    });
  }

  /* ---------- Suffix array ---------- */

  function renderArray(m) {
    var showAll = $('opt-suffixes').checked;
    var showLcp = $('opt-lcp').checked;
    var hit = m.pattern ? GI.suffixArray.search(m.text, m.sa, m.pattern) : { start: 0, end: 0 };

    stats($('array-stats'), [
      { k: 'Entries', v: m.n },
      { k: 'Max LCP', v: Math.max.apply(null, m.lcp) },
      { k: 'Matches of P', v: m.pattern ? (hit.end - hit.start) : '\u2013' }
    ]);

    $('array-vector').textContent = 'SA = [' + m.sa.join(', ') + ']';

    var head = '<thead><tr><th>rank i</th><th>SA[i]</th>' +
      (showLcp ? '<th>LCP[i]</th>' : '') + '<th>suffix T[SA[i]..]</th></tr></thead>';

    var body = m.sa.map(function (pos, i) {
      var suffix = m.text.slice(pos);
      var shown = showAll || suffix.length <= 40 ? suffix : suffix.slice(0, 40) + '\u2026';
      var isHit = m.pattern && i >= hit.start && i < hit.end;
      var cell = m.pattern && isHit
        ? '<span class="col-last">' + esc(shown.slice(0, m.pattern.length)) + '</span>' +
          esc(shown.slice(m.pattern.length))
        : esc(shown);
      return '<tr class="' + (isHit ? 'hit' : '') + '"><td>' + i + '</td><td>' + pos + '</td>' +
        (showLcp ? '<td>' + m.lcp[i] + '</td>' : '') + '<td class="seq">' + cell + '</td></tr>';
    }).join('');

    $('array-table').innerHTML = head + '<tbody>' + body + '</tbody>';

    var out = $('array-search');
    if (!m.pattern) {
      out.innerHTML = '<span class="dim">Enter a pattern to run a binary search over the suffix array.</span>';
    } else if (hit.end > hit.start) {
      var positions = m.sa.slice(hit.start, hit.end).slice().sort(function (a, b) { return a - b; });
      out.innerHTML = '<span class="ok">Binary search: P = <strong>' + esc(m.pattern) +
        '</strong> occupies ranks [' + hit.start + ', ' + hit.end + ') &rarr; ' +
        (hit.end - hit.start) + ' occurrence(s) at position(s) <strong>' + positions.join(', ') + '</strong>.</span>';
    } else {
      out.innerHTML = '<span class="fail">Binary search: P = <strong>' + esc(m.pattern) +
        '</strong> does not occur in T.</span>';
    }
  }

  /* ---------- BWT and FM-index ---------- */

  function renderBwt(m) {
    var fm = m.fm;
    var res = m.pattern ? GI.bwt.backwardSearch(fm, m.pattern) : null;

    var runs = 1;
    for (var i = 1; i < fm.bwt.length; i++) if (fm.bwt[i] !== fm.bwt[i - 1]) runs++;

    stats($('bwt-stats'), [
      { k: 'BWT length', v: fm.n },
      { k: 'Equal-symbol runs', v: runs },
      { k: 'Occ entries', v: fm.alphabet.length * (fm.n + 1) },
      { k: 'Matches of P', v: res ? res.positions.length : '\u2013' }
    ]);

    $('bwt-string').textContent = 'L = ' + fm.bwt + '\nF = ' + fm.firstColumn;

    renderBwm(m, res);
    renderCTable(fm);
    renderOccTable(fm);
    renderFmSteps(m, res);

    var restored = GI.bwt.inverseTransform(fm);
    $('bwt-inverse').textContent = restored + (restored === m.text ? '   \u2713 identical to T$' : '   \u2717 mismatch');
  }

  function renderBwm(m, res) {
    var fm = m.fm;
    var table = $('bwm-table');
    var full = $('opt-bwm').checked;
    var inRange = function (k) { return res && res.found && k >= res.sp && k < res.ep; };

    if (full) {
      var head = '<thead><tr><th>k</th>' + fm.firstColumn.split('').map(function (_, c) {
        var name = c === 0 ? 'F' : (c === fm.n - 1 ? 'L' : String(c));
        return '<th>' + name + '</th>';
      }).join('') + '</tr></thead>';

      var body = fm.sa.map(function (start, k) {
        var rot = GI.bwt.rotationAt(m.text, start);
        var cells = rot.split('').map(function (ch, c) {
          var cls = c === 0 ? 'col-first' : (c === fm.n - 1 ? 'col-last' : '');
          return '<td class="' + cls + '">' + esc(ch) + '</td>';
        }).join('');
        return '<tr class="' + (inRange(k) ? 'hit' : '') + '"><td>' + k + '</td>' + cells + '</tr>';
      }).join('');

      table.innerHTML = head + '<tbody>' + body + '</tbody>';
      return;
    }

    var head2 = '<thead><tr><th>k</th><th>F</th><th>rotation (sorted)</th><th>L</th>' +
      '<th>SA[k]</th><th>LF[k]</th></tr></thead>';
    var body2 = fm.sa.map(function (start, k) {
      var rot = GI.bwt.rotationAt(m.text, start);
      var shown = rot.length <= 44 ? rot : rot.slice(0, 44) + '\u2026';
      return '<tr class="' + (inRange(k) ? 'hit' : '') + '"><td>' + k + '</td>' +
        '<td class="col-first">' + esc(fm.firstColumn[k]) + '</td>' +
        '<td class="seq dim">' + esc(shown) + '</td>' +
        '<td class="col-last">' + esc(fm.bwt[k]) + '</td>' +
        '<td>' + fm.sa[k] + '</td><td>' + fm.lf[k] + '</td></tr>';
    }).join('');

    table.innerHTML = head2 + '<tbody>' + body2 + '</tbody>';
  }

  function renderCTable(fm) {
    var head = '<thead><tr><th>c</th>' + fm.alphabet.map(function (c) {
      return '<th>' + esc(c) + '</th>';
    }).join('') + '</tr></thead>';

    var counts = '<tr><td>count(c)</td>' + fm.alphabet.map(function (c) {
      return '<td>' + fm.counts[c] + '</td>';
    }).join('') + '</tr>';

    var cRow = '<tr><td>C[c]</td>' + fm.alphabet.map(function (c) {
      return '<td>' + fm.C[c] + '</td>';
    }).join('') + '</tr>';

    $('c-table').innerHTML = head + '<tbody>' + counts + cRow + '</tbody>';
  }

  function renderOccTable(fm) {
    var table = $('occ-table');
    var full = $('opt-occ').checked;

    if (!full) {
      var head = '<thead><tr><th>Occ[c][i]</th>' + fm.alphabet.map(function (c) {
        return '<th>' + esc(c) + '</th>';
      }).join('') + '</tr></thead>';
      var row = '<tr><td>i = ' + fm.n + ' (totals)</td>' + fm.alphabet.map(function (c) {
        return '<td>' + fm.occ[c][fm.n] + '</td>';
      }).join('') + '</tr>';
      var hint = '<tr><td colspan="' + (fm.alphabet.length + 1) + '" class="dim">' +
        (fm.n <= LIMITS.occ
          ? 'Enable "Show the full Occ table" to see all ' + (fm.n + 1) + ' rows.'
          : 'Full Occ table available for texts of at most ' + LIMITS.occ + ' characters.') +
        '</td></tr>';
      table.innerHTML = head + '<tbody>' + row + hint + '</tbody>';
      return;
    }

    var h = '<thead><tr><th>i</th><th>L[i-1]</th>' + fm.alphabet.map(function (c) {
      return '<th>' + esc(c) + '</th>';
    }).join('') + '</tr></thead>';

    var rows = [];
    for (var i = 0; i <= fm.n; i++) {
      rows.push('<tr><td>' + i + '</td><td class="col-last">' +
        (i === 0 ? '<span class="dim">\u2013</span>' : esc(fm.bwt[i - 1])) + '</td>' +
        fm.alphabet.map(function (c) { return '<td>' + fm.occ[c][i] + '</td>'; }).join('') + '</tr>');
    }
    table.innerHTML = h + '<tbody>' + rows.join('') + '</tbody>';
  }

  function renderFmSteps(m, res) {
    var table = $('fm-steps');
    var out = $('fm-result');

    if (!res) {
      table.innerHTML = '';
      out.innerHTML = '<span class="dim">Enter a pattern to run backward search.</span>';
      return;
    }

    var fm = m.fm;
    var prevSp = 0;
    var prevEp = fm.n;

    var rows = res.steps.map(function (step, idx) {
      if (step.unknown) {
        return '<tr class="hit"><td>' + (idx + 1) + '</td><td>' + esc(step.char) +
          '</td><td colspan="3">symbol not in the alphabet of T</td><td>0</td></tr>';
      }
      var spFormula = 'C[' + step.char + '] + Occ[' + step.char + '][' + prevSp + '] = ' +
        fm.C[step.char] + ' + ' + fm.occ[step.char][prevSp];
      var epFormula = 'C[' + step.char + '] + Occ[' + step.char + '][' + prevEp + '] = ' +
        fm.C[step.char] + ' + ' + fm.occ[step.char][prevEp];
      prevSp = step.sp;
      prevEp = step.ep;
      return '<tr><td>' + (idx + 1) + '</td><td class="col-last">' + esc(step.char) + '</td>' +
        '<td>' + esc(spFormula) + '</td><td>' + esc(epFormula) + '</td>' +
        '<td>[' + step.sp + ', ' + step.ep + ')</td><td>' + step.size + '</td></tr>';
    }).join('');

    table.innerHTML = '<thead><tr><th>step</th><th>c (right to left)</th><th>new sp</th>' +
      '<th>new ep</th><th>interval</th><th>matches</th></tr></thead><tbody>' + rows + '</tbody>';

    if (res.found) {
      out.innerHTML = '<span class="ok">Backward search: <strong>' + esc(m.pattern) +
        '</strong> occurs ' + res.positions.length + ' time(s) at position(s) <strong>' +
        res.positions.join(', ') + '</strong> (rows ' + res.sp + '\u2013' + (res.ep - 1) +
        ' of the BW matrix, resolved via SA).</span>';
    } else {
      out.innerHTML = '<span class="fail">Backward search: the interval became empty, <strong>' +
        esc(m.pattern) + '</strong> does not occur in T.</span>';
    }
  }

  /* ---------- Events ---------- */

  function rerender() {
    if (state.model) renderAll(state.model, []);
  }

  function initTabs() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.tabs button'));
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) {
          var selected = b === btn;
          b.setAttribute('aria-selected', String(selected));
          $('panel-' + b.dataset.tab).hidden = !selected;
        });
      });
    });
  }

  function init() {
    initTabs();

    $('build-btn').addEventListener('click', build);
    $('text-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') build(); });
    $('pattern-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') build(); });

    document.querySelectorAll('[data-example]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $('text-input').value = btn.dataset.example;
        build();
      });
    });

    ['opt-suffixes', 'opt-bwm', 'opt-occ', 'opt-lcp'].forEach(function (id) {
      $(id).addEventListener('change', rerender);
    });

    $('trie-zoom').addEventListener('input', function (e) {
      state.zoom.trie = parseFloat(e.target.value);
      if (state.model) renderTrie(state.model, []);
    });
    $('tree-zoom').addEventListener('input', function (e) {
      state.zoom.tree = parseFloat(e.target.value);
      if (state.model) renderTree(state.model, []);
    });

    build();
  }

  document.addEventListener('DOMContentLoaded', init);
})(window.GI);
