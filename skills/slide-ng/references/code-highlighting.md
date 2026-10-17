---
name: code-highlighting
description: Fenced code blocks, titles, Shiki themes and the copy button
---

# Code blocks

Fences are coloured with Shiki while the slides are generated, so the browser gets finished HTML. The language is the first word. Everything after it is optional, in this order:

````md
```ts [title.ts] {6,7|9|all} {lines:true, startLine:5, maxHeight:'100px'}
const a = 1;
```
````

| part                        | meaning                                          |
| --------------------------- | ------------------------------------------------ |
| `[title.ts]`                | title bar above the block                        |
| `{2,3}`, `{1\|3-4\|all}`    | line highlights, see `code-line-highlighting.md` |
| `{lines:true, startLine:5}` | see `code-line-numbers.md`                       |
| `{maxHeight:'100px'}`       | see `code-max-height.md`                         |

Options are a second brace, `{key:value, ...}`, with simple values only (numbers, `true`/`false`, text).

- Hover a block for the copy button; `codeCopy: false` in the headmatter removes it.
- Colours: `shiki: { themes: { light: 'vitesse-light', dark: 'vitesse-dark' } }` in the headmatter; `codeAliases: { mylang: 'ts' }` for extra language names. More control: `setup-shiki.md`.
- A language Shiki does not know is shown plain, with a `[slides]` warning.
- Code inside fences and inline code is plain text; Angular syntax in it is not run.
- Other fence kinds: `mermaid`, `plantuml`, `{monaco}`, `magic-move`, `twoslash`, `::code-group`, `<<<` (see the other `code-*` and `diagram-*` references).

<!-- verify -->

````md
---
title: Code
codeAliases:
  mylang: ts
shiki:
  themes:
    light: vitesse-light
    dark: vitesse-dark
---

# Code

```ts [hello.ts]
const hello = (name: string) => `Hello ${name}`;
```

```mylang
const x = 1;
```

Inline `{{ x }}` stays text.
````
