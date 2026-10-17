<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme-banner-dark.png">
  <img alt="slide.ng" src="docs/assets/readme-banner-light.png" width="800">
</picture>

# slide.ng

[![License: MIT](https://img.shields.io/badge/license-MIT-CC4209.svg)](LICENSE)
[![Sponsor](https://img.shields.io/badge/sponsor-erkamyaman-db61a2?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/erkamyaman)

Presentations written in markdown, with real Angular template syntax inside. Inspired by [Slidev](https://sli.dev), built for Angular.

## Quick start

You need Node 22.22.3 or newer.

```sh
npx @slide-ng/core create my-talk
cd my-talk
npm install
npm run dev     # dev server at http://localhost:4230
npm run build   # a static site in dist/
npm run export  # a PDF
```

Every command and flag is in [docs/CLI.md](docs/CLI.md). Everything is documented at [slide-ng.dev](https://slide-ng.dev) and in [docs/](docs/).

To work on slide.ng itself, clone this repository and run `npm install` and `npm start` (the example deck); other commands are run with
`node bin/slide-ng.mjs <command>`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Features

- Slides from one markdown file, with Angular templates inside.
- The 19 Slidev layouts, clicks, transitions, speaker notes and a presenter view.
- Code with Shiki, Magic Move, Twoslash and Monaco, plus KaTeX and Mermaid.
- Export to PDF, PNG, PPTX and Markdown; static and offline builds.
- Themes and addons, an MCP server and an agent skill.

Status and gaps: [docs/STATUS.md](docs/STATUS.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Report security problems through [SECURITY.md](SECURITY.md).

## Maintainers

<!-- prettier-ignore-start -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/erkamyaman"><img src="https://avatars.githubusercontent.com/u/88717125?v=4&s=100" width="100px;" alt="Erkam Yaman"/><br /><sub><b>Erkam Yaman</b></sub></a><br /><sub>Maintainer</sub></td>
    </tr>
  </tbody>
</table>
<!-- prettier-ignore-end -->

## Contributors

Thanks to everyone who has helped. This project follows the [all-contributors](https://allcontributors.org) specification. Contributions of any kind welcome!

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/erkamyaman"><img src="https://avatars.githubusercontent.com/u/88717125?v=4?s=100" width="100px;" alt="Erkam Yaman"/><br /><sub><b>Erkam Yaman</b></sub></a><br /><a href="https://github.com/slide-ng/slide.ng/commits?author=erkamyaman" title="Code">💻</a> <a href="https://github.com/slide-ng/slide.ng/commits?author=erkamyaman" title="Documentation">📖</a> <a href="#infra-erkamyaman" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-erkamyaman" title="Maintenance">🚧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## License

[MIT](LICENSE). slide.ng is an independent community project. It is not affiliated with, or endorsed by, Google, the Angular team or the Slidev team.
