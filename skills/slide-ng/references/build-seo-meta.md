---
name: build-seo-meta
description: Page head - title, description, favicon, lang, Open Graph and Twitter tags
---

# Head and SEO

All in the headmatter:

```yaml
title: My talk
titleTemplate: '%s | Conf 2026' # %s is the title
info:
  | # markdown for the info dialog; without its markup (up to 300 chars) it is also the page description and the PDF subject
  ## About this talk
author: Ada
keywords: [angular, slides] # a list or comma separated text
lang: en # <html lang>
favicon: /favicon.ico # a file of public/, or a web address
htmlAttrs: { data-theme: x }
seoMeta: # Open Graph and Twitter tags: ogTitle, ogDescription, ogImage, ogUrl, twitterCard, ...
  ogImage: auto
  ogUrl: https://example.org/talk
```

See `build-og-image.md` for `ogImage` and `ogUrl`.

<!-- verify -->

```md
---
title: My talk
titleTemplate: '%s | Conf 2026'
info: |
  ## About this talk
author: Ada
keywords: [angular, slides]
lang: en
favicon: /favicon.ico
htmlAttrs:
  data-theme: x
seoMeta:
  ogTitle: My talk
  ogUrl: https://example.org/talk
  twitterCard: summary_large_image
---

# My talk
```
