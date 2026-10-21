// The `dev` command (the default one): generate the slides, then keep three things running:
//   1. the generator in watch mode (slides.md -> components, class names -> CSS file)
//   2. the companion server (scripts/dev/server.mjs): writes slides.md and drawings, passes sync messages
//   3. the Angular dev server, which sends `/__slide-ng/*` to the companion (proxy.conf.mjs)
//   slide-ng [dev] [slides.md] [--port 4230] [--open] [--remote[=password]] [--bind 0.0.0.0] [--log info] [--force]
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { hostname, networkInterfaces } from 'node:os';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';
import { removeInside } from '../lib/tool-dir.mjs';
import { randomPassword, randomSecret } from '../dev/config.mjs';
import { ngBinary, prepareApp } from './app-root.mjs';
import { applyLangFlag, applyThemeFlag, parseFlags } from './flags.mjs';
import { packageRoot } from './package-root.mjs';
import { askPassword } from './prompt.mjs';
import { remoteLines } from './remote-info.mjs';
import { withSlideSources } from './runtime.mjs';
import { watchChildren } from './watch-children.mjs';

export const DEV_FLAGS = {
  port: { type: 'number', alias: 'p' },
  open: { type: 'boolean', alias: 'o' },
  remote: { type: 'optional' },
  bind: { type: 'string' },
  log: { type: 'string' },
  force: { type: 'boolean', alias: 'f' },
  tunnel: { type: 'optional' },
  base: { type: 'string' },
  theme: { type: 'string', alias: 't' },
  lang: { type: 'string' },
};

const LOG_LEVELS = ['error', 'warn', 'info', 'silent'];

/** Checks the flags and returns the plan for the three processes. Pure, so it can be tested without starting anything. */
export function devPlan(argv, env = process.env) {
  const { flags, positionals } = parseFlags(argv, DEV_FLAGS);
  if (flags.tunnel)
    throw new Error(
      '--tunnel is not available (it needs a tunnel service; use --remote on your network instead)',
    );
  if (flags.base)
    throw new Error('--base is for `slide-ng build`; the dev server always runs at /');
  const log = flags.log ?? 'info';
  if (!LOG_LEVELS.includes(log))
    throw new Error(`--log must be one of ${LOG_LEVELS.join(', ')}, got "${log}"`);
  // `--remote` listens on every address and always has a password (unlike Slidev, where it is optional): `--remote=secret`,
  // else SLIDE_NG_PASSWORD, else (a prompt on a terminal, see devCommand, or) a random one that is printed. `--bind` only matters with --remote.
  const remote = flags.remote !== undefined && flags.remote !== false;
  let password = '';
  let passwordFrom = '';
  if (remote && typeof flags.remote === 'string' && flags.remote) {
    password = flags.remote;
    passwordFrom = 'argv';
  } else if (remote && env.SLIDE_NG_PASSWORD) {
    password = env.SLIDE_NG_PASSWORD;
    passwordFrom = 'env';
  } else if (remote) {
    password = randomPassword();
    passwordFrom = 'random';
  }
  const host = remote ? (flags.bind ?? '0.0.0.0') : undefined;
  // SLIDES_FILE is how tests (and older scripts) pick another deck.
  const entry = resolve(positionals[0] ?? process.env.SLIDES_FILE ?? 'slides.md');
  return {
    entry,
    port: flags.port ?? 4230,
    open: Boolean(flags.open),
    remote,
    password,
    passwordFrom,
    passwordGenerated: passwordFrom === 'random',
    host,
    log,
    force: Boolean(flags.force),
    theme: flags.theme,
    lang: flags.lang,
  };
}

// A free port for the companion server (it only listens on this machine).
const freePort = () =>
  new Promise((done) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => done(port));
    });
  });

