// `npm run test:dev`: runs the generator in watch mode on a small deck and checks that it keeps seeing changes
// after an editor's atomic save (a new file renamed over the old one), after a `src:` folder is deleted and made again, and
// that a missing `src:` file is named in the dev server's banner (src/slides/generated/problem.ts).
import { spawn, execFileSync } from 'node:child_process';
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reporter } from './browser.mjs';

const t = reporter();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const deck = mkdtempSync(join(tmpdir(), 'slide-ng-watch-'));
const card = join(deck, 'components/watch-card.ts');
const part = join(deck, 'pages/sub/part.md');
const cardText = (word) =>
  `import { Component } from '@angular/core';\n\n@Component({ selector: 'watch-card', template: '<b class="${word}">card</b>' })\nexport class WatchCard {}\n`;
mkdirSync(join(deck, 'components'));
mkdirSync(join(deck, 'pages/sub'), { recursive: true });
writeFileSync(
  join(deck, 'slides.md'),
  '# One\n\n<watch-card />\n\n---\nsrc: ./pages/sub/part.md\n---\n',
);
writeFileSync(card, cardText('text-red-500'));
writeFileSync(part, '# Part\n');
const atomicSave = (file, text) => {
  writeFileSync(`${file}.swp`, text);
  renameSync(`${file}.swp`, file);
};
const problem = () => readFileSync('src/slides/generated/problem.ts', 'utf8');

const gen = spawn(process.execPath, ['scripts/generate.mjs', '--watch'], {
  env: { ...process.env, SLIDES_FILE: join(deck, 'slides.md') },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let runs = 0;
let output = '';
const lines = (d) => {
  output += d;
  runs = (output.match(/\[slides\] generated \d+ slides?/g) ?? []).length;
};
gen.stdout.on('data', lines);
gen.stderr.on('data', lines);
// Waits for one more run of the generator than `before`.
async function regenerated(before) {
  for (let i = 0; i < 300; i++) {
    if (runs > before) {
      await sleep(300); // the files are written; let the watches settle
      return true;
    }
    await sleep(100);
  }
  return false;
}
const step = async (name, change) => {
  const before = runs;
  change();
  t.ok(name, await regenerated(before), `${runs - before} runs`);
};

try {
  for (let i = 0; i < 300 && !output.includes('[slides] watching'); i++) await sleep(100);
  t.ok('the generator watches the deck', output.includes('[slides] watching'));
  await step('an atomic save of a component regenerates', () =>
    atomicSave(card, cardText('text-blue-500')),
  );
  await step('a later plain save of that component regenerates too', () =>
    appendFileSync(card, '// edited\n'),
  );
  await step('a second atomic save regenerates', () =>
    atomicSave(card, cardText('text-green-500')),
  );
  await step('a missing src: file regenerates', () =>
    rmSync(join(deck, 'pages'), { recursive: true }),
  );
  t.ok(
    'the banner names the missing src: file',
    /not found.*part\.md/.test(problem()) && problem().includes('LAST_GOOD = false'),
    problem(),
  );
  await step('the src: folder made again regenerates', () => {
    mkdirSync(join(deck, 'pages/sub'), { recursive: true });
    writeFileSync(part, '# Part again\n');
  });
  t.ok('the banner is cleared', problem().startsWith(`export const PROBLEM = "";`), problem());
  await step('an edit in the folder made again regenerates', () =>
    writeFileSync(part, '# Part edited\n'),
  );
} finally {
  if (t.fail) console.log(output.slice(-2000));
  gen.kill();
  rmSync(deck, { recursive: true, force: true });
  execFileSync(process.execPath, ['scripts/generate.mjs'], { stdio: 'ignore' }); // the normal deck's files back
}
process.exit(t.done());
