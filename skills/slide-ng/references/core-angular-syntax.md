---
name: angular-syntax
description: Angular template syntax inside slides.md, and the rules that keep the markdown converter from breaking it
---

# Angular in markdown

slide.ng is **not Vue**. Each slide becomes a standalone Angular component, compiled ahead of time. Write Angular template syntax, not Vue syntax.

| you want           | write (Angular)                         | never write (Vue)                               |
| ------------------ | --------------------------------------- | ----------------------------------------------- |
| show a value       | `{{ n }}`                               | `{{ n }}` (same text, but `n` is not a Vue ref) |
| condition          | `@if (n > 5) { ... } @else { ... }`     | `v-if`, `v-else`, `v-show`                      |
| loop               | `@for (x of xs; track x) { ... }`       | `v-for`                                         |
| switch             | `@switch (x) { @case (1) { ... } }`     | `v-if` chains                                   |
| local value        | `@let total = a + b;`                   | `<script setup>`, `ref()`, `computed()`         |
| bind a property    | `[prop]="expr"`                         | `:prop="expr"`, `v-bind`                        |
| listen to an event | `(click)="c.n.set(0)"`                  | `@click="x = 1"`, `v-on`                        |
| template reference | `<app-counter #c />` then `{{ c.n() }}` | `ref="c"`                                       |
| format a value     | `{{ price \| currency }}`               | Vue filters                                     |

A slide has no component class: an event handler cannot assign a slide field (`(click)="x = 1"` does not compile). Call a method or set a signal of a template reference instead. Angular's common pipes (`number`, `currency`, `percent`, `date`, `json`, `uppercase`, `lowercase`, `titlecase`, `slice`, `keyvalue`, `async`, `i18nPlural`, `i18nSelect`) work and are imported only where used, and so do the common directives (`*ngTemplateOutlet`, `[ngClass]`, `[ngStyle]`, `*ngIf`, `*ngFor`, `[ngSwitch]`) and the forms directives (`[(ngModel)]`, `[formGroup]`, `formControlName`).

Besides those, only the slide.ng directives exist (all start with `slide-ng-`): `slide-ng-click`, `slide-ng-after`, `slide-ng-click-hide`, `slide-ng-mark`, `slide-ng-motion`, `slide-ng-drag`. They are Angular attribute directives. Others (`v-if`, `v-for`, `v-model`, `v-html`, `v-bind`) are plain unknown attributes: no error, and they do nothing.

<!-- verify -->

```md
---
title: Angular in slides
---

# Angular templates

@let total = 2 + 3;

Total: {{ total }}

@if (total > 4) {
Big number.
} @else {
Small number.
}

@for (item of ['one', 'two', 'three']; track item) {

- {{ item }}

}
```

## Rules for the converter

The markdown is converted first, then Angular compiles the result. Follow these so nothing is rewritten:

- `@if`, `@for`, `@switch`, `@case`, `@else` lines (`@name ( ... ) {`) and the closing `}` or `} @else {` go on their own line.
- `@let name = value;` goes on its own line.
- A tag with a binding `[x]`, an event `(x)`, a `#ref` or a `*directive` is passed through untouched. Put it on its own line or inline in a paragraph. It may span several lines when it starts its first line and `>` or `/>` ends the last (`@let` may span lines too). A wrapper tag alone on its line keeps the lines below it as HTML until the next empty line, as a plain HTML tag does: leave an empty line after it to write markdown inside.
- `{{ ... }}` is passed through untouched. Inside math, `{{` stays math.
- A single `{`, `}` or `@` in normal text (an email address) is escaped for you.
- A slide has no component class of its own, so it has no fields. Share state inside a slide with template references (`<app-counter #c />`) or `@let`.
- Code fences and inline code are always plain text: `{{ x }}` and `@if` inside them are shown, not run.
- Markdown inside a component tag: leave an empty line after the opening tag and before the closing tag, as in `<slide-ng-clicks>` lists.

## Tags

Component tags are lower-case with dashes: `<slide-ng-toc />`, `<slide-ng-auto-fit-text>`. Slidev's `<Toc />`, `<Arrow />`, `<VClicks>`, `<SlidevVideo>` and the other PascalCase names stop the generator with the new name (`"<Toc>" was renamed to slide-ng-toc`). An unknown tag with a dash is also a build error; an unknown attribute is silently ignored.

Everything that a Slidev deck gets from `$slidev`, `$nav` or `$clicks` is Angular injection in a component, see `core-injection.md`.
