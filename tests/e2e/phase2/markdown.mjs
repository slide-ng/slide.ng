// GitHub alerts, task lists, footnotes and icons.
export async function run({ t, open }) {
  const page = await open('/16');
  const text = (sel) => page.locator(sel).first().innerText();
  t.ok(
    'a [!NOTE] blockquote is an alert with its title',
    (await page.locator('.markdown-alert-note').count()) === 1 &&
      (await text('.markdown-alert-note .markdown-alert-title')) === 'Note',
  );
  t.ok(
    'the alert keeps its inline code and bold text',
    (await page.locator('.markdown-alert-note code').count()) === 1 &&
      (await page.locator('.markdown-alert-note strong').count()) === 1,
  );
  t.ok(
    'the alert title has an icon',
    (
      await page
        .locator('.markdown-alert-warning .markdown-alert-title span')
        .evaluate((e) => getComputedStyle(e).maskImage || getComputedStyle(e).webkitMaskImage)
    ).includes('url('),
  );
  const border = (kind) =>
    page.locator(`.markdown-alert-${kind}`).evaluate((e) => getComputedStyle(e).borderLeftColor);
  t.ok(
    'note and warning have different colours',
    (await border('note')) !== (await border('warning')),
    `${await border('note')} / ${await border('warning')}`,
  );
  t.ok(
    'task list: two checkboxes, the first checked, none can be changed',
    (await page.locator('input[type=checkbox]').count()) === 2 &&
      (await page.locator('input[type=checkbox]').first().isChecked()) &&
      (await page.locator('input[type=checkbox]').last().isDisabled()),
  );
  t.ok(
    'task list items have no bullet',
    (await page
      .locator('li:has(input)')
      .first()
      .evaluate((e) => getComputedStyle(e).listStyleType)) === 'none',
  );
  t.ok(
    'footnote references are numbered',
    (await page.locator('sup.footnote-ref').allInnerTexts()).join() === '[1],[2]',
  );
  t.ok(
    'footnotes are listed at the bottom, braces and code intact',
    (await page.locator('.footnotes li').allInnerTexts()).join('|') ===
      'The first footnote.|The second one, with {{ x }} in it.',
  );
  const mask = (id) =>
    page
      .locator(id)
      .evaluate((e) => getComputedStyle(e).maskImage || getComputedStyle(e).webkitMaskImage);
  for (const id of ['#i1', '#i2', '#i3'])
    t.ok(`icon ${id} is a span`, (await page.locator(id).evaluate((e) => e.tagName)) === 'SPAN');
  for (const id of ['#i1', '#i2', '#i3'])
    t.ok(
      `icon ${id} draws an SVG`,
      (
        await mask(
          `.canvas span.i-${{ '#i1': 'carbon\\:apps', '#i2': 'mdi\\:account-circle', '#i3': 'ph\\:star-fill' }[id]}`,
        )
      ).includes('svg'),
    );
  t.ok(
    'an icon keeps its own classes',
    await page.locator('#i2').evaluate((e) => e.classList.contains('text-red-500')),
  );
  await page.close();
}
