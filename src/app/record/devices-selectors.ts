import { Component, inject } from '@angular/core';
import { T } from '../i18n/t';
import { Devices } from './devices';
import { Recorder } from './recorder';

// Settings entries for camera, microphone, mirroring and what the recording captures.
@Component({
  selector: 'app-devices-selectors',
  imports: [T],
  template: `
    @if (devices.available) {
      <div class="flex flex-col gap-1 text-sm">
        <label class="flex items-center gap-4">
          <span class="me-auto">{{ 'settings.camera' | t }}</span>
          <select
            id="camera-select"
            class="bg-main border border-main rounded max-w-40"
            [value]="devices.cameraId()"
            (change)="devices.cameraId.set($any($event.target).value)"
            (focus)="devices.refresh()"
          >
            <option value="">{{ 'settings.defaultDevice' | t }}</option>
            @for (d of devices.cameras(); track d.deviceId) {
              <option [value]="d.deviceId">{{ d.label || ('settings.camera' | t) }}</option>
            }
          </select>
        </label>
        <label class="flex items-center gap-4">
          <span class="me-auto">{{ 'settings.microphone' | t }}</span>
          <select
            id="mic-select"
            class="bg-main border border-main rounded max-w-40"
            [value]="devices.micId()"
            (change)="devices.micId.set($any($event.target).value)"
            (focus)="devices.refresh()"
          >
            <option value="">{{ 'settings.defaultDevice' | t }}</option>
            @for (d of devices.mics(); track d.deviceId) {
              <option [value]="d.deviceId">{{ d.label || ('settings.microphone' | t) }}</option>
            }
          </select>
        </label>
        <label class="flex items-center gap-4 cursor-pointer">
          <span class="me-auto">{{ 'settings.mirrorCamera' | t }}</span>
          <input
            type="checkbox"
            id="camera-mirror"
            [checked]="devices.mirror()"
            (change)="devices.mirror.set(!devices.mirror())"
          />
        </label>
        <div class="flex items-center gap-4">
          <span class="me-auto">{{ 'settings.record' | t }}</span>
          <div class="flex rounded border border-main overflow-hidden">
            <button
              type="button"
              id="record-screen"
              class="px-2 py-0.5"
              [class.bg-active]="recorder.source() === 'screen'"
              (click)="recorder.source.set('screen')"
            >
              {{ 'settings.recordScreen' | t }}
            </button>
            <button
              type="button"
              id="record-camera"
              class="px-2 py-0.5"
              [class.bg-active]="recorder.source() === 'camera'"
              (click)="recorder.source.set('camera')"
            >
              {{ 'settings.recordCamera' | t }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class DevicesSelectors {
  protected devices = inject(Devices);
  protected recorder = inject(Recorder);
}
