---
title: slide.ng showcase
info: |
  This deck is used by the browser tests.

  **Bold info.**
defaults: 
  hideInToc: true
---

# Showcase

Cover layout (the first slide).

---
layout: intro
---

# intro layout

A short description.

---

# default layout

Normal content.

---
layout: center
---

# center layout

---
layout: fact
---

# 100%

fact layout

---
layout: full
---

# full layout

---
layout: image
image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Crect width='10' height='10' fill='%2300aaff'/%3E%3C/svg%3E"
---

# image layout

---
layout: image-left
image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Crect width='10' height='10' fill='%2300aaff'/%3E%3C/svg%3E"
class: content-class
---

# image-left layout

---
layout: image-right
image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Crect width='10' height='10' fill='%2300aaff'/%3E%3C/svg%3E"
class: content-class
---

# image-right layout

---
layout: iframe
url: "data:text/html,<h1 id='framed'>framed page</h1>"
---



---
layout: iframe-left
url: "data:text/html,<h1 id='framed'>framed page</h1>"
class: content-class
---

# iframe-left layout

---
layout: iframe-right
url: "data:text/html,<h1 id='framed'>framed page</h1>"
class: content-class
---

# iframe-right layout

---
layout: none
---

# none layout

---
layout: quote
---

# "A quote"

quote layout

---
layout: section
---

# section layout

---
layout: statement
---

# statement layout

---
layout: two-cols
---

# two-cols layout

left text

::right::

right text

---
layout: two-cols-header
---

# two-cols-header layout

::left::

left text

::right::

right text

::bottom::

bottom text

---
layout: end
---



---
hideInToc: false
---

# Contents

<div id="toc-all">

<slide-ng-toc columns="2" />

</div>

<div id="toc-top">

<slide-ng-toc maxDepth="1" listClass="my-list" />

</div>

---
hideInToc: false
---

# Part A

Level 1.

---
hideInToc: false
---

## A one

Level 2.

---
hideInToc: false
---

## A two

<div id="toc-current">

<slide-ng-toc mode="onlyCurrentTree" />

</div>

---
hideInToc: false
---

# Part B

Level 1.

---
hideInToc: false
---

## B one

Level 2.

---

# Components

<p id="c-no">no <slide-ng-current-no /> of <slide-ng-total /></p>

<slide-ng-light-or-dark><div dark id="c-dark">dark text</div><div light id="c-light">light text</div></slide-ng-light-or-dark>

<slide-ng-render-when context="slide"><div id="c-slide">only on the slide</div><div fallback id="c-other">somewhere else</div></slide-ng-render-when>

<slide-ng-link to="3" id="c-link">to slide 3</slide-ng-link> and <slide-ng-link to="the-alias" id="c-alias">to the alias</slide-ng-link>

[markdown link to 3](3), [markdown link to the alias](/the-alias) and [a web page](https://example.org)

<div id="c-switch-wrap">

<slide-ng-switch>
<div at="1" id="sw1">switch one</div>
<div at="2" id="sw2">switch two</div>
<div at="3-4" id="sw3">switch three</div>
</slide-ng-switch>

<slide-ng-click-gap size="2" />

<div id="after-gap" slide-ng-click>after the gap</div>

</div>

---
routeAlias: the-alias
---

# Alias slide

Open as /the-alias.

---
clicks: 3
---

# Clicks override

<div slide-ng-click>one click only</div>

---

# Red heading

<style>
h1 { color: rgb(255, 0, 0); }
</style>

---

# Not red

The style above is scoped to its own slide.

---
src: ./pages/extra.md#1-2
class: from-main
---

ignored

---
transition: slide-left
---

# transition slide-left

---
transition: fade
---

# transition fade

---
transition: view-transition
---

# transition after fade

<h2 style="view-transition-name: vt-hero">Shared title</h2>

---

# transition after view-transition

<h2 style="view-transition-name: vt-hero">Shared title</h2>

---

# Speaker notes

The note is not shown.

<!-- This is the note. -->
