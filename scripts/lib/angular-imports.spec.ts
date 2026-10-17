import { commonDirectives } from './angular-imports.mjs';

describe('commonDirectives', () => {
  it('finds the common directives a slide uses', () => {
    expect(
      commonDirectives(
        '<ng-container *ngTemplateOutlet="t; context: c" /><p [ngClass]="x" *ngIf="y">a</p>',
      ),
    ).toEqual({ '@angular/common': ['NgTemplateOutlet', 'NgClass', 'NgIf'] });
  });
  it('finds the forms directives', () => {
    expect(commonDirectives('<input [(ngModel)]="name">')).toEqual({
      '@angular/forms': ['FormsModule'],
    });
    expect(commonDirectives('<form [formGroup]="f"><input formControlName="a"></form>')).toEqual({
      '@angular/forms': ['ReactiveFormsModule'],
    });
  });
  it('looks at tags only, not at text', () => {
    expect(commonDirectives('<p>Use ngModel and *ngIf in components.</p>')).toEqual({});
  });
});
