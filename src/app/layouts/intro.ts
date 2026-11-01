import { Component } from '@angular/core';

// Introduce the talk: title, short description, author.
@Component({
  selector: 'sn-intro',
  host: { class: 'slidev-layout intro' },
  templateUrl: './intro.html',
})
export class IntroLayout {}
