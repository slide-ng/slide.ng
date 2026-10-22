// Drawing on the slides with drauu (a framework-free SVG drawing library), a port of Slidev's useDrawings.
// One instance per page (provided by the deck and the presenter). The SVG of each slide lives in
// SyncState.drawings, so it is shared with the other windows and saved (see persistence.ts).
import { DestroyRef, Injectable, effect, inject, signal, untracked } from '@angular/core';
import type { Brush, Drauu, DrawingMode } from 'drauu';
import { Nav } from '../lib/nav';
import { storedSignal } from '../lib/stored-signal';
import { SyncState } from '../sync/sync-state';
import { cleanSvg } from './clean-svg';
import { drawingsConfig } from './config';
import { coordinateScale } from './coordinate-scale';
import { startPersistence } from './persistence';

export type ToolMode = DrawingMode | 'arrow';
export const BRUSH_COLORS = [
  '#ff595e',
  '#ffca3a',
  '#8ac926',
  '#1982c4',
  '#6a4c93',
  '#ffffff',
  '#000000',
];

@Injectable()
export class Drawings {
  private nav = inject(Nav);
  private sync = inject(SyncState);
  readonly config = drawingsConfig();

  /** The toolbar is open and drawing is on. */
  readonly enabled = storedSignal('slidev-drawing-enabled', false);
  /** The toolbar stays on screen (faded) while drawing is off. */
  readonly pinned = storedSignal('slidev-drawing-pinned', false);
  readonly brush = storedSignal<Brush>('slidev-drawing-brush', {
    color: BRUSH_COLORS[0],
    size: 4,
    mode: 'stylus',
  });
  readonly mode = signal<ToolMode>('stylus');
  readonly isDrawing = signal(false);
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  readonly canClear = signal(false);

  private drauu: Drauu | null = null;
  private loading = false; // true while drauu.load() runs: its 'changed' event is not a drawing action
  private lastMode: ToolMode = 'stylus';
  private scale = 1;

  /** May this window draw at all? (`enabled: false` and `presenterOnly` switch it off.) */
  readonly available = this.config.enabled && (!this.config.presenterOnly || this.nav.isPresenter);
  // Viewers' drawings are sent to the others only with `syncAll`; the presenter's always are.
  private syncUp = this.config.syncAll || this.nav.isPresenter;

  constructor() {
    if (!this.available) return;
    startPersistence(this.config.persist);
    // A drawing from another window of the current slide: show it.
    const destroyRef = inject(DestroyRef);
    const stopListening = this.sync.onRemoteDrawings((patch) => {
      if (patch[this.nav.no()] != null) this.show(this.nav.no());
    });
    destroyRef.onDestroy(stopListening);
    // Another slide: show its drawing.
    effect(() => {
      const no = this.nav.no();
      untracked(() => this.show(no));
    });
    // Drawing is on: fingers and mouse draw; off: only a stylus does (so a pen works without the toolbar).
    effect(() => {
      const on = this.enabled();
      untracked(() => this.setInputTypes(on));
    });
    effect(() => {
      const b = this.brush();
      untracked(() => {
        if (this.drauu) this.drauu.brush = { ...b };
      });
    });
    const onKey = (e: KeyboardEvent) => this.key(e);
    window.addEventListener('keydown', onKey);
    destroyRef.onDestroy(() => window.removeEventListener('keydown', onKey));
  }

  /** Called by the drawing layer once its <svg> is in the page. */
  async attach(svg: SVGSVGElement, area: HTMLElement) {
    const { createDrauu } = await import('drauu');
    const drauu = createDrauu({ brush: { ...this.brush() }, coordinateTransform: false });
    drauu.mount(svg, area);
    drauu.on('start', () => this.isDrawing.set(true));
    drauu.on('end', () => this.isDrawing.set(false));
    drauu.on('changed', () => this.changed());
    this.drauu = drauu;
    this.setScale(this.scale);
    this.setInputTypes(this.enabled());
    this.setMode(this.mode());
    this.show(this.nav.no());
  }

  detach() {
    this.drauu?.unmount();
    this.drauu = null;
  }

