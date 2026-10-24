import { Component, inject } from '@angular/core';
import { Dark } from '../lib/dark';
import { Download } from '../lib/download';
import { Nav } from '../lib/nav';
import { Ui } from '../lib/ui-state';
import { WakeLock } from '../lib/wake-lock';
import { PresenterPrefs } from '../presenter/prefs';
import { DevicesSelectors } from '../record/devices-selectors';
import { Devices } from '../record/devices';
import { T } from '../i18n/t';
import { FilterSettings } from './filter-settings';
import { NavPositionSettings } from './nav-position-settings';
import { SegmentControl } from './segment-control';

// The content of the settings menu ("More Options").
@Component({
  selector: 'app-settings',
  imports: [DevicesSelectors, FilterSettings, NavPositionSettings, SegmentControl, T],
  template: `
    <div class="text-sm select-none flex flex-col gap-1 min-w-30 px-4 max-h-[70vh] overflow-auto">
      <app-filter-settings />
      <div class="h-1px op5 bg-current w-full my-2"></div>
      <div class="slidev-form-item">
        <span class="slidev-form-title">{{ 'settings.cursorStyle' | t }}</span>
        <app-segment-control
          [options]="cursorOptions"
          [value]="prefs.cursorStyle()"
          (changed)="prefs.cursorStyle.set($any($event))"
        />
      </div>
      @if (!nav.isPresenter) {
        <div class="slidev-form-item">
          <span class="slidev-form-title">{{ 'settings.slideScale' | t }}</span>
          <app-segment-control
            [options]="scaleOptions"
            [value]="ui.slideScale()"
            (changed)="ui.slideScale.set($any($event))"
          />
        </div>
        <!-- The presenter page keeps its own bar -->
        <app-nav-position-settings />
      }
      @if (wake.supported) {
        <label class="slidev-form-item">
          <span class="slidev-form-title">{{ 'settings.wakeLock' | t }}</span>
          <span class="slidev-checkbox">
            <i class="i-carbon:checkmark" [class.op0]="!wake.enabled()"></i>
            <input
              type="checkbox"
              id="wake-lock"
              [attr.data-held]="wake.held()"
              [checked]="wake.enabled()"
              (change)="wake.enabled.set(!wake.enabled())"
            />
          </span>
        </label>
      }
      @if (!nav.isPresenter) {
        <label class="slidev-form-item">
          <span class="slidev-form-title">{{ 'settings.hideIdleCursor' | t }}</span>
          <span class="slidev-checkbox">
            <i class="i-carbon:checkmark" [class.op0]="!ui.hideIdleCursor()"></i>
            <input
              type="checkbox"
              id="hide-idle-cursor"
              [checked]="ui.hideIdleCursor()"
              (change)="ui.hideIdleCursor.set(!ui.hideIdleCursor())"
            />
          </span>
        </label>
      }
      @if (nav.isPresenter) {
        <label class="slidev-form-item">
          <span class="slidev-form-title">{{ 'settings.presenterCursor' | t }}</span>
          <span class="slidev-checkbox">
            <i class="i-carbon:checkmark" [class.op0]="!prefs.showCursor()"></i>
            <input
              type="checkbox"
              id="settings-cursor"
              [checked]="prefs.showCursor()"
              (change)="prefs.toggleCursor()"
            />
          </span>
        </label>
      }
      @if (!dark.isFixed) {
        <div class="h-1px op5 bg-current w-full my-2"></div>
        <label class="slidev-form-item">
          <span class="slidev-form-title">{{ 'settings.darkMode' | t }}</span>
          <span class="slidev-checkbox">
            <i class="i-carbon:checkmark" [class.op0]="!dark.isDark()"></i>
            <input
              type="checkbox"
              id="settings-dark"
              [checked]="dark.isDark()"
              (change)="dark.toggle()"
            />
          </span>
        </label>
      }
      @if (devices.available) {
        <div class="h-1px op5 bg-current w-full my-2"></div>
        <app-devices-selectors />
      }
      @if (download.wanted) {
        <div class="h-1px op5 bg-current w-full my-2"></div>
        @if (download.available()) {
          <button type="button" id="download-pdf" class="text-start" (click)="download.save()">
            {{ 'nav.download' | t }}
          </button>
        } @else {
          <button
            type="button"
            id="download-pdf"
            class="text-start op40 cursor-not-allowed"
            disabled
            [title]="'settings.downloadHint' | t"
          >
            {{ 'nav.download' | t }}
          </button>
        }
      }
    </div>
  `,
})
export class Settings {
  protected ui = inject(Ui);
  protected dark = inject(Dark);
  protected nav = inject(Nav);
  protected prefs = inject(PresenterPrefs);
  protected wake = inject(WakeLock);
  protected download = inject(Download);
  protected devices = inject(Devices);
  // `hue` keeps each badge's colour the same in every language (it is made from the English name).
  protected cursorOptions = [
    {
      id: 'cursor-style-cursor',
      label: this.ui.text('settings.cursor'),
      hue: 'Cursor',
      value: 'cursor',
    },
    {
      id: 'cursor-style-laser',
      label: this.ui.text('settings.laser'),
      hue: 'Laser',
      value: 'laser',
    },
  ];
  protected scaleOptions = [
    { id: 'scale-fit', label: this.ui.text('settings.fit'), hue: 'Fit', value: 0 },
    { id: 'scale-1', label: '1:1', value: 1 },
  ];
}
