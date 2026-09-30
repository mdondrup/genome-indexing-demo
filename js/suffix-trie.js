/* Suffix trie: every suffix of T$ inserted character by character. */
window.GI = window.GI || {};

(function (GI) {
  'use strict';

  function newNode(id) {
    return { id: id, children: Object.create(null), suffixIndex: null };
  }

  function build(text) {
    var nextId = 0;
    var root = newNode(nextId++);
    var edges = 0;

    for (var start = 0; start < text.length; start++) {
      var node = root;
      for (var i = start; i < text.length; i++) {
        var ch = text[i];
        if (!node.children[ch]) {
          node.children[ch] = newNode(nextId++);
          edges++;
        }
        node = node.children[ch];
      }
      node.suffixIndex = start;
    }

    return { root: root, nodeCount: nextId, edgeCount: edges, text: text };
  }

  function sortedChildren(node) {
    return Object.keys(node.children).sort(GI.compareChars);
  }

  /* Renderable form: each node carries the label of the edge leading into it. */
  function toRenderTree(trie) {
    function convert(node, edgeLabel) {
      var out = {
        edgeLabel: edgeLabel,
        suffixIndex: node.suffixIndex,
        children: []
      };
      sortedChildren(node).forEach(function (ch) {
        out.children.push(convert(node.children[ch], ch));
      });
      return out;
    }
    return convert(trie.root, '');
  }

  GI.suffixTrie = { build: build, toRenderTree: toRenderTree, sortedChildren: sortedChildren };
})(window.GI);
