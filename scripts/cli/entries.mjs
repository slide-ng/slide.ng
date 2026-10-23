// Several decks in one run, like Slidev's `slidev build a.md b.md` and `slidev export a.md b.md`. The decks run one
// after another (one Angular build at a time keeps memory down); these helpers only decide where each one goes.
import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

/** The entry files of a command, resolved; `slides.md` when none is given. A file named twice is refused. */
export function deckEntries(positionals, fallback = 'slides.md') {
  const entries = (positionals.length ? positionals : [fallback]).map((p) => resolve(p));
  const twice = entries.find((entry, i) => entries.indexOf(entry) !== i);
  if (twice) throw new Error(`${twice} is listed twice; name each deck once`);
  return entries;
}

/** Refuses a missing entry before the first deck is built, so a typo in the last one does not wait for the others. */
export function checkEntriesExist(entries) {
  const missing = entries.filter((entry) => !existsSync(entry));
  if (missing.length)
    throw new Error(
      `${missing.join(', ')} not found. Run slide-ng in the deck's folder, name the file (slide-ng build talk.md), or start a deck with: slide-ng create my-deck`,
    );
}

/**
 * Where each deck of `build` goes. One deck: `out` and `base` as given. Several: `<out>/<name>/` served under
 * `<base><name>/`, where `<name>` is the file name without `.md` (Slidev's folders). An offline folder keeps `./`.
 * @param {string[]} entries
 * @param {{ out: string, base: string, offline?: boolean }} options
 */
export function buildTargets(entries, { out, base, offline = false }) {
  if (entries.length === 1) return [{ entry: entries[0], out, base }];
  const seen = new Map();
  return entries.map((entry) => {
    const name = basename(entry).replace(/\.md$/i, '');
    if (!/^[\w.~-]+$/.test(name) || /^\.+$/.test(name))
      throw new Error(
        `${entry}: with several decks each one is built into a folder named after its file, and "${name}" cannot be a folder name in an address; rename the file`,
      );
    // macOS and Windows file systems ignore case, so Talk and talk are one folder there.
    const key = name.toLowerCase();
    if (seen.has(key))
      throw new Error(
        `${seen.get(key)} and ${entry} would both be built into ${join(out, name)}; rename one of them`,
      );
    seen.set(key, entry);
    return { entry, out: join(out, name), base: offline ? base : `${base}${name}/` };
  });
}

/** Refuses the flags of `export` that name one place, when there are several decks. */
export function checkExportFlags(entries, flags) {
  if (entries.length < 2) return;
  for (const flag of ['output', 'dist', 'url'])
    if (flags[flag] !== undefined)
      throw new Error(
        `--${flag} names one ${flag === 'output' ? 'file' : 'deck'}, so it cannot be used with several entries (each deck is exported to its own file)`,
      );
}

/** Refuses two decks whose exports would get the same file name. `outBases` are the paths without extension. */
export function checkDistinctOutputs(entries, outBases) {
  const seen = new Map();
  outBases.forEach((outBase, i) => {
    const key = outBase.toLowerCase(); // one file on a file system that ignores case
    if (seen.has(key))
      throw new Error(
        `${seen.get(key)} and ${entries[i]} would both be exported to ${outBase}; give one an exportFilename`,
      );
    seen.set(key, entries[i]);
  });
}
