// `npm run test:e2e` (fourth part): builds tests/e2e/phase3/slides.md (presenter, drawing, drag, camera ...)
// and checks it in a real browser, one file per topic. `node tests/e2e/phase3.mjs sync` runs one topic.
import { execSync } from 'node:child_process';
import { launch, reporter, serve } from './browser.mjs';
import { makeContext } from './helpers.mjs';

const ng = (out) => `node node_modules/@angular/cli/bin/ng.js build --output-path dist/${out}`;
// The generated files are rebuilt for each deck and put back for the normal deck at the end.
const build = (out, slides) =>
  execSync(`node scripts/generate.mjs && ${ng(out)}`, {
    stdio: 'inherit',
    env: { ...process.env, SLIDES_FILE: slides },
  });
if (!process.env.SKIP_BUILD) {
  try {
    build('phase3', 'tests/e2e/phase3/slides.md');
    // The second deck has its own size, zoom, hash routing and the four layer components (its own layers/ folder).
    build('phase3-layout', 'tests/e2e/phase3/layout/slides.md');
    // The third has pictures on most slides and `preloadImages: { ahead: 2 }`.
    build('phase3-preload', 'tests/e2e/phase3/preload/slides.md');
    // The fourth has every kind of click, for the presenter's click preview.
    build('phase3-clicks', 'tests/e2e/phase3/clicks/slides.md');
  } finally {
    execSync('node scripts/generate.mjs', { stdio: 'ignore' });
  }
}
const { server, port } = await serve('dist/phase3/browser');
const layoutServer = await serve('dist/phase3-layout/browser');
const preloadServer = await serve('dist/phase3-preload/browser');
const clicksServer = await serve('dist/phase3-clicks/browser');
// Fake camera, microphone and screen so the recording tests can run without devices.
const browser = await launch([
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  '--auto-select-desktop-capture-source=Entire screen',
  '--enable-usermedia-screen-capturing',
  // Another machine for the sync menu (sync-mode.mjs): a host name that is not localhost, served here.
  '--host-resolver-rules=MAP remote.test 127.0.0.1',
  '--proxy-bypass-list=remote.test',
]);
const t = reporter();
const ctx = makeContext(`http://localhost:${port}`, browser, t);
const layoutCtx = makeContext(`http://localhost:${layoutServer.port}`, browser, t);
const preloadCtx = makeContext(`http://localhost:${preloadServer.port}`, browser, t);
const clicksCtx = makeContext(`http://localhost:${clicksServer.port}`, browser, t);
const contexts = { layout: layoutCtx, preload: preloadCtx, 'click-preview': clicksCtx };

const only = process.argv[2];
for (const topic of [
  'sync',
  'sync-mode',
  'presenter',
  'panes',
  'laser',
  'drawing',
  'camera',
  'settings',
  'drag',
  'progress',
  'overview',
  'layout',
  'preload',
  'click-preview',
]) {
  if (only && only !== topic) continue;
  let run;
  try {
    run = (await import(`./phase3/${topic}.mjs`)).run;
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') continue;
    throw e;
  }
  console.log(`\n== ${topic}`);
  await run(contexts[topic] ?? ctx);
}

t.ok(
  'no console errors or warnings',
  ctx.problems.length +
    layoutCtx.problems.length +
    preloadCtx.problems.length +
    clicksCtx.problems.length ===
    0,
  JSON.stringify([
    ...ctx.problems,
    ...layoutCtx.problems,
    ...preloadCtx.problems,
    ...clicksCtx.problems,
  ]),
);
await browser.close();
server.close();
layoutServer.server.close();
preloadServer.server.close();
clicksServer.server.close();
process.exit(t.done());