export async function devCommand(argv) {
  const plan = devPlan(argv);
  // On a terminal, ask for the password (Enter keeps the random one), so it never has to be in the command line.
  if (plan.remote && plan.passwordGenerated && process.stdin.isTTY) {
    const typed = await askPassword('[slide.ng] remote password (Enter for a random one): ');
    if (typed)
      Object.assign(plan, { password: typed, passwordFrom: 'prompt', passwordGenerated: false });
  }
  applyThemeFlag(plan);
  applyLangFlag(plan);
  const appRoot = prepareApp(plan.entry);
  if (plan.force) removeInside(join(appRoot, '.angular', 'cache'), appRoot); // the build cache is the only thing --force clears
  const companionPort = process.env.SLIDE_NG_DEV_PORT || String(await freePort());

  const env = {
    ...process.env,
    SLIDES_FILE: plan.entry,
    SLIDE_NG_DEV_PORT: companionPort,
    SLIDE_NG_DEV: '1',
    SLIDE_NG_TOKEN: randomSecret(),
    SLIDE_NG_REMOTE: plan.remote ? '1' : '0',
    SLIDE_NG_PASSWORD: plan.password,
    SLIDE_NG_HOSTNAMES: plan.remote ? [hostname(), `${hostname()}.local`].join(',') : '',
  };
  const generate = join(packageRoot, 'scripts/generate.mjs');
  const first = spawnSync(process.execPath, [generate], { cwd: appRoot, env, stdio: 'inherit' });
  if (first.status !== 0) throw new Error('generating the slides failed');

  // With --log error or silent the children's normal output is dropped; their errors still show.
  const quiet = plan.log === 'error' || plan.log === 'silent';
  const stdio = quiet ? ['ignore', 'ignore', 'inherit'] : 'inherit';
  const ngArgs = [ngBinary(), 'serve', '--port', String(plan.port)];
  if (plan.host) ngArgs.push('--host', plan.host);
  if (plan.open) ngArgs.push('--open');
  const children = [
    spawn(process.execPath, [generate, '--watch'], { cwd: appRoot, env, stdio }),
    spawn(process.execPath, [join(packageRoot, 'scripts/dev/server.mjs')], {
      cwd: appRoot,
      env,
      stdio,
    }),
    angularServer(ngArgs, { appRoot, env, quiet }),
  ];
  const stopAll = () => children.forEach((c) => c.kill());
  watchChildren(
    [
      { name: 'the slide generator', child: children[0] },
      { name: 'the companion server', child: children[1] },
      { name: 'the Angular dev server', child: children[2] },
    ],
    (code) => process.exit(code),
  );
  for (const sig of ['SIGINT', 'SIGTERM'])
    process.on(sig, () => {
      stopAll();
      process.exit(0);
    });

  if (plan.remote) {
    // With --bind to one address, that is the only one that answers; list the others only for 0.0.0.0.
    const addresses =
      plan.host && plan.host !== '0.0.0.0'
        ? [plan.host]
        : Object.values(networkInterfaces())
            .flat()
            .filter((i) => i && i.family === 'IPv4' && !i.internal)
            .map((i) => i.address);
    console.log(
      remoteLines({
        port: plan.port,
        password: plan.password,
        generated: plan.passwordGenerated,
        fromArgv: plan.passwordFrom === 'argv',
        addresses,
      }).join('\n'),
    );
  }
}

// The Angular dev server, with its errors pointing at the deck's files (slides.md line, the author's own components/ file)
// instead of the generated copies, as the build does (runtime.mjs). Its colours stay when the terminal has them.
function angularServer(ngArgs, { appRoot, env, quiet }) {
  const child = spawn(process.execPath, ngArgs, {
    cwd: appRoot,
    env: process.stdout.isTTY ? { ...env, FORCE_COLOR: '1' } : env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const relay = (from, to) =>
    createInterface({ input: from }).on('line', (line) =>
      to.write(`${withSlideSources(line, appRoot)}\n`),
    );
  if (!quiet) relay(child.stdout, process.stdout);
  else child.stdout.resume();
  relay(child.stderr, process.stderr);
  return child;
}
