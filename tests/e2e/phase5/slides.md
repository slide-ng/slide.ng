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
transition: my-fade
---

# Before a custom transition

---
transition:
  name: grow
  enterFromClass: grow-start
  enterActiveClass: grow-run
---

# After a custom transition

---

# After the object form
