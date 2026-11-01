import { Component, inject, signal } from '@angular/core';
import { UiTextKey } from '../i18n/en';
import { T } from '../i18n/t';
import { IconBtn } from '../ui/icon-btn';
import { Draggable } from './draggable';
import { BRUSH_COLORS, Drawings, ToolMode } from './drawings';

// The drawing toolbar (Slidev's DrawingControls): tools, stroke width, colours, undo / redo / clear.
@Component({
  selector: 'app-drawing-controls',
  imports: [Draggable, IconBtn, T],
  templateUrl: './drawing-controls.html',
})
export class DrawingControls {
  protected drawings = inject(Drawings);
  protected colors = BRUSH_COLORS;
  // Each colour button says which colour it is (a screen reader would hear seven equal buttons otherwise).
  protected colorNames: Record<string, UiTextKey> = {
    '#ff595e': 'drawing.red',
    '#ffca3a': 'drawing.yellow',
    '#8ac926': 'drawing.green',
    '#1982c4': 'drawing.blue',
    '#6a4c93': 'drawing.purple',
    '#ffffff': 'drawing.white',
    '#000000': 'drawing.black',
  };
  protected widthOpen = signal(false);
  protected tools: { mode: ToolMode; title: UiTextKey; icon: string }[] = [
    { mode: 'stylus', title: 'drawing.stylus', icon: 'i-carbon:pen' },
    { mode: 'line', title: 'drawing.line', icon: 'i-carbon:subtract transform -rotate-45' },
    { mode: 'arrow', title: 'drawing.arrow', icon: 'i-carbon:arrow-up-right' },
    { mode: 'ellipse', title: 'drawing.ellipse', icon: 'i-carbon:radio-button' },
    { mode: 'rectangle', title: 'drawing.rectangle', icon: 'i-carbon:checkbox' },
    { mode: 'eraseLine', title: 'drawing.erase', icon: 'i-carbon:erase' },
  ];
}
