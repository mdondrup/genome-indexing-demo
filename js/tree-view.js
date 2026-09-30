/* Tidy layered layout + SVG drawing for suffix trie and suffix tree. */
window.GI = window.GI || {};

(function (GI) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (k) {
      node.setAttribute(k, attrs[k]);
    });
    return node;
  }

  function layout(root, xGap, yGap) {
    var nextLeafX = 0;
    var nodes = [];
    var links = [];
    var maxDepth = 0;

    (function walk(node, depth, parent) {
      node.depth = depth;
      if (depth > maxDepth) maxDepth = depth;

      if (node.children.length === 0) {
        node.x = nextLeafX * xGap;
        nextLeafX++;
      } else {
        node.children.forEach(function (child) { walk(child, depth + 1, node); });
        var first = node.children[0];
        var last = node.children[node.children.length - 1];
        node.x = (first.x + last.x) / 2;
      }
      node.y = depth * yGap;
      nodes.push(node);
      if (parent) links.push({ from: parent, to: node });
    })(root, 0, null);

    return {
      nodes: nodes,
      links: links,
      width: Math.max(1, nextLeafX) * xGap,
      height: (maxDepth + 1) * yGap
    };
  }

  function longestLabel(root) {
    var max = 1;
    (function walk(node) {
      if (node.edgeLabel && node.edgeLabel.length > max) max = node.edgeLabel.length;
      node.children.forEach(walk);
    })(root);
    return max;
  }

  /* highlightPrefix: draws the root path spelling this string in the accent colour. */
  function render(container, root, options) {
    options = options || {};
    container.innerHTML = '';

    var labelLen = longestLabel(root);
    var xGap = Math.max(52, 18 + labelLen * 11);
    var yGap = 74;
    var pad = 40;

    var laid = layout(root, xGap, yGap);
    var width = laid.width + pad * 2;
    var height = laid.height + pad * 2;

    var svg = el('svg', {
      viewBox: '0 0 ' + width + ' ' + height,
      width: width * (options.zoom || 1),
      height: height * (options.zoom || 1),
      class: 'tree-svg'
    });

    markHighlight(root, options.highlightPrefix || '');

    laid.links.forEach(function (link) {
      var cls = link.to.onHighlight ? 'edge edge-hl' : 'edge';
      svg.appendChild(el('line', {
        x1: link.from.x + pad, y1: link.from.y + pad,
        x2: link.to.x + pad, y2: link.to.y + pad,
        class: cls
      }));

      var label = el('text', {
        x: link.from.x + (link.to.x - link.from.x) * 0.45 + pad,
        y: link.from.y + (link.to.y - link.from.y) * 0.45 + pad - 5,
        class: link.to.onHighlight ? 'edge-label edge-label-hl' : 'edge-label'
      });
      label.textContent = link.to.edgeLabel;
      svg.appendChild(label);
    });

    laid.nodes.forEach(function (node) {
      var isLeaf = node.children.length === 0;
      var classes = ['node'];
      if (isLeaf) classes.push('node-leaf');
      if (node.depth === 0) classes.push('node-root');
      if (node.onHighlight) classes.push('node-hl');

      svg.appendChild(el('circle', {
        cx: node.x + pad,
        cy: node.y + pad,
        r: isLeaf ? 11 : 7,
        class: classes.join(' ')
      }));

      if (isLeaf && node.suffixIndex !== null && node.suffixIndex !== undefined) {
        var t = el('text', {
          x: node.x + pad,
          y: node.y + pad + 4,
          class: 'node-label'
        });
        t.textContent = node.suffixIndex;
        svg.appendChild(t);
      }
    });

    container.appendChild(svg);
    return { nodeCount: laid.nodes.length };
  }

  function markHighlight(root, prefix) {
    (function clear(node) {
      node.onHighlight = false;
      node.children.forEach(clear);
    })(root);

    if (!prefix) return;

    (function walk(node, consumed) {
      if (consumed >= prefix.length) return;
      for (var i = 0; i < node.children.length; i++) {
        var child = node.children[i];
        var label = child.edgeLabel;
        var remaining = prefix.length - consumed;
        var compareLen = Math.min(label.length, remaining);
        if (prefix.substr(consumed, compareLen) === label.substr(0, compareLen)) {
          child.onHighlight = true;
          walk(child, consumed + label.length);
          return;
        }
      }
    })(root, 0);
  }

  GI.treeView = { render: render };
})(window.GI);
