---
name: latex
description: KaTeX math, inline and block, with click-stepped lines
---

# Math

KaTeX, drawn while generating. `$...$` is inline, `$$ ... $$` is a block. Inline math follows Slidev's rule, so `$5 and $10` stays text.

```md
Inline $\sqrt{3x-1}+(1+x)^2$

$$ {1|2|all}
\begin{aligned}
\nabla \cdot \vec{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \vec{B} &= 0
\end{aligned}
$$
```

- `{1|2|all}` after the opening `$$` steps through the lines with clicks (same range syntax as code). The lines are the rows of the environment (`\begin{aligned}`, split by `\\`); a step that picks none of them gets a warning.
- Inside math `{{` is math, never an interpolation.
- KaTeX CSS and fonts are in the build only when a deck uses math.
- `mhchem` is not loaded. Macros and options: `setup/katex.ts`, see `setup-katex.md`.

<!-- verify -->

```md
---
title: Math
---

# Math

Inline $\sqrt{3x-1}+(1+x)^2$ and price $5 and $10.

$$ {1|2|all}
\begin{aligned}
\nabla \cdot \vec{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \vec{B} &= 0
\end{aligned}
$$
```
