import { describe, expect, it } from 'vitest';
import { FADE, MARK, prepareNote } from './note-marks';

function note(html: string) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

describe('note click marks', () => {
  it('dims a part once, not again inside a dimmed paragraph', () => {
    const root = note(
      `<p><span class="${MARK}" data-clicks="1"></span> Loading. <span class="${MARK}" data-clicks="2"></span> Empty.</p>` +
        `<p>After.</p>`,
    );
    const apply = prepareNote(root, () => {})!;
    apply(0);
    const faded = Array.from(root.querySelectorAll(`.${FADE}`));
    expect(faded.length).toBeGreaterThan(0);
    for (const el of faded) {
      const around = el.parentElement?.closest(`.${FADE}`);
      expect(around === null || around === root).toBe(true);
    }
    apply(1);
    const p = root.querySelector('p')!;
    expect(p.classList.contains(FADE)).toBe(false);
    const spans = Array.from(p.querySelectorAll(`span:not(.${MARK})`));
    expect(spans.map((s) => s.classList.contains(FADE))).toEqual([false, true]);
  });
});
