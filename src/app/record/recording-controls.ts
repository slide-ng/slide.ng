import { Component, inject } from '@angular/core';
import { T } from '../i18n/t';
import { IconBtn } from '../ui/icon-btn';
import { Devices } from './devices';
import { Recorder } from './recorder';
import { clock } from './recording-file';

// Camera, record and pause buttons for the navigation bar (only when `record` is on).
@Component({
  selector: 'app-recording-controls',
  imports: [IconBtn, T],
  template: `
    @if (devices.available) {
      <button
        icon-btn
        id="nav-camera"
        [title]="(devices.cameraOn() ? 'nav.cameraHide' : 'nav.cameraShow') | t"
        [active]="devices.cameraOn()"
        (click)="devices.toggleCamera()"
      >
        <div [class]="devices.cameraOn() ? 'i-carbon:video' : 'i-carbon:video-off'"></div>
      </button>
      <button
        icon-btn
        id="nav-record"
        [title]="(recorder.active() ? 'nav.recordStop' : 'nav.recordStart') | t"
        (click)="recorder.active() ? recorder.stop() : recorder.start()"
      >
        <div
          [class]="
            recorder.active() ? 'i-carbon:stop-filled-alt color-red-500' : 'i-carbon:recording'
          "
        ></div>
      </button>
      @if (recorder.active()) {
        <button
          icon-btn
          id="nav-record-pause"
          [title]="(recorder.state() === 'paused' ? 'nav.recordResume' : 'nav.recordPause') | t"
          (click)="recorder.togglePause()"
        >
          <div
            [class]="
              recorder.state() === 'paused' ? 'i-carbon:play-filled-alt' : 'i-carbon:pause-filled'
            "
          ></div>
        </button>
        <span id="record-time" class="px-1 my-auto text-sm tabular-nums color-red-500">{{
          time()
        }}</span>
      }
      @if (recorder.error() || devices.error()) {
        <span
          id="record-error"
          class="px-1 my-auto text-xs color-red-500 max-w-40 truncate"
          [title]="recorder.error() || devices.error()"
          >{{ recorder.error() || devices.error() }}</span
        >
      }
      <div class="w-1px opacity-10 bg-current m-1 lg:m-2"></div>
    }
  `,
})
export class RecordingControls {
  protected devices = inject(Devices);
  protected recorder = inject(Recorder);
  protected time = () => clock(this.recorder.seconds());
}
