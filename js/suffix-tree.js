/* Suffix tree obtained by path-compressing the suffix trie.
   Quadratic, but transparent for teaching; Ukkonen is not needed at these sizes. */
window.GI = window.GI || {};

(function (GI) {
  'use strict';

  function onlyChild(node) {
    var keys = Object.keys(node.children);
    return keys.length === 1 ? node.children[keys[0]] : null;
  }

  function build(trie) {
    var internal = 0;
    var leaves = 0;

    function convert(trieNode, edgeLabel) {
      var node = { edgeLabel: edgeLabel, suffixIndex: trieNode.suffixIndex, children: [] };
      var keys = GI.suffixTrie.sortedChildren(trieNode);

      keys.forEach(function (ch) {
        var label = ch;
        var cur = trieNode.children[ch];
        // Collapse the unary path below this edge into a single edge label.
        while (cur.suffixIndex === null && Object.keys(cur.children).length === 1) {
          var next = onlyChild(cur);
          label += Object.keys(cur.children)[0];
          cur = next;
        }
        node.children.push(convert(cur, label));
      });

      if (node.children.length === 0) leaves++;
      else internal++;
      return node;
    }

    var root = convert(trie.root, '');
    return { root: root, internalCount: internal, leafCount: leaves };
  }

  GI.suffixTree = { build: build };
})(window.GI);
