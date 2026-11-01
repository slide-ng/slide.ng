// A PlantUML diagram drawn by a PlantUML server: just an <img> whose address holds the encoded diagram.
// The server is `plantUmlServer` in the headmatter (the generator writes it into `server`).
import { Component, computed, input, signal } from '@angular/core';
import { optionalNumber } from '../lib/attrs';

@Component({
  selector: 'slide-ng-plant-uml',
  host: { class: 'inline-block', '[attr.data-slide-ng-waitfor]': 'pending() ? "img" : null' },
  templateUrl: './plant-uml.html',
})
export class PlantUml {
  code = input.required<string>(); // the diagram, encoded for PlantUML (done by the generator)
  server = input('https://www.plantuml.com/plantuml');
  scale = input<number | undefined, unknown>(undefined, { transform: optionalNumber });
  alt = input('PlantUML diagram');

  protected pending = signal(true);
  protected url = computed(() => `${this.server()}/svg/${this.code()}`);
}
