// Arrow, transform, slide-ng-auto-fit-text, youtube, slide-ng-video, tweet and slide-ng-blue-sky.
export async function run({ t, open, press, hud }) {
  let page = await open('/13');
  const attr = (sel, name) => page.locator(sel).first().getAttribute(name);
  t.ok(
    'arrow draws a line from (x1,y1) to (x2,y2) in its colour and width',
    (await attr('#a1 line', 'x1')) === '100' &&
      (await attr('#a1 line', 'y2')) === '400' &&
      (await attr('#a1 line', 'stroke')) === 'green' &&
      (await attr('#a1 line', 'stroke-width')) === '3',
  );
  t.ok(
    'arrow has an arrow head, and a second one with two-way',
    (await page.locator('#a1 marker').count()) === 1 &&
      (await page.locator('#a2 marker').count()) === 2 &&
      (await attr('#a2 line', 'marker-start')).includes('-rev'),
  );
  t.ok(
    'arrow ids are different, so markers are not mixed up',
    (await attr('#a1 marker', 'id')) !== (await attr('#a2 marker', 'id')),
  );
  t.ok(
    'transform scales its content from the origin',
    (await page.locator('#t1').evaluate((e) => getComputedStyle(e).transform)) ===
      'matrix(0.5, 0, 0, 0.5, 0, 0)',
  );
  const size = () =>
    page.locator('#fit .slidev-auto-fit-text-inner').evaluate((e) => parseFloat(e.style.fontSize));
  const inside = () =>
    page.locator('#fit').evaluate((box) => {
      const i = box.firstElementChild;
      return i.scrollWidth <= box.clientWidth && i.offsetHeight <= box.clientHeight;
    });
  t.ok(
    'slide-ng-auto-fit-text picks a size between min and max that fits the box',
    (await size()) >= 10 && (await size()) <= 60 && (await inside()),
    String(await size()),
  );
  const before = await size();
  await page.locator('#fit').evaluate((e) => (e.style.height = '40px'));
  await page.waitForTimeout(200);
  t.ok(
    'slide-ng-auto-fit-text fits again when the box gets smaller',
    (await size()) < before && (await inside()),
    `${before} -> ${await size()}`,
  );
  t.ok(
    'youtube is an iframe of the video with its size',
    (await attr('slide-ng-youtube iframe', 'src')) ===
      'https://www.youtube.com/embed/luoMHjh-XcQ' &&
      (await attr('slide-ng-youtube iframe', 'width')) === '320' &&
      (await attr('slide-ng-youtube iframe', 'height')) === '180',
  );
  t.ok(
    'youtube keeps the start time written into the id and drops unknown options',
    (await page.locator('slide-ng-youtube iframe').nth(1).getAttribute('src')) ===
      'https://www.youtube.com/embed/luoMHjh-XcQ?start=1234&end=1300',
  );
  t.ok(
    'youtube reads a start time written the YouTube way (1m30s) as seconds',
    (await page.locator('slide-ng-youtube iframe').nth(2).getAttribute('src')) ===
      'https://www.youtube.com/embed/luoMHjh-XcQ?start=90',
  );
  await page.close();

  // The fake widget scripts answer instead of the network; the fake media element records play and pause.
  const stubs = async (p) => {
    await p.addInitScript(() => {
      window.__media = [];
      HTMLMediaElement.prototype.play = function () {
        window.__media.push(`play:${this.parentElement.id}`);
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {
        window.__media.push(`pause:${this.parentElement.id}`);
      };
    });
    await p.route('https://platform.twitter.com/widgets.js', (r) =>
      r.fulfill({
        contentType: 'text/javascript',
        body: 'window.twttr = { widgets: { createTweet: async (id, el, o) => { el.insertAdjacentHTML("beforeend", `<div class="fake-tweet" data-id="${id}" data-theme="${o.theme}"></div>`); return el; } } };',
      }),
    );
    await p.route('https://embed.bsky.app/static/embed.js', (r) =>
      r.fulfill({
        contentType: 'text/javascript',
        body: 'window.bluesky = { scan: (el) => { window.__scanned = el.querySelector("blockquote")?.getAttribute("data-bluesky-uri"); } };',
      }),
    );
  };
  page = await open('/14', undefined, stubs);
  t.ok(
    'tweet loads the widget script and asks for the post, in the colour mode',
    (await page.locator('.fake-tweet').count()) === 1 &&
      (await attr('.fake-tweet', 'data-id')) === '20' &&
      (await attr('.fake-tweet', 'data-theme')) === 'light',
  );
  t.ok(
    'tweet is scaled',
    (await page
      .locator('slide-ng-tweet slide-ng-transform')
      .evaluate((e) => getComputedStyle(e).transform)) === 'matrix(0.5, 0, 0, 0.5, 0, 0)',
  );
  await page.waitForFunction(() => window.__scanned);
  const uri = 'at://did:plc:432mbsu2xucyvxl6sluohidu/app.bsky.feed.post/3lgwg2vy44s2q';
  t.ok(
    'slide-ng-blue-sky writes the embed blockquote with the post address and lets the script scan it',
    (await attr('blockquote.bluesky-embed', 'data-bluesky-uri')) === uri &&
      (await page.evaluate(() => window.__scanned)) === uri,
  );
  t.ok(
    'slide-ng-blue-sky passes the colour mode to the embed',
    (await attr('blockquote.bluesky-embed', 'data-bluesky-embed-color-mode')) === 'light',
  );

  t.ok(
    'two videos with slide-ng-click make two clicks',
    (await hud(page)).endsWith('clicks 0/2'),
    await hud(page),
  );
  const calls = () => page.evaluate(() => window.__media.join());
  t.ok(
    'a video that waits for its click does not play yet',
    !(await calls()).includes('play:vid'),
    await calls(),
  );
  await press(page, 'ArrowRight');
  t.ok(
    'autoplay: it plays when its click comes',
    (await calls()).includes('play:vid'),
    await calls(),
  );
  t.ok('controls show', (await page.locator('#vid video').evaluate((v) => v.controls)) === true);
  await press(page, 'ArrowRight');
  t.ok(
    'autoplay once: the second plays when its click comes',
    (await calls()).includes('play:vid-once'),
  );
  await press(page, 'ArrowLeft');
  await press(page, 'ArrowLeft');
  t.ok(
    'going back before the click pauses it',
    (await calls()).includes('pause:vid'),
    await calls(),
  );
  await page.close();

  // slide-ng-switch unmount and transition, slide-ng-render-when visible
  page = await open('/17');
  const inPage = (id) => page.evaluate((i) => !!document.getElementById(i), id);
  t.ok(
    'slide-ng-switch unmount: children that are not shown are out of the page',
    !(await inPage('swu1')) && !(await inPage('swu2')),
  );
  await press(page, 'ArrowRight', 50);
  const fading = await page.evaluate(() =>
    document
      .getElementById('swu1')
      ?.getAnimations()
      .some((a) => a.playState === 'running'),
  );
  t.ok('slide-ng-switch transition: the shown child fades in', fading === true, String(fading));
  await page.waitForTimeout(800);
  await press(page, 'ArrowRight', 800);
  t.ok(
    'slide-ng-switch unmount swaps children on the next click',
    !(await inPage('swu1')) && (await inPage('swu2')),
  );
  await press(page, 'ArrowLeft', 800);
  t.ok(
    'slide-ng-switch unmount: going back puts the first child back in place',
    (await inPage('swu1')) &&
      !(await inPage('swu2')) &&
      (await page.evaluate(() => document.getElementById('swu1').parentElement.id)) ===
        'sw-unmount',
  );
  t.ok(
    'slide-ng-render-when visible shows the fallback while the element is off screen',
    (await page.locator('#rw-fallback').count()) === 1 &&
      (await page.locator('#rw-shown').count()) === 0,
  );
  await page.evaluate(() => (document.getElementById('rw-spacer').style.height = '0'));
  await page.waitForSelector('#rw-shown', { timeout: 3000 }).catch(() => undefined);
  t.ok(
    'slide-ng-render-when visible on screen shows its content',
    (await page.locator('#rw-shown').count()) === 1 &&
      (await page.locator('#rw-fallback').count()) === 0,
  );
  await page.close();
}
