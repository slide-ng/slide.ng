// Custom slide transitions by class name (slides 4 to 6 of the setup deck, CSS in phase5/styles/index.css).
export async function run({ t, open, hud }) {
  const page = await open('/4');
  const state = () =>
    page.evaluate(() => {
      const slides = [...document.querySelectorAll('.canvas > *')].filter((e) =>
        /^SLIDE-/.test(e.tagName),
      );
      return {
        slides: slides.map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`),
        name: document.querySelector('.canvas').dataset.transition ?? null,
        opacity: slides.map((e) => +getComputedStyle(e).opacity),
        scale: slides.map((e) => getComputedStyle(e).scale),
      };
    });

  await page.keyboard.press('ArrowRight'); // 4 -> 5, `transition: my-fade` is on slide 4
  await page.waitForTimeout(250);
  let s = await state();
  t.ok(
    "custom transition: both slides carry Vue's active classes while it runs",
    s.name === 'my-fade' &&
      s.slides.length === 2 &&
      s.slides[0].includes('my-fade-leave-active') &&
      s.slides[0].includes('my-fade-leave-to') &&
      s.slides[1].includes('my-fade-enter-active') &&
      s.slides[1].includes('my-fade-enter-to'),
    JSON.stringify(s),
  );
  t.ok(
    'custom transition: the CSS of styles/ fades them (the entering slide is half way)',
    s.opacity[1] > 0.05 && s.opacity[1] < 0.95,
    JSON.stringify(s.opacity),
  );
  await page.waitForTimeout(800);
  s = await state();
  t.ok(
    'custom transition: the old slide goes and the classes are removed when it ends',
    s.slides.length === 1 && s.slides[0] === 'slide-005.' && s.name === null,
    JSON.stringify(s),
  );
  t.ok('custom transition: slide 5 is shown', (await hud(page)).startsWith('slide 5/6'));

  await page.keyboard.press('ArrowRight'); // 5 -> 6, the object form on slide 5
  await page.waitForTimeout(250);
  s = await state();
  t.ok(
    "object form: its own enterActiveClass and enterFromClass replace the names, the others stay Vue's",
    s.slides.length === 2 &&
      s.slides[1].includes('grow-run') &&
      s.slides[1].includes('grow-enter-to') &&
      !s.slides[1].includes('grow-enter-active') &&
      s.scale[1] !== 'none' &&
      s.scale[1] !== '1',
    JSON.stringify(s),
  );
  await page.waitForTimeout(800);
  s = await state();
  t.ok(
    'object form: done after its own CSS transition',
    s.slides.length === 1 && s.slides[0] === 'slide-006.',
    JSON.stringify(s),
  );
  await page.close();
}
