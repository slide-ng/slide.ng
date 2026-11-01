import { Component, input } from '@angular/core';

// A round icon button, used as `<button icon-btn title="..."><div class="i-carbon:apps"></div></button>`.
// The title is also the label for screen readers. `disabled` greys it out and the button cannot be focused or pressed.
@Component({
  selector: 'button[icon-btn]',
  host: {
    class: 'slidev-icon-btn',
    type: 'button',
    '[class.disabled]': 'disabled()',
    '[class.active]': 'active()',
    '[attr.aria-disabled]': 'disabled()',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.title]': 'label()',
  },
  templateUrl: './icon-btn.html',
})
export class IconBtn {
  label = input.required<string>({ alias: 'title' });
  disabled = input(false);
  active = input(false);
}
