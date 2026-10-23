// Builds the code samples of the agent skill (skills/slide-ng) and fails when one does not build.
//   Samples are the `md` fences after `<!-- verify -->`; `<!-- verify-file: path -->` adds a file next to them (see scripts/skills/samples.mjs).
//   1. Every sample is its own deck in a temporary folder and goes through the real generator. Any error or warning fails it.
//   2. All samples together become the slides of one deck, built with the real `slide-ng build` (Angular compiles every template).
//   Flags: --skill <folder> another skill folder, --each  also build every sample alone with `slide-ng build` (slow), --only <text> only samples whose name has this text,
//          --no-build  skip step 2, --keep  keep the temporary folder.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@slidev/parser/fs';
import { stringify as yaml } from 'yaml';
import { prepareApp } from '../../scripts/cli/app-root.mjs';
import { extractSamples } from '../../scripts/skills/samples.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const skillArg = process.argv.indexOf('--skill');
const skill = skillArg > 0 ? resolve(process.argv[skillArg + 1]) : join(repo, 'skills/slide-ng'); // --skill <folder> is for trying the checker
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
const WORKERS = 4;
let work = null; // the temporary folder, made once the samples are read

// ---- collect
const pages = [
  'SKILL.md',
  ...readdirSync(join(skill, 'references'))
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => `references/${f}`),
];
const samples = [];
const problems = [];
let fragments = 0;
for (const page of pages) {
  const found = extractSamples(readFileSync(join(skill, page), 'utf8'), page);
  problems.push(...found.problems);
  fragments += found.unmarked;
  const names = new Map();
  for (const f of found.files) names.set(f.path, f.text);
  for (const s of found.samples) {
    if (only && !s.id.includes(only)) continue;
    samples.push({ ...s, page, companions: names });
  }
}
if (problems.length) fail('Problems in the samples:', problems);
if (!samples.length) fail('No <!-- verify --> samples found.', []);

