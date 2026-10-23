// A menu of the bar opens above its button, at the button's inline start. On a narrow or short window (a phone, a page
// zoomed to 400%) it would go off screen: it is moved sideways as far as it must and made no taller than the room above
// its bottom edge, scrolling its content (WCAG 1.4.10, reflow). `translate` moves it the same way in both directions:
// `left` would stretch a menu placed by its `right` edge.

/** Keeps `menu` (placed by its bottom edge) inside the window, `gap` pixels from its edges. */
export function fitMenu(menu: HTMLElement, gap = 8) {
  menu.style.translate = '';
  menu.style.maxHeight = '';
  const r = menu.getBoundingClientRect();
  const shift = Math.max(gap - r.left, Math.min(0, window.innerWidth - gap - r.right));
  if (shift) menu.style.translate = `${shift}px`;
  if (r.top < gap) menu.style.maxHeight = `${Math.max(r.bottom - gap, 48)}px`;
}
