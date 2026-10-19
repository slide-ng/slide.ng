// The flags of `slide-ng export` (Slidev's names), and how the final options are chosen:
// command line first, then the headmatter's `export:` block, then the defaults.
export const EXPORT_FLAGS = {
  format: { type: 'string' },
  output: { type: 'string', alias: 'o' },
  range: { type: 'string' },
  'with-clicks': { type: 'boolean', alias: 'c' },
  dark: { type: 'boolean' },
  timeout: { type: 'number' },
  wait: { type: 'number' },
  'wait-until': { type: 'string' },
  'executable-path': { type: 'string' },
  'no-sandbox': { type: 'boolean' }, // keep Chromium's sandbox off: for containers and root, trusted decks only
  'allow-local': { type: 'boolean' }, // let the page reach loopback and private addresses (otherwise blocked)
  'per-slide': { type: 'boolean' },
  scale: { type: 'number' },
  'omit-background': { type: 'boolean' },
  'with-toc': { type: 'boolean' },
  dist: { type: 'string' }, // export an existing build instead of building first
  url: { type: 'string' }, // export a running server (the dev server) instead
  base: { type: 'string' },
  theme: { type: 'string', alias: 't' },
  lang: { type: 'string' },
};

export const FORMATS = ['pdf', 'png', 'pptx', 'md'];
const WAIT_UNTIL = ['networkidle', 'load', 'domcontentloaded', 'none'];

// Keys the headmatter may set. `executablePath` and `output` are left out on purpose: a deck can come from
// someone else, and it must not choose which program runs or where files go (see filename.mjs).
const FROM_HEADMATTER = [
  'format',
  'range',
  'withClicks',
  'dark',
  'timeout',
  'wait',
  'waitUntil',
  'withToc',
  'perSlide',
  'scale',
  'omitBackground',
];

const camel = (name) => name.replace(/-(\w)/g, (_, c) => c.toUpperCase());

function check(name, ok, message) {
  if (!ok) throw new Error(`export: ${message}`);
}

/** `flags` are the parsed command line (kebab-case keys), `headmatter` the deck's headmatter. */
export function resolveExportOptions(flags, headmatter = {}) {
  const fromDeck = Object.fromEntries(
    Object.entries(headmatter.export ?? {}).filter(([k]) => FROM_HEADMATTER.includes(k)),
  );
  const fromCli = Object.fromEntries(Object.entries(flags).map(([k, v]) => [camel(k), v]));
  const o = { ...fromDeck, ...fromCli };

  const format = o.format ?? 'pdf';
  check(
    'format',
    FORMATS.includes(format),
    `format must be one of ${FORMATS.join(', ')}, got "${format}"`,
  );
  const waitUntil = o.waitUntil ?? 'networkidle';
  check(
    'wait-until',
    WAIT_UNTIL.includes(waitUntil),
    `wait-until must be one of ${WAIT_UNTIL.join(', ')}`,
  );
  const timeout = o.timeout ?? 30000;
  check(
    'timeout',
    timeout >= 1000 && timeout <= 600000,
    'timeout is in milliseconds, between 1000 and 600000',
  );
  const wait = o.wait ?? 0;
  check('wait', wait >= 0 && wait <= 120000, 'wait is in milliseconds, between 0 and 120000');
  const scale = o.scale ?? 2;
  check('scale', scale >= 0.25 && scale <= 8, 'scale must be between 0.25 and 8');

  return {
    format,
    output: flags.output, // CLI only
    range: typeof o.range === 'string' || typeof o.range === 'number' ? String(o.range) : undefined,
    // Slides in a pptx are one per click step, like Slidev.
    withClicks: o.withClicks ?? format === 'pptx',
    dark: Boolean(o.dark) || headmatter.colorSchema === 'dark',
    timeout,
    wait,
    waitUntil: waitUntil === 'none' ? undefined : waitUntil,
    executablePath: flags['executable-path'] ?? process.env.CHROME_PATH, // CLI or environment only
    noSandbox: Boolean(flags['no-sandbox']), // CLI only (SLIDE_NG_NO_SANDBOX=1 is read where Chromium starts)
    allowLocal: Boolean(flags['allow-local']), // CLI only
    perSlide: Boolean(o.perSlide),
    scale,
    omitBackground: Boolean(o.omitBackground),
    withToc: Boolean(o.withToc),
  };
}
