import { Component } from '@angular/core';

// Shown when the address matches no slide.
@Component({
  selector: 'sn-404',
  host: { class: 'block px-4 py-10 text-center text-teal-700 dark:text-gray-200' },
  templateUrl: './404.html',
})
export class NotFoundLayout {}
