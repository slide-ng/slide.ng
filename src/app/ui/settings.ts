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
import { TimerPrefs } from './timer-prefs';
import { HEADMATTER } from '../../slides/generated';
import { parseDuration } from '../presenter/timer';

// The content of the settings menu ("More Options").
@Component({
  selector: 'app-settings',
  imports: [DevicesSelectors, FilterSettings, NavPositionSettings, SegmentControl, T],
  templateUrl: './settings.html',
})
export class Settings {
  protected ui = inject(Ui);
  protected dark = inject(Dark);
  protected nav = inject(Nav);
  protected prefs = inject(PresenterPrefs);
  protected wake = inject(WakeLock);
  protected download = inject(Download);
  protected devices = inject(Devices);
  protected timerPrefs = inject(TimerPrefs);
  protected deckMinutes = String(Math.round(parseDuration(HEADMATTER['duration']) / 60));
  protected timerSizes = [
    { id: 'timer-size-s', label: 'S', value: 's' },
    { id: 'timer-size-m', label: 'M', value: 'm' },
    { id: 'timer-size-l', label: 'L', value: 'l' },
  ];
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
  protected setMinutes(input: HTMLInputElement) {
    this.timerPrefs.setMinutes(input.value);
    input.value = String(this.timerPrefs.minutes() ?? '');
  }
  protected setStart(input: HTMLInputElement) {
    this.timerPrefs.setStart(input.value);
    input.value = String(this.timerPrefs.startSlide() ?? '');
  }
  protected timerFades = [
    { id: 'timer-fade-idle', label: this.ui.text('settings.timerFadeIdle'), value: 'idle' },
    { id: 'timer-fade-always', label: this.ui.text('settings.timerFadeAlways'), value: 'always' },
  ];
}
