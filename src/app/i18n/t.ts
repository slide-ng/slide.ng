import { Pipe, PipeTransform, inject } from '@angular/core';
import { UiTextKey } from './en';
import { UI_TEXT, UiTextParams, uiText } from './ui-text';

// `{{ 'nav.next' | t }}` and `{{ 'presenter.noNotes' | t: { no: nav.no() } }}`: a text of the interface in the deck's language.
// Pure: the dictionary never changes while the app runs, so a result only changes with the key or the values.
@Pipe({ name: 't' })
export class T implements PipeTransform {
  private dictionary = inject(UI_TEXT);

  transform(key: UiTextKey, params?: UiTextParams): string {
    return uiText(this.dictionary, key, params);
  }
}
