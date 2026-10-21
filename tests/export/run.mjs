// `npm run test:export`: runs the real command line (`bin/slide-ng.mjs`) on a small deck and checks what it writes.
// The deck is built once; the exports use `--dist`, so only the last test does a build of its own.
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { launch, reporter } from '../e2e/browser.mjs';
import { buildDeck } from '../../scripts/cli/runtime.mjs';

const t = reporter();
const bin = resolve('bin/slide-ng.mjs');
const deck = resolve('tests/e2e/phase4/slides.md');
const scratch = mkdtempSync(join(tmpdir(), 'slide-ng-export-'));
const env = {
  ...process.env,
  CHROME_PATH: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  // The tests run as root in containers, where Chromium cannot use its sandbox.
  SLIDE_NG_NO_SANDBOX: '1',
};

// Build once into dist/export-test (the folder is ours: it is created by this test and may be emptied by it).
let dist = resolve('dist/export-test');
if (!process.env.SKIP_BUILD) {
  try {
    dist = buildDeck({ entry: deck, workDir: dist.replace(/\/browser$/, ''), quiet: true });
  } finally {
    execFileSync(process.execPath, ['scripts/generate.mjs'], { stdio: 'ignore' });
  }
} else dist = join(dist, 'browser');

// Runs one command in its own empty folder. Returns that folder and what the command printed.
let counter = 0;
function slideNg(args, { entry = deck, cwd } = {}) {
  const dir = cwd ?? join(scratch, `run${++counter}`);
  mkdirSync(dir, { recursive: true });
  const out = execFileSync(
    process.execPath,
    [
      bin,
      ...args
        .split(' ')
        .filter(Boolean)
        .concat(entry ? [entry] : []),
    ],
    { cwd: dir, env, encoding: 'utf8', stdio: 'pipe' },
  );
  return { dir, out };
}
const common = `--dist ${dist}`;
const pdfInfo = (file) => execFileSync('pdfinfo', [file], { encoding: 'utf8' });
const pages = (file) => Number(/Pages:\s+(\d+)/.exec(pdfInfo(file))[1]);
const text = (file) => execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' });
// The links of a PDF, read back by qpdf: `page:dest` for a link inside the document (dest is a page number), `page:uri`
// for a web address. Pages count from 1.
const links = (file) => {
  const json = JSON.parse(execFileSync('qpdf', ['--json', file], { encoding: 'utf8' }));
  const value = (ref) => json.qpdf[1][`obj:${ref}`]?.value;
  const pageNo = (ref) => json.pages.findIndex((p) => p.object === ref) + 1;
  const catalog = Object.values(json.qpdf[1]).find((o) => o.value?.['/Type'] === '/Catalog');
  const dests = value(catalog.value['/Dests']) ?? {};
  return json.pages.flatMap((p, i) =>
    (value(p.object)['/Annots'] ?? [])
      .map(value)
      .filter((a) => a['/Subtype'] === '/Link')
      .map((a) =>
        a['/Dest']
          ? `${i + 1}:${pageNo(dests[a['/Dest']][0])}`
          : `${i + 1}:${String(a['/A']?.['/URI']).replace(/^u:/, '')}`,
      ),
  );
};
// Width and height from a PNG's header.
const pngSize = (file) => {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

// ---- pdf
let r = slideNg(`export ${common}`);
const pdf = join(r.dir, 'print-deck.pdf'); // the deck's exportFilename
t.ok(
  'export writes <exportFilename>.pdf in the current folder',
  existsSync(pdf),
  readdirSync(r.dir).join(),
);
t.ok('the pdf has one page per slide (8)', pages(pdf) === 8, String(pages(pdf)));
t.ok(
  'the pdf page is 980x552 css pixels (735x414 pt)',
  /Page size:\s+735(\.\d+)? x 41[34]/.test(pdfInfo(pdf)),
  pdfInfo(pdf).match(/Page size.*/)[0],
);
t.ok('the pdf title comes from the headmatter', /Title:\s+Print deck/.test(pdfInfo(pdf)));
t.ok('the pdf is tagged for screen readers', /Tagged:\s+yes/.test(pdfInfo(pdf)), pdfInfo(pdf));
t.ok(
  'the pdf has real text, including lazy Magic Move code',
  text(pdf).includes('Moving code') && text(pdf).includes('const'),
);
t.ok('the pdf has the click elements that are revealed late', text(pdf).includes('two'));
t.ok(
  'a markdown link to a slide points at its page in the pdf, a web page keeps its address, other links of the site are no links (not the temporary server)',
  links(pdf).join() === '8:2,8:https://example.org/',
  links(pdf).join(),
);

r = slideNg(`export ${common} --with-clicks --output clicks`);
t.ok(
  '--with-clicks makes a page for every click step (13)',
  pages(join(r.dir, 'clicks.pdf')) === 13,
  String(pages(join(r.dir, 'clicks.pdf'))),
);
t.ok(
  'with clicks a link to a slide points at the first page of that slide',
  links(join(r.dir, 'clicks.pdf')).join() === '13:2,13:https://example.org/',
  links(join(r.dir, 'clicks.pdf')).join(),
);

r = slideNg(`export ${common} --range 2,4-5 --output ranged`);
t.ok('--range 2,4-5 keeps three pages', pages(join(r.dir, 'ranged.pdf')) === 3);
r = slideNg(`export ${common} --range 2,4-5 --with-clicks --output ranged`);
t.ok(
  '--range with --with-clicks keeps the click pages of those slides (3+2+2)',
  pages(join(r.dir, 'ranged.pdf')) === 7,
  String(pages(join(r.dir, 'ranged.pdf'))),
);

r = slideNg(`export ${common} --per-slide --with-clicks --output per`);
t.ok(
  '--per-slide gives the same 13 pages',
  pages(join(r.dir, 'per.pdf')) === 13,
  String(pages(join(r.dir, 'per.pdf'))),
);

// ---- outline (--with-toc), read back by qpdf and by pdf-lib
r = slideNg(`export ${common} --with-toc --output toc`);
const outline = JSON.parse(
  execFileSync('qpdf', ['--json', '--json-key=outlines', join(r.dir, 'toc.pdf')], {
    encoding: 'utf8',
  }),
).outlines;
const titles = (list) => list.map((o) => [o.title, ...titles(o.kids ?? [])]).flat();
t.ok(
  '--with-toc writes an outline with the slide titles',
  titles(outline).join('|').includes('Clicks') && titles(outline).includes('A flowchart'),
  titles(outline).join('|'),
);
const nested = outline
  .find((o) => o.title === 'Clicks')
  ?.kids?.some((k) => k.title === 'A flowchart');
t.ok(
  'a title with a higher level is nested under the one before',
  Boolean(nested),
  JSON.stringify(outline.map((o) => [o.title, (o.kids ?? []).length])),
);
const flat = (list) => list.flatMap((o) => [o, ...flat(o.kids ?? [])]);
const dest = Object.fromEntries(flat(outline).map((o) => [o.title, o.destpageposfrom1]));
t.ok(
  'the outline links to the right pages',
  dest['Print deck'] === 1 &&
    dest['Clicks'] === 2 &&
    dest['Moving code'] === 4 &&
    dest['The end'] === 8,
  JSON.stringify(dest),
);

r = slideNg(`export ${common} --with-clicks --with-toc --output toc2`);
const dest2 = Object.fromEntries(
  flat(
    JSON.parse(
      execFileSync('qpdf', ['--json', '--json-key=outlines', join(r.dir, 'toc2.pdf')], {
        encoding: 'utf8',
      }),
    ).outlines,
  ).map((o) => [o.title, o.destpageposfrom1]),
);
t.ok(
  'with clicks the outline points at the first page of each slide',
  dest2['Clicks'] === 2 && dest2['Moving code'] === 6 && dest2['The end'] === 13,
  JSON.stringify(dest2),
);

// ---- png
r = slideNg(`export ${common} --format png --output shots --scale 1`);
const shots = readdirSync(join(r.dir, 'shots'));
t.ok(
  'png: one file per slide, numbered',
  shots.length === 8 && shots[0] === '001.png' && shots[7] === '008.png',
  shots.join(),
);
t.ok(
  'png: size is the canvas at scale 1',
  pngSize(join(r.dir, 'shots', '001.png')).join('x') === '980x552',
  pngSize(join(r.dir, 'shots', '001.png')).join('x'),
);
r = slideNg(`export ${common} --format png --output shots2 --with-clicks`);
const shots2 = readdirSync(join(r.dir, 'shots2'));
t.ok(
  'png --with-clicks: one file per click step named by its id',
  shots2.length === 13 && shots2.includes('002-03.png'),
  shots2.join(),
);
t.ok(
  'png: default scale is 2',
  pngSize(join(r.dir, 'shots2', '001-01.png')).join('x') === '1960x1104',
); // 980x552 at scale 2

// The colour of a pixel in a PNG file, read back by a browser.
const browser = await launch();
async function pixel(file, x = 3, y = 3) {
  const page = await browser.newPage();
  await page.setContent(
    `<img src="data:image/png;base64,${readFileSync(file).toString('base64')}">`,
  );
  const rgba = await page.evaluate(
    async ([px, py]) => {
      const img = document.querySelector('img');
      await img.decode();
      const c = Object.assign(document.createElement('canvas'), {
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      c.getContext('2d').drawImage(img, 0, 0);
      return [...c.getContext('2d').getImageData(px, py, 1, 1).data];
    },
    [x, y],
  );
  await page.close();
  return rgba;
}
slideNg(`export ${common} --format png --output light --scale 1 --range 8`);
slideNg(`export ${common} --format png --output dark --scale 1 --range 8 --dark`);
slideNg(`export ${common} --format png --output clear --scale 1 --range 8 --omit-background`);
const [light, dark, clear] = [
  await pixel(join(scratch, `run${counter - 2}`, 'light', '008.png')),
  await pixel(join(scratch, `run${counter - 1}`, 'dark', '008.png')),
  await pixel(join(scratch, `run${counter}`, 'clear', '008.png')),
];
t.ok('png: light background is white', light.join() === '255,255,255,255', light.join());
t.ok('png --dark: dark background', dark[0] < 40 && dark[3] === 255, dark.join());
t.ok('png --omit-background: transparent background', clear[3] === 0, clear.join());
await browser.close();

// ---- md and pptx
r = slideNg(`export ${common} --format md --output notes-deck --range 1-2`);
const md = readFileSync(join(r.dir, 'notes-deck.md'), 'utf8');
t.ok(
  'md: pictures and notes, slides separated by ---',
  md.includes('![Print deck](./notes-deck-images/001.png)') &&
    md.includes('note one') &&
    md.includes('\n---\n'),
  md,
);
t.ok(
  'md: the pictures are written next to it',
  readdirSync(join(r.dir, 'notes-deck-images')).join() === '001.png,002.png',
);

r = slideNg(`export ${common} --format pptx --output deck`);
const names = execFileSync('unzip', ['-Z1', join(r.dir, 'deck.pptx')], { encoding: 'utf8' }).split(
  '\n',
);
t.ok(
  'pptx: one slide per click step by default (13)',
  names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length === 13,
  String(names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length),
);
t.ok(
  'pptx: has notes slides for slides with notes',
  names.some((n) => n.startsWith('ppt/notesSlides/')),
);
r = slideNg(`export ${common} --format pptx --output deck --no-with-clicks`);
t.ok(
  'pptx --no-with-clicks: one slide per slide (8)',
  execFileSync('unzip', ['-Z1', join(r.dir, 'deck.pptx')], { encoding: 'utf8' })
    .split('\n')
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length === 8,
);

// ---- notes
r = slideNg(`export-notes ${common}`);
const notes = join(r.dir, 'print-deck-notes.pdf');
t.ok(
  'export-notes writes <name>-notes.pdf with the notes text',
  existsSync(notes) && text(notes).includes('note one') && text(notes).includes('with a click'),
  readdirSync(r.dir).join(),
);
t.ok('the notes pdf is A4', /Page size:\s+59[45].* x 841/.test(pdfInfo(notes)));

// ---- a bad range is an error, not an empty file
let failed = '';
try {
  slideNg(`export ${common} --range 50`);
} catch (e) {
  failed = String(e.stderr);
}
t.ok(
  'a range that matches nothing fails with a message',
  failed.includes('matches no slide'),
  failed,
);

// ---- security: the headmatter can not choose where the file goes
const evilDir = join(scratch, 'evil');
mkdirSync(join(evilDir, 'inner'), { recursive: true });
const evilDeck = join(evilDir, 'inner', 'slides.md');
writeFileSync(
  evilDeck,
  readFileSync(deck, 'utf8').replace(
    'exportFilename: print-deck',
    'exportFilename: ../../../escaped',
  ),
);
slideNg(`export ${common}`, { entry: evilDeck, cwd: join(evilDir, 'inner') });
t.ok(
  'exportFilename "../../../escaped" stays in the current folder',
  existsSync(join(evilDir, 'inner', 'escaped.pdf')) &&
    !existsSync(join(scratch, 'escaped.pdf')) &&
    !existsSync(join(evilDir, 'escaped.pdf')),
  readdirSync(join(evilDir, 'inner')).join(),
);
const hostile = readFileSync(deck, 'utf8').replace(
  'exportFilename: print-deck',
  `exportFilename: ${JSON.stringify('/etc/cron.d/x')}\nexport:\n  executablePath: /bin/false\n  output: /tmp/hacked`,
);
writeFileSync(evilDeck, hostile);
slideNg(`export ${common}`, { entry: evilDeck, cwd: join(evilDir, 'inner') });
t.ok(
  'an absolute exportFilename is flattened, executablePath and output in the headmatter are ignored',
  existsSync(join(evilDir, 'inner', 'etc-cron.d-x.pdf')) && !existsSync('/tmp/hacked.pdf'),
  readdirSync(join(evilDir, 'inner')).join(),
);
slideNg(`export ${common} --format png`, { entry: evilDeck, cwd: join(evilDir, 'inner') });
const before = readdirSync(join(evilDir, 'inner')).length;
t.ok(
  'png export into a folder never deletes what is already there',
  existsSync(join(evilDir, 'inner', 'slides.md')) && before > 2,
);

// ---- the whole flow without --dist: build, serve, export (the starter deck, so it is quick)
r = slideNg('export --with-toc --output starter', { entry: resolve('slides.md') });
t.ok(
  'without --dist the command builds the deck itself and leaves no build folder behind',
  pages(join(r.dir, 'starter.pdf')) === 10 && !existsSync(resolve('.slide-ng/export-build')),
  String(pages(join(r.dir, 'starter.pdf'))),
);
execFileSync(process.execPath, ['scripts/generate.mjs'], { stdio: 'ignore' });

// ---- a Mermaid diagram taller than the slide is clipped in the PDF, like on screen, not lost
const tallDir = join(scratch, 'tall');
mkdirSync(tallDir, { recursive: true });
writeFileSync(
  join(tallDir, 'slides.md'),
  `# Tall\n\n\`\`\`mermaid\nflowchart TD\n${[
    'Alpha',
    'Bravo',
    'Charlie',
    'Delta',
    'Echo',
    'Foxtrot',
    'Golf',
  ]
    .map((n, i, all) => (i ? `  ${all[i - 1]}step --> ${n}step` : ''))
    .filter(Boolean)
    .join('\n')}\n\`\`\`\n\n---\n\n# After\n`,
);
r = slideNg('export --output tall.pdf', { entry: join(tallDir, 'slides.md') });
const tallText = text(join(r.dir, 'tall.pdf'));
t.ok(
  'a diagram taller than the slide is still in the PDF (its top part)',
  tallText.includes('Alphastep') && tallText.includes('Bravostep'),
  tallText.replace(/\s+/g, ' ').slice(0, 120),
);

process.exit(t.done());
