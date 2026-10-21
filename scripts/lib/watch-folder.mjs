// Watching for the dev server, with plain (non-recursive) fs.watch calls only. Node's recursive watch on Linux stops reporting a
// file once an editor saves it by writing a new file and renaming it over the old one (vim, JetBrains, `sed -i`, `git checkout`).
import { existsSync, readdirSync, statSync, watch } from 'node:fs';
import { dirname, join, sep } from 'node:path';

const inode = (path) => {
  try {
    const s = statSync(path);
    return s.isDirectory() ? s.ino : null;
  } catch {
    return null;
  }
};

/**
 * Calls `onEvent(folder, name)` for each change in `dir` (with `tree`, also in every folder below it, new ones included).
 * When `dir` is deleted, `onEvent(dir, null)` is called and the nearest folder above it that is left is watched until `dir` is
 * back; then the watch starts again and `onEvent(dir, null)` is called again, since the files in it may have changed.
 * @param {string} dir
 * @param {(folder: string, name: string | null) => void} onEvent
 * @param {{ tree?: boolean }} [options]
 * @returns {{ close: () => void }}
 */
export function watchFolder(dir, onEvent, { tree = false } = {}) {
  const watchers = new Map(); // folder -> its watcher
  let ino = null; // the folder `dir` is now (a deleted and made again folder is another one)
  let waiting = null; // the watch on a folder above while `dir` is missing
  let closed = false;

  const drop = (d) => {
    for (const [p, w] of watchers)
      if (p === d || p.startsWith(d + sep)) (w.close(), watchers.delete(p));
  };
  const add = (d) => {
    if (watchers.has(d)) return;
    let w;
    try {
      w = watch(d, (_, name) => {
        if (inode(dir) !== ino) return lost();
        if (name && tree) {
          const p = join(d, String(name));
          inode(p) !== null ? add(p) : drop(p);
        }
        onEvent(d, name ? String(name) : null);
      });
    } catch {
      return; // gone already
    }
    w.on('error', () => (d === dir ? lost() : drop(d)));
    watchers.set(d, w);
    if (tree)
      try {
        for (const e of readdirSync(d, { withFileTypes: true }))
          if (e.isDirectory()) add(join(d, e.name));
      } catch {
        /* gone already */
      }
  };
  // `dir` is gone (or is another folder now): that is a change too.
  const lost = () => {
    drop(dir);
    if (closed || waiting) return;
    onEvent(dir, null);
    wait();
  };
  // Watch the nearest folder above that is there, until `dir` or a folder on the way to it is back (or that folder is gone or
  // made again).
  const nearest = () => {
    let above = dirname(dir);
    while (!existsSync(above) && dirname(above) !== above) above = dirname(above);
    return above;
  };
  const wait = () => {
    const above = nearest();
    const aboveIno = inode(above);
    const retry = () => {
      if (inode(dir) === null && nearest() === above && inode(above) === aboveIno) return;
      waiting?.close();
      waiting = null;
      start(true);
    };
    try {
      waiting = watch(above, retry);
      waiting.on('error', () => {
        waiting?.close();
        waiting = null;
        start(true);
      });
    } catch {
      // The folder above went away meanwhile (a whole tree being deleted): look further up.
      if (dirname(above) !== above) wait();
      return;
    }
    retry(); // made again before the watch above started
  };
  const start = (again) => {
    if (closed) return;
    ino = inode(dir);
    if (ino === null) return wait();
    add(dir);
    if (again) onEvent(dir, null);
  };
  start(false);
  return {
    close: () => {
      closed = true;
      drop(dir);
      waiting?.close();
    },
  };
}
