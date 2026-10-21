// UnoCSS as in Slidev: attributify, variant groups, the typography preset and the directives (@apply, --uno:).
export async function run({ t, open, style }) {
  const page = await open('/17');
  t.ok(
    'attributify: flex="~ col" and text="red-500" style the element',
    (await style(page, '#u-attr', 'flexDirection')) === 'column' &&
      (await style(page, '#u-attr', 'color')) === 'rgb(239, 68, 68)',
  );
  t.ok('attributify: p="4" is a padding', (await style(page, '#u-attr', 'paddingTop')) === '16px');
  await page.hover('#u-hover');
  t.ok(
    'attributify: hover:bg="blue-500" applies on hover',
    (await style(page, '#u-hover', 'backgroundColor')) === 'rgb(59, 130, 246)',
    await style(page, '#u-hover', 'backgroundColor'),
  );
  t.ok(
    'variant group: hover:(a b) became hover:a hover:b',
    (await page.locator('#u-group').getAttribute('class')).includes(
      'hover:text-blue-500 hover:font-bold',
    ),
  );
  await page.hover('#u-group');
  t.ok(
    'variant group: both classes apply on hover',
    (await style(page, '#u-group', 'fontWeight')) === '700' &&
      (await style(page, '#u-group', 'color')) === 'rgb(59, 130, 246)',
  );
  await page.hover('#u-bare');
  t.ok(
    'variant group as a bare attribute: <div hover:(a b)> draws and both apply on hover',
    (await style(page, '#u-bare', 'fontWeight')) === '700' &&
      (await style(page, '#u-bare', 'color')) === 'rgb(59, 130, 246)',
  );
  t.ok(
    'typography: prose sets the text colour, the width and the links inside',
    (await style(page, '#u-prose', 'color')) === 'rgb(55, 65, 81)' &&
      (await style(page, '#u-prose', 'maxWidth')) !== 'none' &&
      (await style(page, '#u-prose a', 'fontWeight')) === '500',
    await style(page, '#u-prose', 'color'),
  );
  t.ok(
    '@apply in a slide <style> becomes CSS',
    (await style(page, '#u-apply', 'fontStyle')) === 'italic' &&
      (await style(page, '#u-apply', 'color')) === 'rgb(22, 163, 74)',
  );
  t.ok(
    '--uno: in a slide <style> becomes CSS',
    (await style(page, '#u-uno', 'textDecorationLine')) === 'underline',
  );
  t.ok(
    '@apply in styles/index.css becomes CSS',
    (await style(page, '#u-styles', 'color')) === 'rgb(249, 115, 22)' &&
      (await style(page, '#u-styles', 'fontWeight')) === '700',
  );
  t.ok(
    'attributify does not read the attributes of an inline SVG (font-size="14" stays 14px)',
    (await style(page, '#u-svg-text', 'fontSize')) === '14px',
    await style(page, '#u-svg-text', 'fontSize'),
  );
  await page.close();
}
