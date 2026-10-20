---
title: Setup deck
colorSchema: light
presenter: false
fonts:
  mono: Courier New
  provider: none
---

# Math, code and text

Inline math with a macro: $\RR$

Text from a transformer: [[[from pre]]]

PREPARSED

```ts
const a: number = 1
```

```rust
fn main() {}
```

```myblock
hello setup
```

---

# A diagram

```mermaid
graph TD; A-->B
```

---

# Editors

```ts {monaco}
const x = 1
```

```python {monaco-run}
print(1 + 1)
```

---
layout: center
routeAlias: globals
---

# Global context

<p id="globals">page {{ $page() }} of {{ $nav.total }}, {{ $slidev.configs.title }}, {{ $frontmatter.layout }}, shown {{ $nav.currentPage() }} {{ $nav.currentLayout() }}, {{ $renderContext() }}</p>

<div slide-ng-click>step</div>

@if ($clicks() > 0) {
<p id="after-click">clicked {{ $clicks() }}</p>
}

<button id="globals-first" (click)="$nav.go(1)">first</button>
