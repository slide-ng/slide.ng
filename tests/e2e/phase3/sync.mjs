// Windows of one browser follow each other through a BroadcastChannel.
export async function run({ t, open, press, hud, until, windowGroup }) {
  const group = await windowGroup();
  const hudIs = (page, text) =>
    until(page, (x) => document.querySelector('#hud')?.innerText.trim() === x, text);
  const viewer = await open('/1', undefined, undefined, group);
  const other = await open('/1', undefined, undefined, group);

  // The other window plays the presenter: it sends a message like a presenter page does.
  await other.evaluate(() => {
    const ch = new BroadcastChannel('slide-ng-sync');
    ch.postMessage({
      channel: 'shared',
      data: {
        page: 2,
        clicks: 1,
        clicksTotal: 2,
        lastUpdate: { id: 'x', type: 'presenter', time: Date.now() },
      },
    });
  });
  await hudIs(viewer, 'slide 2/4 clicks 1/2');
  t.ok(
    'a viewer follows a presenter message to another slide and click',
    (await hud(viewer)) === 'slide 2/4 clicks 1/2',
    await hud(viewer),
  );
  t.ok(
    'the address changed without a new history entry',
    new URL(viewer.url()).pathname === '/2' && (await viewer.evaluate(() => history.length)) <= 3,
  );

  await other.evaluate(() => {
    const ch = new BroadcastChannel('slide-ng-sync');
    ch.postMessage({
      channel: 'shared',
      data: {
        page: 2,
        clicks: 2,
        clicksTotal: 2,
        lastUpdate: { id: 'x', type: 'presenter', time: Date.now() + 1 },
      },
    });
  });
  await hudIs(viewer, 'slide 2/4 clicks 2/2');
  t.ok(
    'a click change on the same slide is followed too',
    (await hud(viewer)) === 'slide 2/4 clicks 2/2',
    await hud(viewer),
  );

  await other.evaluate(() => {
    const ch = new BroadcastChannel('slide-ng-sync');
    ch.postMessage({
      channel: 'shared',
      data: {
        page: 'evil',
        clicks: -5,
        lastUpdate: { id: 'x', type: 'presenter', time: Date.now() + 2 },
      },
    });
  });
  await viewer.waitForTimeout(300);
  t.ok(
    'a bad message does not move the viewer',
    (await hud(viewer)) === 'slide 2/4 clicks 2/2',
    await hud(viewer),
  );

  // Another presenter window answers a late window's hello with its older move: the viewer keeps the newest one.
  await other.evaluate(() => {
    const ch = new BroadcastChannel('slide-ng-sync');
    ch.postMessage({
      channel: 'shared',
      data: {
        page: 1,
        clicks: 0,
        lastUpdate: { id: 'y', type: 'presenter', time: Date.now() - 60_000 },
      },
    });
  });
  await viewer.waitForTimeout(400);
  t.ok(
    'an older move of another presenter does not take the viewer back',
    (await hud(viewer)) === 'slide 2/4 clicks 2/2',
    await hud(viewer),
  );
  await group.close();

  // Two presenter windows: the one that moved last leads. A window that opens later, or a presenter that reloads, makes
  // both answer; the audience stays with the newest move.
  const two = await windowGroup();
  const audience = await open('/1', undefined, undefined, two);
  const a = await open('/presenter/1', undefined, undefined, two);
  const b = await open('/presenter/1', undefined, undefined, two);
  await b.waitForTimeout(300);
  for (let i = 0; i < 2; i++) await press(a, 'ArrowDown', 300); // the next slide, twice: slide 3
  await audience.waitForTimeout(300);
  const before = await hud(audience);
  const late = await open('/1', undefined, undefined, two);
  await late.waitForTimeout(800);
  await a.reload();
  await a.waitForFunction(() =>
    /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await audience.waitForTimeout(800);
  t.ok(
    'with two presenter windows a late window and a reload leave the audience at the last move',
    before.startsWith('slide 3/4') &&
      (await hud(audience)) === before &&
      (await hud(late)) === before &&
      (await hud(b)).startsWith('slide 1/4'),
    `${before} / audience ${await hud(audience)} / late ${await hud(late)} / b ${await hud(b)}`,
  );
  // The presenter that did not move last reloads: its first position is not a move. A window that opens after both
  // reloads still lands on A's slide (A's reload kept the time of its move).
  await b.reload();
  await b.waitForFunction(() =>
    /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await audience.waitForTimeout(800);
  const later = await open('/1', undefined, undefined, two);
  await later.waitForTimeout(800);
  t.ok(
    'a reload of the presenter that did not move last leaves the audience at the last move',
    (await hud(audience)) === before &&
      (await hud(later)) === before &&
      (await hud(b)).startsWith('slide 1/4'),
    `${before} / audience ${await hud(audience)} / later ${await hud(later)} / b ${await hud(b)}`,
  );
  await two.close();

  // The timer comes with the sender's clock (here an hour ahead, after a minute of running): it shows one minute here.
  // A presenter tab opened when no presenter is left gets it from the audience window.
  const third = await windowGroup();
  const watcher = await open('/1', undefined, undefined, third);
  await watcher.evaluate(() => {
    const ahead = Date.now() + 3_600_000;
    new BroadcastChannel('slide-ng-sync').postMessage({
      channel: 'shared',
      data: { timer: { status: 'running', startedAt: ahead - 60_000, pausedAt: 0, sentAt: ahead } },
    });
  });
  await watcher.waitForTimeout(300);
  const reopened = await open('/presenter/1', undefined, undefined, third);
  await reopened.waitForTimeout(500);
  const clock = (await reopened.locator('#timer-text').innerText()).replace(/\s/g, '');
  t.ok(
    'a new presenter tab gets the running timer, moved onto its own clock (10 min countdown, 1 min passed)',
    /^8:5\d$/.test(clock),
    clock,
  );
  await third.close();
}