  /** The slide is drawn at this scale; drauu needs it to turn mouse positions into slide positions. */
  setScale(scale: number) {
    this.scale = scale;
    if (this.drauu) this.drauu.options.coordinateScale = coordinateScale(scale);
  }

  setMode(mode: ToolMode) {
    this.mode.set(mode);
    // An arrow is a line with an arrow head. The mode lives in the brush too, so a later brush change keeps it.
    const real: DrawingMode = mode === 'arrow' ? 'line' : mode;
    this.brush.update((b) => ({ ...b, mode: real, arrowEnd: mode === 'arrow' }));
    if (this.drauu) this.drauu.mode = real;
  }

  /** Choose a tool from the toolbar: it also turns drawing on. */
  pickTool(mode: ToolMode) {
    this.enabled.set(true);
    this.setMode(mode);
    if (mode !== 'eraseLine') this.lastMode = mode;
  }

  pickColor(color: string) {
    this.brush.update((b) => ({ ...b, color }));
    this.enabled.set(true);
    this.setMode(this.lastMode);
  }

  setSize(size: number) {
    this.brush.update((b) => ({ ...b, size }));
    this.setMode(this.lastMode);
  }
  /** Stop drawing. The focus on a toolbar button (which goes away) goes back to the bar's drawing button, not to the page;
   *  not after a mouse click (`byKeyboard` false), where Space must move through the slides again. */
  close(byKeyboard = true) {
    const inToolbar = byKeyboard && document.activeElement?.closest('#drawing-toolbar');
    this.enabled.set(false);
    if (inToolbar) document.querySelector<HTMLElement>('#nav-drawing')?.focus();
  }

  toggle() {
    this.enabled.update((v) => !v);
  }
  undo() {
    this.drauu?.undo();
  }
  redo() {
    this.drauu?.redo();
  }

  clear() {
    this.drauu?.clear();
    if (this.syncUp) this.sync.patchDrawing(this.nav.no(), '');
  }

  // The drawing of slide `no` goes into drauu (or drauu is emptied).
  private show(no: number) {
    if (!this.drauu) return;
    this.loading = true;
    const markup = this.sync.drawings()[no];
    if (markup) this.drauu.load(cleanSvg(markup));
    else this.drauu.clear();
    this.loading = false;
    this.updateButtons();
  }

  private changed() {
    this.updateButtons();
    if (this.loading || !this.drauu) return;
    const no = this.nav.no(),
      dump = this.drauu.dump();
    if ((this.sync.drawings()[no] ?? '') === dump) return;
    // Viewers without syncAll keep their drawing on their own screen only.
    if (this.syncUp) this.sync.patchDrawing(no, dump);
    else this.sync.drawings.update((d) => ({ ...d, [no]: dump }));
  }

  private updateButtons() {
    if (!this.drauu) return;
    this.canUndo.set(this.drauu.canUndo());
    this.canRedo.set(this.drauu.canRedo());
    this.canClear.set(!!this.drauu.el?.children.length);
  }

  private setInputTypes(on: boolean) {
    if (!this.drauu) return;
    const mayDraw = !this.config.presenterOnly || this.nav.isPresenter;
    this.drauu.options.acceptsInputTypes = on && mayDraw ? undefined : mayDraw ? ['pen'] : [];
  }

  // Slidev's drawing keys, active only while drawing is on and no text field has the focus.
  private key(e: KeyboardEvent) {
    if (!this.enabled() || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName))
      return;
    const plain = !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey;
    const tools: Record<string, ToolMode> = {
      KeyL: 'line',
      KeyA: 'arrow',
      KeyS: 'stylus',
      KeyR: 'rectangle',
      KeyE: 'ellipse',
    };
    let handled = true;
    if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
      if (e.shiftKey) this.redo();
      else this.undo();
    } else if (e.code === 'Escape') this.close();
    else if (plain && tools[e.code]) this.pickTool(tools[e.code]);
    else if (plain && e.code === 'KeyC') this.clear();
    else if (
      plain &&
      e.code.startsWith('Digit') &&
      +e.code[5] >= 1 &&
      +e.code[5] <= BRUSH_COLORS.length
    )
      this.brush.update((b) => ({ ...b, color: BRUSH_COLORS[+e.code[5] - 1] }));
    else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}
