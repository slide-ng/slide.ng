// The `dev` command (the default one): generate the slides, then keep three things running:
//   1. the generator in watch mode (slides.md -> components, class names -> CSS file)
//   2. the companion server (scripts/dev/server.mjs): writes slides.md and drawings, passes sync messages
//   3. the Angular dev server, which sends `/__slide-ng/*` to the companion (proxy.conf.mjs)
//   slide-ng [dev] [slides.md] [--port 4230] [--open] [--remote[=password]] [--bind 0.0.0.0] [--log info] [--force]
// On a terminal it also reads keys: r restart, o open, e edit, q quit, c QR code (dev-keys.mjs).
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { hostname, networkInterfaces } from 'node:os';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { parse } from 'yaml';
import { mergeHeadmatter, resolveRoots } from '../lib/roots.mjs';
import { checkToolDir, removeInside } from '../lib/tool-dir.mjs';
import { randomPassword, randomSecret } from '../dev/config.mjs';
import { startWaitingPage } from '../dev/waiting-page.mjs';
import { ngBinary, prepareApp } from './app-root.mjs';
import { checkPortFree, takeDevLock } from './dev-lock.mjs';
import { applyLangFlag, applyThemeFlag, parseFlags } from './flags.mjs';
import { packageRoot } from './package-root.mjs';
import { askPassword } from './prompt.mjs';
import { editorCommand, keyHint, listenForKeys, openCommand, startProgram } from './dev-keys.mjs';
import { remoteLines, remoteQrLines } from './remote-info.mjs';
import { angularOutput, withSlideSources } from './runtime.mjs';
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

// The `routerMode` of the deck, read when the remote addresses are printed: a hash deck has its route after `/#/`. It is the
// entry's headmatter over that of its theme (`theme.json`, also a `--theme`) and addons, as the generator merges them; no imports
// and no setup code are read. A missing file, invalid YAML or a root that is not found is taken as the default, history.
export function deckRouterMode(entry, themeOverride = process.env.SLIDE_NG_THEME || undefined) {
  try {
    const head = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(entry, 'utf8'))?.[1];
    const headmatter = (head && parse(head)) || {};
    const roots = resolveRoots({ deckRoot: dirname(entry), headmatter, themeOverride });
    return mergeHeadmatter(roots, headmatter).routerMode === 'hash' ? 'hash' : 'history';
  } catch {
    return 'history';
  }
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
  // One deck runs one dev server: both are checked before anything is asked or written (see dev-lock.mjs).
  takeDevLock(checkToolDir(dirname(plan.entry)), plan.port);
  await checkPortFree(plan.port, plan.host);
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
  // The generator has printed why (bin/slide-ng.mjs adds no second line for a `reported` error).
  if (first.status !== 0)
    throw Object.assign(new Error('generating the slides failed'), {
      reported: first.status === 1,
    });

  // With --log error or silent the children's normal output is dropped; their errors still show.
  const quiet = plan.log === 'error' || plan.log === 'silent';
  // No stdin for them: the terminal's keys are read here (dev-keys.mjs).
  const stdio = quiet ? ['ignore', 'ignore', 'inherit'] : ['ignore', 'inherit', 'inherit'];
  // The three processes; `r` in the terminal stops them and starts them again (watchChildren is told first, so the
  // stop does not end the command).
  let running;
  const startAll = (restart = false) => {
    // The companion gets the Angular build errors over IPC, for a page that is opened or reloaded while one stands.
    const companion = spawn(process.execPath, [join(packageRoot, 'scripts/dev/server.mjs')], {
      cwd: appRoot,
      env,
      stdio: [...stdio, 'ipc'],
    });
    const tellCompanion = (message) => {
      if (companion.connected) companion.send(message, () => {});
    };
    // Until its first good build the Angular server does not listen: a page on the port says why meanwhile.
    const secret = randomSecret();
    let waiting = null;
    let served = false;
    const onBuild = ({ ok, error }) => {
      if (ok) {
        served = true;
        waiting?.close();
        tellCompanion({ buildError: null });
        return;
      }
      if (!served && !waiting)
        waiting = startWaitingPage({
          port: plan.port,
          host: plan.host,
          remote: plan.remote,
          secret,
          onRelease: () => (served = true),
        });
      if (error) {
        waiting?.show(error);
        tellCompanion({ buildError: error });
      }
    };
    const children = [
      spawn(process.execPath, [generate, '--watch'], { cwd: appRoot, env, stdio }),
      companion,
      angularServer([ngBinary(), ...ngServeArgs(plan, restart)], {
        appRoot,
        env: { ...env, SLIDE_NG_WAIT_PORT: String(plan.port), SLIDE_NG_WAIT_SECRET: secret },
        quiet,
        onBuild,
      }),
    ];
    children[2].once('exit', () => waiting?.close());
    const watcher = watchChildren(
      [
        { name: 'the slide generator', child: children[0] },
        { name: 'the companion server', child: children[1] },
        { name: 'the Angular dev server', child: children[2] },
      ],
      (code) => process.exit(code),
    );
    running = { children, watcher };
  };
  const stopAll = () => running.children.forEach((c) => killTree(c));
  startAll();
  // The Angular server is in a group of its own (killTree), so the terminal's signals do not reach it: stop it
  // here, also when the terminal is closed (SIGHUP) or the command ends any other way.
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'])
    process.on(sig, () => {
      stopAll();
      process.exit(0);
    });
  process.on('exit', () => stopAll());

  // With --bind to one address, that is the only one that answers; list the others only for 0.0.0.0.
  const addresses = !plan.remote
    ? []
    : plan.host && plan.host !== '0.0.0.0'
      ? [plan.host]
      : Object.values(networkInterfaces())
          .flat()
          .filter((i) => i && i.family === 'IPv4' && !i.internal)
          .map((i) => i.address);
  if (plan.remote)
    console.log(
      remoteLines({
        port: plan.port,
        password: plan.password,
        generated: plan.passwordGenerated,
        fromArgv: plan.passwordFrom === 'argv',
        addresses,
        routerMode: deckRouterMode(plan.entry),
      }).join('\n'),
    );

  if (process.stdin.isTTY) {
    let restarting = false;
    const quit = () => {
      stopAll();
      process.exit(0);
    };
    const keys = listenForKeys(
      process.stdin,
      {
        interrupt: quit,
        quit,
        restart: async () => {
          if (restarting) return; // a second r while the processes stop
          restarting = true;
          console.log('[slide.ng] restarting...');
          running.watcher.stop();
          await Promise.all(running.children.map(stopChild));
          keys.restoreRaw(); // the stopped processes put the terminal back in line mode
          startAll(true);
          restarting = false;
        },
        open: () =>
          startProgram(openCommand(`http://localhost:${plan.port}/`), {
            done: (error) =>
              error && console.error(`[slide.ng] could not open a browser: ${error.message}`),
          }),
        edit: () => {
          // The editor may be one that runs in this terminal (vim, nano): it gets the keys until it ends.
          keys.pause();
          startProgram(editorCommand(plan.entry), {
            inherit: true,
            done: (error) => {
              keys.resume();
              if (error)
                console.error(
                  `[slide.ng] could not start the editor (${error.message}); set EDITOR, or install the code command`,
                );
            },
          });
        },
        qrcode: () =>
          console.log(
            plan.remote
              ? remoteQrLines({
                  port: plan.port,
                  password: plan.password,
                  addresses,
                  routerMode: deckRouterMode(plan.entry),
                }).join('\n')
              : '[slide.ng] the QR code is for --remote (start with slide-ng --remote)',
          ),
      },
      (error) => console.error(`[slide.ng] ${error instanceof Error ? error.message : error}`),
    );
    if (plan.log !== 'silent') console.log(keyHint(plan.remote));
  }
}

