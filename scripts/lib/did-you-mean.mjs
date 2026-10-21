// "Did you mean ...?" for a mistyped name: a layout, a built-in element or attribute, a component, a command or a flag.

// How many single-letter edits (insert, delete, replace, or swap two neighbours) turn `a` into `b`.
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/** The name in `names` closest to `name`, when it is close enough to be a typo of it (about one edit in four letters). */
export function nearest(name, names) {
  const limit = Math.max(1, Math.floor(name.length / 4));
  let best,
    bestDistance = Infinity;
  for (const candidate of names) {
    if (candidate === name) continue;
    const d = distance(name.toLowerCase(), candidate.toLowerCase());
    if (d <= limit && d < bestDistance) [best, bestDistance] = [candidate, d];
  }
  return best;
}

/** ` Did you mean "x"?` for a near name, or an empty text. `format` writes the name (`<x>`, `--x`). */
export function didYouMean(name, names, format = (n) => `"${n}"`) {
  const near = nearest(name, names);
  return near ? ` Did you mean ${format(near)}?` : '';
}
