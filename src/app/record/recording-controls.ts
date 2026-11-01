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
  templateUrl: './recording-controls.html',
})
export class RecordingControls {
  protected devices = inject(Devices);
  protected recorder = inject(Recorder);
  protected time = () => clock(this.recorder.seconds());
}