/** `ng serve`'s arguments; `--open` only on the first start, so a restart (`r`) does not open another tab. */
export function ngServeArgs(plan, restart = false) {
  const args = ['serve', '--port', String(plan.port)];
  if (plan.host) args.push('--host', plan.host);
  if (plan.open && !restart) args.push('--open');
  return args;
}

// The Angular dev server runs in a process group of its own (not on Windows), so stopping it also stops the esbuild
// service it started. Killed with only its parent, esbuild could print a Go panic ("all goroutines are asleep") into
// the terminal through the stderr it shares (#59, on `r`).
const ownGroup = process.platform !== 'win32';
function killTree(child) {
  child.stopping = true; // its output from now on is not relayed (angularServer)
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (ownGroup && child.slideNgGroup) {
    try {
      process.kill(-child.pid, 'SIGTERM');
      return;
    } catch {
      // the group is gone already: kill the child alone
    }
  }
  child.kill();
}

// Kills a child process (and its group, see killTree) and resolves once it has ended.
const stopChild = (child) =>
  new Promise((done) => {
    if (child.exitCode !== null || child.signalCode !== null) return done();
    child.once('exit', () => done());
    killTree(child);
  });

// The Angular dev server, with its errors pointing at the deck's files (slides.md line, the author's own components/ file)
// instead of the generated copies, as the build does (runtime.mjs). Its colours stay when the terminal has them.
function angularServer(ngArgs, { appRoot, env, quiet, onBuild }) {
  // wait-for-port.mjs lets the waiting page (waiting-page.mjs) hand the port over when the first good build is done.
  const preload = pathToFileURL(join(packageRoot, 'scripts/dev/wait-for-port.mjs')).href;
  const child = spawn(process.execPath, ['--import', preload, ...ngArgs], {
    cwd: appRoot,
    env: process.stdout.isTTY ? { ...env, FORCE_COLOR: '1' } : env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: ownGroup,
  });
  child.slideNgGroup = ownGroup;
  // One tidier for both streams (angularOutput): Angular writes the rebuild lines and the errors to different ones.
  // With --log error or silent its normal output is read (for how each build ends) but not printed.
  const tidy = angularOutput((line, to) => to?.write(`${line}\n`), { onBuild });
  // Once it is being stopped, what it and its helpers still print (a dying esbuild's panic) is dropped.
  const relay = (from, to) =>
    createInterface({ input: from }).on('line', (line) => {
      if (!child.stopping) tidy.line(withSlideSources(line, appRoot), to);
    });
  relay(child.stdout, quiet ? null : process.stdout);
  relay(child.stderr, process.stderr);
  return child;
}
