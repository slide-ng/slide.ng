---
name: setup-preparser
description: setup/preparser.ts - extend Slidev's parser
---

# setup/preparser.ts

Runs when the markdown file is read, before it is cut into slides. Gets `{ filepath, headmatter, mode }` (the headmatter over the deck's `slide-ng.config.yaml`, if any) and returns a list of extensions of Slidev's parser: `transformRawLines(lines)` (change the array in place), `transformSlide(content, frontmatter)` (return new text), `transformNote(note, frontmatter)`. The extensions of all roots are used.

<!-- verify-file: setup/preparser.ts -->

```ts
export default () => [
  {
    name: 'shout',
    transformRawLines(lines: string[]) {
      lines.forEach((line, i) => {
        if (line.startsWith('!! ')) lines[i] = `# ${line.slice(3).toUpperCase()}`;
      });
    },
  },
];
```

<!-- verify -->

```md
---
title: Preparser
---

!! loud title
```
