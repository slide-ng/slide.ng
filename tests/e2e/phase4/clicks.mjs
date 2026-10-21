// Click animation presets on the play page (slide 2: slide-ng-click.up and .none; slide 5: `clickAnimation: scale`).
export async function run({ t, open, press }) {
  const page = await open('/2');
  const look = (id) =>
    page.locator(id).evaluate((e) => ({
      classes: e.className,
      translate: getComputedStyle(e).translate,
      duration: getComputedStyle(e).transitionDuration,
    }));
  let c1 = await look('#c1');
  t.ok(
    'slide-ng-click.up: the element gets the preset class and sits 20px lower while hidden',
    c1.classes.includes('slidev-vclick-anim-up') && c1.translate === '0px 20px',
    JSON.stringify(c1),
  );
  t.ok(
    'an element not revealed yet is inert (screen readers skip it, no focus)',
    (await page.locator('#c1').getAttribute('inert')) === '',
  );
  const c2 = await look('#c2');
  t.ok(
    'slide-ng-click.none: no transition at all',
    c2.classes.includes('slidev-vclick-anim-none') && c2.duration === '0s',
    JSON.stringify(c2),
  );
  await press(page, 'ArrowRight', 300);
  c1 = await look('#c1');
  t.ok(
    'slide-ng-click.up: on its click the element moves up into place',
    c1.translate === 'none' && (await page.locator('#c1').getAttribute('inert')) === null,
    JSON.stringify(c1),
  );
  await press(page, 'ArrowRight', 40);
  t.ok(
    'slide-ng-click.none: shown at once, with no step in between',
    (await page.locator('#c2').evaluate((e) => getComputedStyle(e).opacity)) === '1',
  );
  await page.close();

  const five = await open('/5');
  t.ok(
    'clickAnimation in the frontmatter gives every click element of the slide its preset',
    (await five.locator('#s2').getAttribute('class')).includes('slidev-vclick-anim-scale') &&
      (await five.locator('#s2').evaluate((e) => getComputedStyle(e).scale)) === '0.9',
  );
  await five.close();
}
