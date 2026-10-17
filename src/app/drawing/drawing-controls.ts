import { Component, inject, signal } from '@angular/core';
import { IconBtn } from '../ui/icon-btn';
import { Draggable } from './draggable';
import { BRUSH_COLORS, Drawings, ToolMode } from './drawings';

// The drawing toolbar (Slidev's DrawingControls): tools, stroke width, colours, undo / redo / clear.
@Component({
  selector: 'app-drawing-controls',
  imports: [Draggable, IconBtn],
  template: `
    @if (drawings.available && (drawings.enabled() || drawings.pinned())) {
      <app-draggable
        id="drawing-toolbar"
        class="flex flex-wrap text-xl p-2 gap-1 rounded-md bg-main text-main shadow transition-opacity duration-200 border border-main"
        [class]="!drawings.enabled() && drawings.pinned() ? 'opacity-40 hover:opacity-90' : ''"
      >
        @for (tool of tools; track tool.mode) {
          <button
            icon-btn
            [id]="'tool-' + tool.mode"
            [title]="tool.title"
            [class.shallow]="drawings.mode() !== tool.mode"
            [active]="drawings.mode() === tool.mode"
            (click)="drawings.pickTool(tool.mode)"
          >
            <div [class]="tool.icon"></div>
          </button>
        }
        <div class="w-1px opacity-10 bg-current m-1"></div>
        <div class="relative flex">
          <button
            icon-btn
            id="stroke-width"
            title="Adjust stroke width"
            [class.shallow]="drawings.mode() === 'eraseLine'"
            (click)="widthOpen.set(!widthOpen())"
          >
            <svg viewBox="0 0 32 32" width="1.2em" height="1.2em">
              <line
                x1="2"
                y1="15"
                x2="22"
                y2="4"
                stroke="currentColor"
                stroke-width="1"
                stroke-linecap="round"
              />
              <line
                x1="2"
                y1="24"
                x2="28"
                y2="10"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
              <line
                x1="7"
                y1="31"
                x2="29"
                y2="19"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
              />
            </svg>
          </button>
          @if (widthOpen()) {
            <div
              class="absolute top-full left-0 mt-1 flex bg-main border border-main rounded p-2 shadow z-nav"
            >
              <div id="stroke-size" class="inline-block w-7 text-center">
                {{ drawings.brush().size }}
              </div>
              <input
                id="stroke-range"
                aria-label="Stroke width"
                type="range"
                min="1"
                max="15"
                [value]="drawings.brush().size"
                (input)="drawings.setSize(+$any($event.target).value)"
              />
            </div>
          }
        </div>
        @for (color of colors; track color) {
          <button
            icon-btn
            class="color-btn"
            [attr.data-color]="color"
            [title]="'Brush color: ' + colorNames[color]"
            [active]="drawings.brush().color === color && drawings.mode() !== 'eraseLine'"
            (click)="drawings.pickColor(color)"
          >
            <div
              class="w-6 h-6 transition-all transform border"
              [class]="
                drawings.brush().color !== color
                  ? 'rounded-1/2 scale-85 border-white'
                  : 'rounded-md border-gray-300/50'
              "
              [style.background]="drawings.enabled() ? color : null"
              [style.border-color]="drawings.enabled() ? null : color"
            ></div>
          </button>
        }
        <div class="w-1px opacity-10 bg-current m-1"></div>
        <button
          icon-btn
          id="draw-undo"
          title="Undo"
          [class.disabled]="!drawings.canUndo()"
          (click)="drawings.undo()"
        >
          <div class="i-carbon:undo"></div>
        </button>
        <button
          icon-btn
          id="draw-redo"
          title="Redo"
          [class.disabled]="!drawings.canRedo()"
          (click)="drawings.redo()"
        >
          <div class="i-carbon:redo"></div>
        </button>
        <button
          icon-btn
          id="draw-clear"
          title="Delete"
          [class.disabled]="!drawings.canClear()"
          (click)="drawings.clear()"
        >
          <div class="i-carbon:trash-can"></div>
        </button>
        <div class="w-1px opacity-10 bg-current m-1"></div>
        <button
          icon-btn
          id="draw-pin"
          [title]="drawings.pinned() ? 'Unpin drawing' : 'Pin drawing'"
          [class.shallow]="!drawings.pinned()"
          (click)="drawings.pinned.set(!drawings.pinned())"
        >
          <div
            [class]="
              drawings.pinned() ? 'i-carbon:pin-filled transform -rotate-45' : 'i-carbon:pin'
            "
          ></div>
        </button>
        @if (drawings.enabled()) {
          <button
            icon-btn
            id="draw-close"
            [title]="
              drawings.pinned()
                ? 'Close the drawing tools (the drawing stays)'
                : 'Close the drawing tools'
            "
            (click)="drawings.enabled.set(false)"
          >
            <div [class]="drawings.pinned() ? 'i-carbon:error' : 'i-carbon:close-outline'"></div>
          </button>
        }
      </app-draggable>
    }
  `,
})
export class DrawingControls {
  protected drawings = inject(Drawings);
  protected colors = BRUSH_COLORS;
  // Each colour button says which colour it is (a screen reader would hear seven equal buttons otherwise).
  protected colorNames: Record<string, string> = {
    '#ff595e': 'red',
    '#ffca3a': 'yellow',
    '#8ac926': 'green',
    '#1982c4': 'blue',
    '#6a4c93': 'purple',
    '#ffffff': 'white',
    '#000000': 'black',
  };
  protected widthOpen = signal(false);
  protected tools: { mode: ToolMode; title: string; icon: string }[] = [
    { mode: 'stylus', title: 'Draw with stylus', icon: 'i-carbon:pen' },
    { mode: 'line', title: 'Draw a line', icon: 'i-carbon:subtract transform -rotate-45' },
    { mode: 'arrow', title: 'Draw an arrow', icon: 'i-carbon:arrow-up-right' },
    { mode: 'ellipse', title: 'Draw an ellipse', icon: 'i-carbon:radio-button' },
    { mode: 'rectangle', title: 'Draw a rectangle', icon: 'i-carbon:checkbox' },
    { mode: 'eraseLine', title: 'Erase', icon: 'i-carbon:erase' },
  ];
}
