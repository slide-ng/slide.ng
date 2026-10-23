---
title: Languages
info: The same deck in English and Turkish.
languages:
  en: slides.md
  tr: slides.tr.md
---

# Hello

<p id="number">{{ 1234.5 | number }}</p>
<p id="date">{{ '2026-03-05' | date: 'longDate' }}</p>

---
layout: center
routeAlias: second
---

# Second slide

<p id="layout">{{ $frontmatter.layout }}</p>

---

# Only in English

This slide has no Turkish counterpart.
