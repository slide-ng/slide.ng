// `npm run test:e2e` (fifth part): builds tests/e2e/phase4/slides.md and checks the /print page in a real browser.
// `node tests/e2e/phase4.mjs print` runs one topic.
import { execSync } from 'node:child_process';
import { launch, reporter, serve } from './browser.mjs';
import { makeContext } from './helpers.mjs';

const ng = 'node node_modules/@angular/cli/bin/ng.js build --output-path dist/phase4';
if (!process.env.SKIP_BUILD) {
  try {
    execSync(`node scripts/generate.mjs && ${ng}`, {
      stdio: 'inherit',
      env: { ...process.env, SLIDES_FILE: 'tests/e2e/phase4/slides.md' },
    });
  } finally {
    execSync('node scripts/generate.mjs', { stdio: 'ignore' }); // put the generated files of the normal deck back
  }
}
const { server, port } = await serve('dist/phase4/browser');
const browser = await launch();
const t = reporter();
const ctx = makeContext(`http://localhost:${port}`, browser, t);

const only = process.argv[2];
for (const topic of ['print', 'clicks']) {
  if (only && only !== topic) continue;
  console.log(`\n== ${topic}`);
  await (await import(`./phase4/${topic}.mjs`)).run(ctx);
}

t.ok('no console errors or warnings', ctx.problems.length === 0, JSON.stringify(ctx.problems));
await browser.close();
server.close();
process.exit(t.done());
