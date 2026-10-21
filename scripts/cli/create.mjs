// `slide-ng create <folder>`: makes a new deck folder from the `template/` folder of this package.
// (A monorepo with a separate create package was the alternative; see docs/DECISIONS.md.)
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { parseFlags } from './flags.mjs';
import { packageRoot as ownRoot } from './package-root.mjs';

/** A valid npm package name made from a folder name. */
export function packageName(folder) {
  const name = basename(resolve(folder))
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '');
  return name || 'my-slides';
}

/** Fills the `{{name}}` and `{{version}}` holes of a template file. */
export function fillTemplate(text, values) {
  return text.replace(/\{\{(\w+)\}\}/g, (whole, key) => values[key] ?? whole);
}

// `packageRoot` is only given by tests (a bundled copy of this file cannot tell where it lives).
export async function createCommand(argv, packageRoot = ownRoot) {
  const { flags, positionals } = parseFlags(argv, { force: { type: 'boolean', alias: 'f' } });
  if (!positionals[0]) throw new Error('Usage: slide-ng create <folder>');
  const target = resolve(positionals[0]);
  if (existsSync(target) && readdirSync(target).length && !flags.force) {
    throw new Error(
      `${target} is not empty. Choose another folder, or pass --force to add the files that are missing.`,
    );
  }
  mkdirSync(target, { recursive: true });
  const values = {
    name: packageName(target),
    version: `^${JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version}`,
  };

  // With --force, files that already exist are kept (cpSync's `force: false`), and only the files copied now are filled in:
  // the deck's own README or slides.md may hold an Angular `{{name}}`.
  const added = ['package.json', 'README.md', 'slides.md'].filter(
    (f) => !existsSync(join(target, f)),
  );
  const addIgnore =
    !existsSync(join(target, '.gitignore')) && !existsSync(join(target, '_gitignore'));
  cpSync(join(packageRoot, 'template'), target, {
    recursive: true,
    force: false,
    errorOnExist: false,
  });
  for (const file of added) {
    const path = join(target, file);
    if (existsSync(path)) writeFileSync(path, fillTemplate(readFileSync(path, 'utf8'), values));
  }
  // npm leaves out files called .gitignore when it packs a package, so the template keeps it as _gitignore.
  if (addIgnore) renameSync(join(target, '_gitignore'), join(target, '.gitignore'));
  // Quoted when it has a space, so the line can be pasted.
  const dir = /\s/.test(positionals[0]) ? JSON.stringify(positionals[0]) : positionals[0];
  console.log(`Created ${target}\n\n  cd ${dir}\n  npm install\n  npm run dev\n`);
}
