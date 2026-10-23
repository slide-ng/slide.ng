// Click markers in speaker notes (Slidev's NoteDisplay). The generator turns `[click]` into
// <span class="slidev-note-click-mark" data-clicks="N">. This file works on the finished HTML:
// it finds what text belongs to which click and returns a function that dims everything but the
// part for the current click. Port of the logic in NoteDisplay.vue.

export const MARK = 'slidev-note-click-mark';
export const FADE = 'slidev-note-fade';

/** Prepare `root` once; call the result with the current click whenever it changes. Null when the notes have no markers. */
export function prepareNote(
  root: HTMLElement,
  onMarkerDblclick: (clicks: number) => void,
): ((current: number) => void) | null {
  const markers = Array.from(root.querySelectorAll<HTMLElement>(`.${MARK}`));
  if (!markers.length) return null;

  // For every element that contains markers: the markers inside it, in order, with the click each starts.
  const markersMap = new Map<HTMLElement, number>();
  const parentsMap = new Map<HTMLElement, [divider: HTMLElement | null, clicks: number][]>();
  let lastClicks = 0;
  for (const marker of markers) {
    const clicks = Number(marker.dataset['clicks']);
    markersMap.set(marker, clicks);
    let n = marker;
    let p = marker.parentElement;
    while (p && n !== root) {
      if (!parentsMap.has(p)) parentsMap.set(p, [[null, lastClicks]]);
      parentsMap.get(p)!.push([n, clicks]);
      n = p;
      p = p.parentElement;
    }
    lastClicks = clicks;
  }

  // Every other child of those elements belongs to the click of the marker before it.
  const siblingsMap = new Map<HTMLElement, number>();
  for (const [parent, dividers] of parentsMap) {
    let hasPrefix = false;
    let at = 0;
    for (const child of Array.from(parent.childNodes)) {
      let isDivider = false;
      while (child === dividers[at + 1]?.[0]) {
        isDivider = true;
        at++;
      }
      if (isDivider) continue;
      let el = child as HTMLElement;
      if (child.nodeType === Node.TEXT_NODE) {
        // loose text gets its own element so it can be dimmed
        if (!child.textContent?.trim()) continue;
        el = document.createElement('span');
        el.textContent = child.textContent;
        parent.insertBefore(el, child);
        child.remove();
      }
      hasPrefix ||= at === 0;
      siblingsMap.set(el, dividers[at][1]);
    }
    if (!hasPrefix) dividers[0][1] = -1;
  }

  for (const [marker, clicks] of markersMap) marker.ondblclick = () => onMarkerDblclick(clicks);

  return (current: number) => {
    for (const [parent, list] of parentsMap)
      parent.classList.toggle(FADE, !list.some(([, c]) => c === current));
    for (const [el, clicks] of siblingsMap) el.classList.toggle(FADE, clicks !== current);
    // Dim once: inside a dimmed element its parts keep their own opacity, or they would multiply (0.75 × 0.75) below 4.5:1.
    // (The root's own class is not drawn: the stylesheet dims only what is inside it.)
    for (const el of [...parentsMap.keys(), ...siblingsMap.keys()]) {
      const around = el === root ? null : el.parentElement?.closest(`.${FADE}`);
      if (around && around !== root && root.contains(around)) el.classList.remove(FADE);
    }
    for (const [marker, clicks] of markersMap) {
      marker.classList.remove(FADE);
      marker.classList.toggle(`${MARK}-past`, clicks < current);
      marker.classList.toggle(`${MARK}-active`, clicks === current);
      marker.classList.toggle(`${MARK}-next`, clicks === current + 1);
      marker.classList.toggle(`${MARK}-future`, clicks > current + 1);
    }
  };
}
