import { resolve } from 'node:path';
import { didYouMean } from '../lib/did-you-mean.mjs';

// A small command line reader, so every command parses flags the same way.
//   spec = { port: { type: 'number', alias: 'p' }, open: { type: 'boolean' }, format: { type: 'string' } }
// Types: string, number, boolean, and `optional` (`--remote` is true, `--remote=secret` is the text; it never takes the next argument).
// Accepts `--port 3030`, `--port=3030`, `-p 3030`, `--open`, `--no-open` (false), and `--` (the rest is positional).
// An unknown flag is an error, so a typo is never silently ignored.
export function parseFlags(argv, spec) {
  const flags = {};
  const positionals = [];
  const byAlias = Object.fromEntries(
    Object.entries(spec).flatMap(([name, s]) => (s.alias ? [[s.alias, name]] : [])),
  );

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (!arg.startsWith('-') || arg === '-') {
      positionals.push(arg);
      continue;
    }

    let name, inline;
    if (arg.startsWith('--')) {
      [name, inline] = splitOnce(arg.slice(2), '=');
      if (name.startsWith('no-') && spec[name.slice(3)]?.type === 'boolean') {
        flags[name.slice(3)] = false;
        continue;
      }
    } else {
      name = byAlias[arg.slice(1)];
      if (!name) throw new Error(`Unknown flag ${arg}`);
    }
    const s = spec[name];
    if (!s)
      throw new Error(
        `Unknown flag --${name}.${didYouMean(name, Object.keys(spec), (n) => `--${n}`)}`,
      );

    if (s.type === 'boolean') {
      flags[name] = inline === undefined ? true : !['false', '0', 'no'].includes(inline);
      continue;
    }
    if (s.type === 'optional') {
      flags[name] = inline === undefined ? true : inline;
      continue;
    }
    // A value flag takes `=value` or the next argument, unless that is another flag (`--out --base /x/` forgot the folder);
    // a value that starts with `--` is written `--name=--value`.
    const value = inline ?? (argv[i + 1]?.startsWith('--') ? undefined : argv[++i]);
    if (value === undefined) throw new Error(`--${name} needs a value`);
    flags[name] = s.type === 'number' ? toNumber(name, value) : value;
  }
  return { flags, positionals };
}

/** `--theme name|path` overrides the headmatter's theme for this run. The generator (a child process) reads the same variable. */
export function applyThemeFlag(flags) {
  // A path given on the command line is relative to where the command runs, not to the deck.
  if (flags.theme)
    process.env.SLIDE_NG_THEME = flags.theme.startsWith('.') ? resolve(flags.theme) : flags.theme;
}

function splitOnce(text, sep) {
  const at = text.indexOf(sep);
  return at < 0 ? [text, undefined] : [text.slice(0, at), text.slice(at + 1)];
}

function toNumber(name, value) {
  const n = Number(value);
  if (value === '' || !Number.isFinite(n))
    throw new Error(`--${name} must be a number, got "${value}"`);
  return n;
}