// The pictures a sample names with a leading slash (`/photo.png`) are the reader's own: an empty stand-in in public/, so the
// generator's "not in public/" warning is left for real mistakes.
function addStandIns(text, dir) {
  for (const [, path] of text.matchAll(
    /(?:\]\(|src="|poster="|image:\s*|url\()\/(?!\/)([\w./-]+\.\w+)/g,
  )) {
    mkdirSync(dirname(join(dir, 'public', path)), { recursive: true });
    writeFileSync(join(dir, 'public', path), '');
  }
}

work = mkdtempSync(join(tmpdir(), 'slide-ng-skill-samples-'));
const dirOf = (n) => join(work, 'samples', String(n + 1).padStart(3, '0'));
samples.forEach((s, n) => {
  s.dir = dirOf(n);
  s.entry = join(s.dir, 'slides.md');
  mkdirSync(s.dir, { recursive: true });
  writeFileSync(s.entry, s.text);
  for (const [path, text] of s.companions) {
    mkdirSync(dirname(join(s.dir, path)), { recursive: true });
    writeFileSync(join(s.dir, path), text);
  }
  addStandIns(s.text, s.dir);
});

// ---- 1. the generator, one deck per sample
const failures = [];
const queue = samples.map((_, n) => n);
await Promise.all(
  Array.from({ length: WORKERS }, async (_, w) => {
    const holder = join(work, `worker-${w}`, 'slides.md');
    mkdirSync(dirname(holder), { recursive: true });
    const appRoot = prepareApp(holder);
    while (queue.length) {
      const s = samples[queue.shift()];
      const r = await run(process.execPath, [join(repo, 'scripts/generate.mjs')], {
        cwd: appRoot,
        env: { SLIDES_FILE: s.entry },
      });
      const warnings = r.stderr.trim();
      if (r.code !== 0 || warnings) {
        failures.push(
          `${s.id} (line ${s.line}) did not generate cleanly:\n${indent(warnings || r.stdout)}`,
        );
      }
    }
  }),
);
if (failures.length) fail('Samples that do not generate:', failures);
console.log(`generated ${samples.length} samples without errors or warnings`);

// ---- 2. one build of everything
if (!has('--no-build')) {
  const ranges = await combine();
  for (const sample of samples) addStandIns(sample.text, join(work, 'combined'));
  const built = await run(
    process.execPath,
    [join(repo, 'bin/slide-ng.mjs'), 'build', 'slides.md', '--out', 'dist'],
    { cwd: join(work, 'combined') },
  );
  const noise = `${built.stdout}\n${built.stderr}`
    .split('\n')
    .filter((l) => /^\[slides\]/.test(l) && !/generated \d+ slides?/.test(l));
  if (built.code !== 0 || noise.length) {
    // The escape character is the point of the pattern (colours in the output).
    // eslint-disable-next-line no-control-regex
    const text = `${built.stdout}\n${built.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
    const lines = text.trim().split('\n');
    // The error blocks of Angular (and our own warnings) first, then the end of the output.
    const errors = lines.filter(
      (l) => /ERROR|^\[slides\]|slide-\d+\.ts|roots\//.test(l) && !/generated \d+ slides?/.test(l),
    );
    const tail = [...errors.slice(0, 40), '...', ...lines.slice(-15)].join('\n');
    fail('The combined deck does not build:', [
      tail,
      'Slides of each sample in the combined deck:\n' + ranges.map((r) => `  ${r}`).join('\n'),
    ]);
  }
  console.log(
    `built all samples together (${built.stdout.match(/Built (\d+) slides?/)?.[1] ?? '?'} slides)`,
  );
}

// ---- optional: every sample alone, with the real build
if (has('--each')) {
  for (const s of samples) {
    const r = await run(
      process.execPath,
      [join(repo, 'bin/slide-ng.mjs'), 'build', 'slides.md', '--out', 'dist'],
      { cwd: s.dir },
    );
    if (r.code !== 0)
      fail(`${s.id} does not build:`, [
        `${r.stdout}\n${r.stderr}`.trim().split('\n').slice(-40).join('\n'),
      ]);
    console.log(`built ${s.id}`);
  }
}

console.log(
  `OK: ${samples.length} samples verified (${fragments} fragments are not marked, on purpose).`,
);
if (!has('--keep')) rmSync(work, { recursive: true, force: true });
else console.log(`kept ${work}`);

// ---- helpers
/** Writes work/combined: a title slide, then every slide of every sample (their own first frontmatter becomes a slide's). */
async function combine() {
  const dir = join(work, 'combined');
  mkdirSync(dir, { recursive: true });
  // Deck-level keys that change what is generated or compiled: the theme and the addons (one for all the samples), the code
  // aliases and the custom element tags (joined).
  const deckKeys = {};
  const aliases = {};
  const customElements = [];
  for (const s of samples) {
    const head = (await parse(s.text, s.entry)).slides[0]?.frontmatter ?? {};
    Object.assign(aliases, head.codeAliases);
    if (head.customElements) customElements.push(...[head.customElements].flat());
    for (const key of ['theme', 'addons']) {
      if (!head[key] || head[key] === 'default') continue;
      const value = JSON.stringify(head[key]);
      if (deckKeys[key] && deckKeys[key] !== value)
        fail(`Two samples use a different ${key}:`, [`${deckKeys[key]} and ${value}`]);
      deckKeys[key] = value;
    }
  }
  const headmatter = yaml({
    title: 'Skill samples',
    ...Object.fromEntries(Object.entries(deckKeys).map(([k, v]) => [k, JSON.parse(v)])),
    ...(Object.keys(aliases).length ? { codeAliases: aliases } : {}),
    ...(customElements.length ? { customElements } : {}),
  });
  let out = `---\n${headmatter}---\n\n# Skill samples\n`;
  const ranges = [];
  let no = 1;
  const owner = new Map();
  for (const s of samples) {
    for (const [path, text] of s.companions) {
      if (owner.has(path) && owner.get(path).text !== text)
        fail('Two pages define different files with the same path:', [
          `${path}: ${owner.get(path).page} and ${s.page}`,
        ]);
      owner.set(path, { text, page: s.page });
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    const deck = await parse(s.text, s.entry);
    ranges.push(`${s.id}: slides ${no + 1}-${no + deck.slides.length}`);
    for (const slide of deck.slides) {
      no++;
      const fm = slide.frontmatter ?? {};
      out +=
        '\n---\n' +
        (Object.keys(fm).length ? `${yaml(fm)}---\n` : '') +
        `\n${slide.content.trim()}\n`;
      if (slide.note) out += `\n<!--\n${slide.note}\n-->\n`;
    }
  }
  writeFileSync(join(dir, 'slides.md'), out);
  return ranges;
}

function run(command, argv, { cwd, env = {} }) {
  return new Promise((done) => {
    const child = spawn(command, argv, { cwd, env: { ...process.env, ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => done({ code, stdout, stderr }));
  });
}

function indent(text) {
  return text
    .trim()
    .split('\n')
    .map((l) => `    ${l}`)
    .join('\n');
}

function fail(title, items) {
  console.error(`\n${title}`);
  for (const item of items) console.error(`\n  ${item}`);
  if (work) console.error(`\nTemporary files: ${work}`);
  process.exit(1);
}
