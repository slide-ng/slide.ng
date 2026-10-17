// Where the Angular app is built for a deck.
//   A deck inside this repository (tests, examples, `npm start`) is built in place.
//   Any other deck (a folder made by `slide-ng create`) gets a working copy of the app in `<deck>/.slide-ng/app`,
//   made fresh from this package each time, so nothing is ever written into the installed package.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve, sep } from 'node:path';
import { checkToolDir, refuseLink, removeInside } from '../lib/tool-dir.mjs';
import { packageRoot } from './package-root.mjs';

/** True when the deck is part of this package's own folder (and not an installed copy in node_modules). */
export function isInPlace(entry) {
  const path = resolve(entry);
  return (
    path.startsWith(packageRoot + sep) &&
    !path.includes(`${sep}node_modules${sep}`) &&
    !path.includes(`${sep}.slide-ng${sep}`)
  );
}

export const appRootFor = (entry) =>
  isInPlace(entry) ? packageRoot : join(dirname(resolve(entry)), '.slide-ng', 'app');

/** The `ng` program of this package's @angular/cli, wherever npm put it. */
/** The path of @angular/core's package.json as this package resolves it. */
const ngCore = () =>
  createRequire(join(packageRoot, 'package.json')).resolve('@angular/core/package.json');

export function ngBinary() {
  const pkg = createRequire(join(packageRoot, 'package.json')).resolve('@angular/cli/package.json');
  return join(dirname(pkg), 'bin', 'ng.js');
}

const RUNTIME_FILES = [
  'angular.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.worker.json',
  'uno.config.mjs',
  'proxy.conf.mjs',
];

/**
 * Makes the folder the app is built in and returns it. For a deck outside this package it is a copy of `src/`,
 * the Angular and TypeScript settings and `public/`; the generated slides (`src/slides/generated`) are left out, the generator writes them.
 */
export function prepareApp(entry) {
  const root = appRootFor(entry);
  checkToolDir(dirname(resolve(entry))); // a symlinked .slide-ng would make the steps below write into another folder
  if (root === packageRoot) return root;
  refuseLink(root);

  // Only these parts of the working folder are replaced; `.angular/cache` stays, so the second build is faster.
  removeInside(join(root, 'src'), root);
  removeInside(join(root, 'public'), root);
  mkdirSync(root, { recursive: true });
  cpSync(join(packageRoot, 'src'), join(root, 'src'), {
    recursive: true,
    filter: (from) => !from.endsWith(`${sep}slides${sep}generated`),
  });
  cpSync(join(packageRoot, 'public'), join(root, 'public'), { recursive: true });
  for (const file of RUNTIME_FILES) {
    rmSync(join(root, file), { force: true }); // a link here is removed, never written through
    cpSync(join(packageRoot, file), join(root, file));
  }
  rmSync(join(root, 'package.json'), { force: true });
  writeFileSync(
    join(root, 'package.json'),
    '{ "name": "slide-ng-app", "private": true, "type": "module" }\n',
  );

  // Use the packages next to this one (Angular and friends): the folder that holds @angular/core, which npm may have put
  // higher up. It is linked as the copy's own node_modules, and the build keeps that path (preserveSymlinks), because the
  // dev server only serves files under <copy>/node_modules: Monaco's icon font was refused from the real path.
  const modules = dirname(dirname(dirname(ngCore())));
  if (!existsSync(join(root, 'node_modules')))
    symlinkSync(modules, join(root, 'node_modules'), 'dir');
  const config = JSON.parse(readFileSync(join(root, 'angular.json'), 'utf8'));
  for (const project of Object.values(config.projects ?? {}))
    if (project.architect?.build?.options) project.architect.build.options.preserveSymlinks = true;
  writeFileSync(join(root, 'angular.json'), JSON.stringify(config, null, 2) + '\n');
  return root;
}
