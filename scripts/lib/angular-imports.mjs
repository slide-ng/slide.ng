// Angular's common and forms directives that a slide uses (`*ngTemplateOutlet`, `[ngClass]`, `[(ngModel)]`, `[formGroup]`),
// so the generated component can import them. Only attribute names are searched, outside code samples.

const DIRECTIVES = [
  ['@angular/common', 'NgTemplateOutlet', /ngTemplateOutlet\b/],
  ['@angular/common', 'NgComponentOutlet', /ngComponentOutlet\b/],
  ['@angular/common', 'NgClass', /\[ngClass\]/],
  ['@angular/common', 'NgStyle', /\[ngStyle\]/],
  ['@angular/common', 'NgIf', /\*ngIf\b|\[ngIf\]/],
  ['@angular/common', 'NgForOf', /\*ngFor\b|\[ngForOf\]/],
  ['@angular/common', 'NgSwitch', /\[ngSwitch\]/],
  ['@angular/common', 'NgSwitchCase', /ngSwitchCase\b/],
  ['@angular/common', 'NgSwitchDefault', /ngSwitchDefault\b/],
  ['@angular/common', 'NgPlural', /\[ngPlural\]/],
  ['@angular/common', 'NgPluralCase', /ngPluralCase\b/],
  ['@angular/forms', 'FormsModule', /\bngModel(?:Group)?\b|#\w+="ngForm"/],
  [
    '@angular/forms',
    'ReactiveFormsModule',
    /\[formGroup\]|\[formControl\]|\bformControlName\b|\bformGroupName\b|\bformArrayName\b/,
  ],
];

/** The directives a slide's markup uses, grouped by package: `{ '@angular/common': ['NgClass'] }`. */
export function commonDirectives(markup) {
  const tags = (markup.match(/<[A-Za-z][^>]*>/g) ?? []).join('\n');
  const found = {};
  for (const [pkg, name, test] of DIRECTIVES) if (test.test(tags)) (found[pkg] ??= []).push(name);
  return found;
}
