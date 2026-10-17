#!/usr/bin/env node
// The command line of slide.ng. `slide-ng [slides.md]` starts the dev server; the other commands are listed in HELP.
import { readFileSync } from 'node:fs';
import { pickCommand } from '../scripts/cli/pick-command.mjs';

// Each command lives in scripts/cli/ and is loaded only when it is used, so `slide-ng --help` is instant.

const HELP = `slide-ng: slides from markdown

Usage: slide-ng [command] [slides.md] [flags]      (slide-ng --version prints the version)

Commands:
  dev (default)   start the dev server       --port --open --remote[=password] --bind --log --force
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
    console.log(HELP);
  else if (!COMMANDS[command])
    throw new Error(`Unknown command "${command}". Run slide-ng --help for the list.`);
  else await COMMANDS[command](args);
} catch (error) {
  console.error(`slide-ng: ${error.message}`);
  process.exitCode = 1;
}
