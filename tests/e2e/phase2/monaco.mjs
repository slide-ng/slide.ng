// Monaco editors (lazy, workers bundled, offline) and the sandboxed runner.
// Monaco writes spaces as non-breaking spaces; compare with normal ones.
const plain = (s) => s.replace(/\u00a0/g, ' ');

export async function run({ t, open, press, hud }) {
  let page = await open('/10');
  await page.waitForSelector('.monaco-editor .view-lines');
  await page.waitForFunction(() =>
    /edit\u00a0me/.test(document.querySelector('.monaco-editor .view-lines')?.textContent ?? ''),
  );
  t.ok(
    '{monaco} block becomes an editor with its text',
    plain(await page.locator('.monaco-editor .view-lines').first().textContent()).includes(
      "const message: string = 'edit me'",
    ),
  );
  t.ok(
    '{monaco-diff} makes a diff editor',
    (await page.locator('.monaco-diff-editor').count()) === 1,
  );
  t.ok(
    "Monaco's own CSS is applied",
    (await page
      .locator('.monaco-editor')
      .first()
      .evaluate((e) => getComputedStyle(e).position)) === 'relative',
  );
  t.ok(
    'the editor is as tall as its text (height: initial)',
    (await page
      .locator('.slidev-monaco-container-inner')
      .first()
      .evaluate((e) => e.offsetHeight)) > 30,
  );
  const box = await page.locator('.monaco-editor .view-lines').first().boundingBox();
  await page.mouse.click(box.x + box.width - 40, box.y + 8); // the end of the first line
  await page.keyboard.press('End');
  await page.keyboard.type(' // typed and d');
  await page.waitForTimeout(200);
  t.ok(
    'typing changes the text (the editor is editable)',
    plain(await page.locator('.monaco-editor .view-lines').first().textContent()).includes(
      '// typed and d',
    ),
  );
  t.ok(
    'keys typed in the editor are not slide shortcuts (a d did not switch to dark mode)',
    !(await page.evaluate(() => document.documentElement.classList.contains('dark'))) &&
      new URL(page.url()).pathname === '/10',
  );
  const workers = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((r) => r.name)
      .filter((n) => /worker-/.test(n)),
  );
  const origin = await page.evaluate(() => location.origin);
  t.ok(
    'workers come from the same server, not a CDN',
    workers.length > 0 && workers.every((w) => w.startsWith(origin)),
    workers.join(),
  );
  const outside = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((r) => r.name)
      .filter((n) => !n.startsWith(location.origin) && !n.startsWith('data:')),
  );
  t.ok(
    'everything loaded from the same origin (works offline)',
    outside.length === 0,
    outside.join(),
  );
  await page.close();

  page = await open('/11');
  const outputs = () => page.locator('.slidev-runner-output').allInnerTexts();
  await page.waitForFunction(
    () => document.querySelectorAll('.slidev-runner-output').length >= 2,
    null,
    { timeout: 15000 },
  );
  const first = (await outputs())[0];
  t.ok(
    '{monaco-run} runs TypeScript (turned into JS by the TS worker) and shows the log',
    first.startsWith('5, [1, 2], {'),
    first,
  );
  t.ok(
    'objects and Maps are shown readably',
    first.includes('"a": 1') && first.includes('Map (1) {1 => 2}'),
    first,
  );
  const sandboxed = (await outputs()).find((o) => o.includes('SecurityError')) ?? '';
  t.ok(
    'the code runs in a sandbox: no access to the page or its storage',
    sandboxed.includes('SecurityError') && !sandboxed.includes('has storage'),
    sandboxed,
  );
  t.ok(
    'showOutputAt "+1" makes one click',
    (await hud(page)).endsWith('clicks 0/1'),
    await hud(page),
  );
  const second = page.locator('code-runner').nth(1);
  t.ok(
    'the output waits for its click',
    await second.evaluate((e) => e.classList.contains('slidev-vclick-hidden')),
  );
  await press(page, 'ArrowRight');
  t.ok(
    'after the click the runner shows',
    !(await second.evaluate((e) => e.classList.contains('slidev-vclick-hidden'))),
  );
  t.ok(
    '{autorun:false} waits for the play button',
    (await second.innerText()).includes('Click the play button'),
  );
  await second.locator('button').click();
  await page.waitForFunction(() =>
    /boom/.test(document.querySelectorAll('code-runner')[1].textContent),
  );
  const text = await second.innerText();
  t.ok(
    'the button runs it: logs and errors are both shown',
    text.includes('shown after one click') && text.includes('boom'),
    text,
  );
  t.ok(
    'no waitfor marker is left on the page',
    (await page.locator('[data-slide-ng-waitfor]').count()) === 0,
  );
  await page.close();

  // A run stuck in an endless loop is stopped when the slide is left: the next slide's run does not wait for the
  // 5 second cut-off (sandboxed frames of one site can share a process).
  page = await open('/19');
  await page.waitForSelector('.slidev-runner-run');
  await page.locator('.slidev-runner-run').click();
  await page.waitForTimeout(300);
  await press(page, 'ArrowRight');
  const start = Date.now();
  await page.waitForFunction(
    () => /after the loop|Stopped/.test(document.querySelector('code-runner')?.textContent ?? ''),
    null,
    { timeout: 15000 },
  );
  const took = Date.now() - start;
  const after = await page.locator('code-runner').innerText();
  t.ok(
    "leaving a slide stops its endless loop: the next slide's run is not held up",
    after.includes('after the loop') && took < 4000,
    `${took} ms: ${after}`,
  );
  // Leaving a TypeScript run while it is turned into JavaScript logs no "Could not find source file" error
  // (the "no console errors" check at the end of the phase).
  for (let i = 0; i < 6; i++) {
    await press(page, 'ArrowLeft');
    await page.waitForTimeout(250);
    await press(page, 'ArrowRight');
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1000);
  await page.close();
}
