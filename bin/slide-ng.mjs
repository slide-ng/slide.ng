#!/usr/bin/env node
// The command line of slide.ng. `slide-ng [slides.md]` starts the dev server; the other commands are listed in HELP.
import { readFileSync } from 'node:fs';
import { pickCommand } from '../scripts/cli/pick-command.mjs';
import { didYouMean } from '../scripts/lib/did-you-mean.mjs';

// Each command lives in scripts/cli/ and is loaded only when it is used, so `slide-ng --help` is instant.

const HELP = `slide-ng: slides from markdown

Usage: slide-ng [command] [slides.md] [flags]      (slide-ng --version prints the version)

Commands:
  dev (default)   start the dev server       --port --open --remote[=password] --bind --theme --lang --log --force
  build           make a static site          --base --out --download --without-notes --offline --theme ...
  export          make a PDF, PNG, PPTX or Markdown file    --format --output --range --with-clicks --dark --scale ...
  export-notes    make a PDF of the speaker notes
  format          tidy slides.md
  theme eject     copy the theme into the deck's folder to edit it
  mcp             start the MCP server on stdio (read and edit slides with a tool client)
  create <dir>    start a new deck in <dir>
  skills install  copy the agent skill into .agents/skills/slide-ng      --dir --force

Every flag is described in docs/CLI.md (https://github.com/slide-ng/slide.ng/blob/main/docs/CLI.md).
`;

// `slide-ng <command> --help`: that command's flags (all of them are described in docs/CLI.md).
const COMMAND_HELP = {
  dev: `slide-ng dev [slides.md]  start the dev server
  --port, -p <n>        port (default 4230)
  --open, -o            open the browser
  --remote[=password]   listen on the network; always with a password
  --bind <address>      the address to listen on with --remote (default 0.0.0.0)
  --log <level>         error, warn, info (default) or silent
  --force, -f           clear the Angular build cache first
  --theme, -t <name>    use this theme instead of the headmatter's
  --lang <tag>          use this language instead of the headmatter's lang`,
  build: `slide-ng build [slides.md ...]  make a static site (several decks: one folder each in --out)
  --out, -o <dir>       output folder (default dist)
  --base </path/>       the path the site is served from
  --offline             a folder that opens from disk (not with --base)
  --download            also make the PDF and offer it in the bar
  --without-notes       leave the speaker notes out
  --router-mode <mode>  history, hash or memory, instead of the headmatter's routerMode
  --theme, -t <name>    use this theme instead of the headmatter's
  --lang <tag>          use this language instead of the headmatter's lang
  --executable-path, --no-sandbox, --allow-local, --timeout   Chromium for the PDF and the Open Graph picture`,
  export: `slide-ng export [slides.md ...]  make a PDF, PNG, PPTX or Markdown file (one per deck)
  --format <f>          pdf (default), png, pptx or md
  --output, -o <file>   the file (a folder for png); one deck only
  --range <1,3-5>       slides to export
  --with-clicks, -c     one page per click step
  --dark                dark mode
  --per-slide, --with-toc, --scale <n>, --omit-background
  --timeout <ms>, --wait <ms>, --wait-until <state>
  --dist <dir> | --url <address>   export a build or a running server instead of building; one deck only
  --base, --theme, -t, --lang, --executable-path, --no-sandbox, --allow-local`,
  'export-notes': `slide-ng export-notes [slides.md ...]  make a PDF of the speaker notes (one per deck)
  --output, -o <file>, --range <1,3-5>, and the Chromium flags of export`,
  format: 'slide-ng format [slides.md ...]  tidy the markdown files in place',
  theme: `slide-ng theme eject [slides.md]  copy the theme into the deck's folder
  --dir <name>          the folder (default theme)
  --theme <name>        eject this theme instead of the headmatter's`,
  create: `slide-ng create <dir>  start a new deck
  --force, -f           add the missing files to a folder that is not empty`,
  mcp: 'slide-ng mcp [slides.md]  start the MCP server on stdio',
  skills: `slide-ng skills install  copy the agent skill into the project
  --dir <folder>        where (default .agents/skills)
  --force, -f           replace an existing copy`,
};

const COMMANDS = {
  dev: async (args) => (await import('../scripts/cli/dev.mjs')).devCommand(args),
  build: async (args) => (await import('../scripts/cli/build.mjs')).buildCommand(args),
  export: async (args) => (await import('../scripts/cli/export.mjs')).exportCommand(args),
  'export-notes': async (args) =>
    (await import('../scripts/cli/export.mjs')).exportCommand(args, { notes: true }),
  format: async (args) => (await import('../scripts/cli/format.mjs')).formatCommand(args),
  theme: async (args) => (await import('../scripts/cli/theme.mjs')).themeCommand(args),
  mcp: async (args) => (await import('../scripts/mcp/index.mjs')).mcpCommand(args),
  create: async (args) => (await import('../scripts/cli/create.mjs')).createCommand(args),
  skills: async (args) => (await import('../scripts/cli/skills.mjs')).skillsCommand(args),
};

// Commands of other tools that people try, and what to run here instead.
const OTHER_NAMES = {
  present: 'To present, run slide-ng dev (or open a build) and open /presenter in the browser.',
  serve:
    'Did you mean "dev" (the dev server), or "build" and any static server for the built site?',
  start: 'Did you mean "dev"?',
  pdf: 'Did you mean "export" (a PDF by default)?',
};

const [command, args] = pickCommand(process.argv.slice(2));
try {
  if (process.argv[2] === '--version' || process.argv[2] === '-v') {
    const pkg = new URL('../package.json', import.meta.url);
    console.log(JSON.parse(readFileSync(pkg, 'utf8')).version);
  } else if (
    command === 'help' ||
    args.includes('--help') ||
    args.includes('-h') ||
    process.argv[2] === '--help'
  )
    console.log(
      COMMAND_HELP[command] && process.argv[2] === command
        ? `${COMMAND_HELP[command]}\n\nEvery flag is described in docs/CLI.md.`
        : HELP,
    );
  else if (!COMMANDS[command])
    throw new Error(
      `Unknown command "${command}".${didYouMean(command, Object.keys(COMMANDS)) || (OTHER_NAMES[command] ? ` ${OTHER_NAMES[command]}` : '')} Run slide-ng --help for the list.`,
    );
  else await COMMANDS[command](args);
} catch (error) {
  // A child that has already printed its own message (the generator) is not repeated.
  if (!error.reported) console.error(`slide-ng: ${error.message}`);
  process.exitCode = 1;
}
