import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { registerOfflineWorker } from './lib/offline-worker';
import { WakeLock } from './lib/wake-lock';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  // Created here so the wake lock works from the first page, not only once the settings menu is opened.
  private wake = inject(WakeLock);

  constructor() {
    registerOfflineWorker();
  }
}
