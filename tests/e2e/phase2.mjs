// `npm run test:e2e` (third part): builds tests/e2e/phase2/slides.md (code and content features)
// and checks it in a real browser. The topic files in phase2/ do the checking.
import { execSync } from 'node:child_process';
import { launch, reporter, serve } from './browser.mjs';
import { makeContext } from './helpers.mjs';

const ng = 'node node_modules/@angular/cli/bin/ng.js build --output-path dist/phase2';
if (!process.env.SKIP_BUILD) {
  try {
    execSync(`node scripts/generate.mjs && ${ng}`, {
      stdio: 'inherit',
      env: { ...process.env, SLIDES_FILE: 'tests/e2e/phase2/slides.md' },
    });
  } finally {
    execSync('node scripts/generate.mjs', { stdio: 'ignore' }); // put the generated files of the normal deck back
  }
}
// The deck's `plantUmlServer` is /plantuml on this same server; answer it with a tiny picture, so no network is needed.
const tinySvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="teal"/></svg>';
const { server, port } = await serve('dist/phase2/browser', (req, res) => {
  if (!req.url.startsWith('/plantuml/svg/')) return false;
  res.setHeader('content-type', 'image/svg+xml');
  res.end(tinySvg);
  return true;
});
const real = await launch();
// Pages here may use the clipboard (the copy button test reads it back).
const browser = {
  newPage: async (opts) =>
    (
      await real.newContext({ ...opts, permissions: ['clipboard-read', 'clipboard-write'] })
    ).newPage(),
};
const t = reporter();
const ctx = makeContext(`http://localhost:${port}`, browser, t);

const topics = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'code',
      'magic',
      'math',
      'diagrams',
      'monaco',
      'twoslash',
      'components',
      'mark',
      'markdown',
      'unocss',
    ];
for (const topic of topics) {
  console.log(`\n== ${topic}`);
  await (await import(`./phase2/${topic}.mjs`)).run(ctx);
}

t.ok('no console errors or warnings', ctx.problems.length === 0, JSON.stringify(ctx.problems));
await real.close();
server.close();
process.exit(t.done());
