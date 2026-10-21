// `npm run test:e2e` (sixth part): builds tests/e2e/phase5/slides.md, a deck with a setup/ folder (docs/SETUP.md),
// and checks in a real browser that every setup hook changed the output and that `themeConfig` reaches the CSS and the slides.
// `node tests/e2e/phase5.mjs setup` runs one topic.
import { execSync } from 'node:child_process';
import { launch, reporter, serve } from './browser.mjs';
import { makeContext } from './helpers.mjs';

const ng = 'node node_modules/@angular/cli/bin/ng.js build --output-path dist/phase5';
if (!process.env.SKIP_BUILD) {
  try {
    execSync(`node scripts/generate.mjs && ${ng}`, {
      stdio: 'inherit',
      env: { ...process.env, SLIDES_FILE: 'tests/e2e/phase5/slides.md' },
    });
  } finally {
    execSync('node scripts/generate.mjs', { stdio: 'ignore' }); // put the generated files of the normal deck back
  }
}
const { server, port } = await serve('dist/phase5/browser');
const browser = await launch();
const t = reporter();
const ctx = makeContext(`http://localhost:${port}`, browser, t);

const only = process.argv[2];
for (const topic of ['setup', 'theme-config']) {
  if (only && only !== topic) continue;
  console.log(`\n== ${topic}`);
  await (await import(`./phase5/${topic}.mjs`)).run(ctx);
}

t.ok('no console errors or warnings', ctx.problems.length === 0, JSON.stringify(ctx.problems));
await browser.close();
server.close();
process.exit(t.done());
