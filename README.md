# Genome Indexing Explorer

A dependency-free, client-side teaching app for MSc Bioinformatics lectures on full-text indexing.
Open `index.html` in any browser — no build step, no server, no network access required.

## Covered topics

| Tab | Content |
| --- | --- |
| Overview | Space and search-time comparison of all four indexes for the current input |
| Suffix trie | Full trie of all suffixes of `T$`, drawn as SVG, with the pattern path highlighted |
| Suffix tree | Path-compressed trie, drawn as SVG, with node-count comparison |
| Suffix array | Sorted suffix positions, optional full suffixes and LCP column, binary search |
| BWT & FM-index | BWT, optional full Burrows–Wheeler matrix, C and Occ tables, backward search, LF reconstruction |

## Usage

1. Enter a text `T` (the terminator `$` is appended automatically) and a pattern `P`.
2. Press **Build indexes** or Enter.
3. Switch tabs; use the zoom sliders for the drawings and the checkboxes for the "small string" views.
4. Every element has a collapsed "explain" block above it; click it to reveal the background theory.
   Hovering an option checkbox shows what it changes.

## Size limits

| Feature | Limit on \|T\| |
| --- | --- |
| Suffix array, BWT, FM-index | 2000 |
| Suffix trie / tree construction | 150 |
| Suffix tree drawing | 120 |
| Suffix trie drawing | 40 |
| Full suffixes in the suffix array | 80 |
| Full BW matrix, full Occ table | 60 |

## Implementation notes

- The suffix array is built with a general-purpose comparison sort (`Array.prototype.sort`); no
  linear-time SA construction is used, which keeps the code readable for teaching.
- The suffix tree is derived from the suffix trie by collapsing non-branching paths, so students see
  the direct relationship between the two structures. Ukkonen's algorithm is not needed at these sizes.
- Rotations of `T$` sort identically to suffixes because the terminator is unique, so the BW matrix is
  read off the suffix array.
- Files are plain scripts (no ES modules) so the page also works over `file://`.

## Layout

```
index.html
css/styles.css
js/core.js          alphabet order, sanitising, escaping
js/suffix-trie.js   trie construction
js/suffix-tree.js   path compression
js/suffix-array.js  sorting, LCP, binary search
js/bwt.js           BWT, C/Occ tables, backward search, LF mapping
js/tree-view.js     tidy tree layout and SVG drawing
js/app.js           UI wiring and rendering
```
