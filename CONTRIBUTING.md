# Contributing to slide.ng

Thanks for helping. This page covers how to set up, what to run before a pull request, and where to add the common kinds of change.

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Report security problems privately, as [SECURITY.md](SECURITY.md) describes. By contributing you agree that your work is licensed under the [MIT license](LICENSE) of this project.

## Set up

You need Node.js 22.22.3 or newer (`.nvmrc` names the version CI uses) and, for the browser tests, a Chromium.

```sh
git clone https://github.com/slide-ng/slide.ng.git
cd slide.ng
npm ci
npm start            # dev server for the repository's own slides.md, http://localhost:4230
```

`npm install` also sets `core.hooksPath` to `.githooks` and `commit.template` to `.gitmessage`, unless you already set them. The hooks are small:

- `pre-commit` formats the staged files with Prettier. It skips a file that also has unstaged changes.
- `commit-msg` warns when the message does not follow the [commit message guidelines](docs/contributing/commit-message-guidelines.md). It never blocks the commit.

## Commands

| command               | what it does                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run lint`        | ESLint over `src`, `scripts` and `tests`                                                                  |
| `npm run format`      | Prettier, writes changes (`npm run format:check` only checks)                                             |
| `npm run build`       | generates the slides and builds the app                                                                   |
| `npm test`            | unit tests                                                                                                |
| `npm run test:e2e`    | builds several decks and checks them in a real browser                                                    |
| `npm run test:dev`    | the generator's watching and memory, then the dev server: live updates, write-back, drawings, remote mode |
| `npm run test:export` | the command line: export, build, offline, themes, create, MCP                                             |
| `npm run test:skills` | builds the code samples of the agent skill (also part of `test:export`)                                   |

Chromium keeps its sandbox on. In a container or as root it refuses to start, so run the export tests with `SLIDE_NG_NO_SANDBOX=1`.
| `npm run check:skills` | fails when a document changed after the agent skill was synced with it |

The browser suites use Chromium through `playwright-core`. Set `CHROME_PATH` to a Chromium or Chrome binary, or install one with `npx playwright-core install chromium`.
Before a pull request, run lint, format check, build and `npm test`, plus the browser suites your change can affect. CI runs all of them.

## Code style

Small files, plain comments, few dependencies. The rules are in [docs/contributing/coding-standards.md](docs/contributing/coding-standards.md). A new dependency needs a reason, written in [docs/DECISIONS.md](docs/DECISIONS.md).

## Commit messages

`type(scope): summary`, imperative, no trailer lines. Details and the list of scopes are in the [commit message guidelines](docs/contributing/commit-message-guidelines.md). Pull requests are squash merged, so the pull request title must follow the same form.

## Adding things

**A layout.**

1. Write the component in `src/app/layouts/<name>.ts` with its template in `<name>.html` (copy `center.ts` and `center.html`; the selector is `sn-<name>`) and export it from `layouts/index.ts`.
2. Add one line to `LAYOUTS` in `scripts/lib/layouts.mjs`: the class name, the frontmatter props it takes and its slots.
3. Put its styles in `src/styles/layouts.css`.
4. Add a unit test, a slide in a browser suite under `tests/e2e`, and a row in `docs/PARITY.md` or `docs/SYNTAX.md`.

**A built-in component.** Write it in `src/app/builtin` (or `lib`), then add a line to `COMPONENTS` in `scripts/lib/registry.mjs` with a `test` expression that spots its tag in a slide. Document it in `docs/SYNTAX.md` and test it.

**A setup hook.** The hooks (`setup/shiki.ts`, `shortcuts.ts`, ...) are listed in [docs/SETUP.md](docs/SETUP.md). A new one needs three things: the place where the generator or the app looks for the file, how the answers of the deck, addons and theme are combined, and a deck in `tests/e2e/phase5` that uses it. Add a row to the table in `docs/SETUP.md`.

**A theme.** Follow [docs/WRITING-A-THEME.md](docs/WRITING-A-THEME.md). `examples/theme-minimal` is a small finished theme, and `tests/export/theme.mjs` checks it end to end. The official themes live in the separate slide-ng/themes repository.

## Pull requests

- Keep a pull request to one change, with tests and docs.
- Fill in the template. The Docs check workflow warns when `src` or `scripts` change with no change in `docs/`; if none is needed, add the `no-docs` label and say why.
- Open an issue first for large changes, so we can agree on the approach.

## Recognising contributions

Everyone who helps is listed in the Contributors section of the README, whatever the kind of help: code, docs, design, review or triage. To add someone, comment `@all-contributors please add @user for code` on an issue or pull request (use another type such as `doc`, `review` or `bug` when it fits). The bot opens a pull request that updates `.all-contributorsrc` and the README.
