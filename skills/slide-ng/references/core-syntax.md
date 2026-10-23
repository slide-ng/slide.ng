---
name: syntax
description: Slide separators, frontmatter, speaker notes and the shape of slides.md
---

# Syntax

All slides live in one file, `slides.md`.

- A line with only `---` separates slides.
- A YAML block between two `---` lines at the top of a slide is that slide's **frontmatter**. The frontmatter of the first slide is the **headmatter** and describes the whole deck.
- The last HTML comment of a slide is its **speaker note**.
- A fenced block starting with ` ```yaml ` at the top of a slide is read as its frontmatter too.
- Text is markdown; HTML and Angular template syntax work inside it (see `core-angular-syntax.md`).

<!-- verify -->

```md
---
title: My talk
---

# First slide

Plain **markdown**, a list and a table.

- one
- two

| a   | b   |
| --- | --- |
| 1   | 2   |

<!-- Notes for the presenter. -->

---
layout: center
class: text-center
---

# Second slide

Centered.

---

# Third slide

Count is {{ 1 + 2 }}.
```

## Rules

- The first slide is layout `cover` unless you set one, all others `default`.
- Slide numbers start at 1 and count every slide, including the first. `hide: true` or `disabled: true` removes a slide.
- Any frontmatter key that slide.ng does not know is kept in the slide's metadata and ignored.
- The generator warns (`[slides] ...`) about an unknown layout (naming the nearest one), an unknown `slide-ng-*` element or attribute, a picture with a leading `/` that `public/` does not have (`/public/x.png` is wrong: write `/x.png`), an unknown code language and a `::slot::` the layout does not have; the deck still builds.
- A broken frontmatter stops the build at the line of the error, in plain words: quote a value that has `: ` in it (`title: "Part 2: more"`), indent with spaces, and close the frontmatter with `---`.
- A `---` followed directly by `key: value` lines and a closing `---` is frontmatter. For a slide that has no frontmatter, put a blank line after the plain `---` separator so its first lines are not read as YAML.

## Speaker notes

```md
# Slide

<!-- This text is a note. [click] A marker for the first click. -->
```

The note is stored in the metadata and shown on the presenter page. See `presenter-notes.md` and `animation-click-marker.md`.

## Links

A markdown link to a slide moves inside the deck, as in Slidev; a link to a web page opens a new tab.

<!-- verify -->

```md
---
title: Links
---

# Start {#start}

[to slide 2](2), [also](/2), [also](./2), [also](#/2), [by alias](/details)

[a heading here](#start) and [the docs](https://example.org)

---
routeAlias: details
---

# Details
```

- Only digits, or `/`, `./`, `#/` followed by a slide number or a `routeAlias`, makes a slide link (`<slide-ng-link>`); an alias may be unicode or an emoji. Other `/x` and `./x` addresses stay plain links. The generator warns about `[far](99)` past the last slide, `./name` that is no alias, and the alias of a `hide:` slide.
- `#id` scrolls to an element of the slide; `#5` is such an anchor, not slide 5.
- `http(s)` links get `target="_blank" rel="noopener"`; `mailto:` and others do not.
- An `<a href="/3">` written as HTML (`/`, `./` or `#/` with a slide number or `routeAlias`, and no attributes but `class`, `id`, `style`) becomes a slide link too; any other `<a>` is left as written. `<slide-ng-link to="3">` is the sure way in HTML.
- In a PDF a slide link points at that slide's page; a link to another address of the deck's site has no link there. In speaker notes a slide link stays a plain address; clicked in the presenter it moves the presenter to that slide.

## Per-slide style

A `<style>` block in a slide only applies to that slide. See `core-styling.md`.
