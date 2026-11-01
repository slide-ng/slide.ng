import { Component, inject } from '@angular/core';
import { T } from '../i18n/t';
import { Devices } from './devices';
import { Recorder } from './recorder';

// Settings entries for camera, microphone, mirroring and what the recording captures.
@Component({
  selector: 'app-devices-selectors',
  imports: [T],
  templateUrl: './devices-selectors.html',
})
export class DevicesSelectors {
  protected devices = inject(Devices);
  protected recorder = inject(Recorder);
}
