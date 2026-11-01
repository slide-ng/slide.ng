# Coding standards

Prettier formats everything (`npm run format`) and ESLint checks the code (`npm run lint`). The rest is about keeping the code easy to read.

## In short

- **Small files.** A file does one job. When a file grows past a screen or two, split it. Many small modules are preferred to one large one.
- **Plain comments.** One or two short lines at the top of a file say what it is for. Inside, comment the why, not the what. No banners, no commented-out code.
- **Few dependencies.** Before adding a package, check whether a few lines of code or something already installed does the job. Every new dependency is recorded in [docs/DECISIONS.md](../DECISIONS.md) with the reason.
- **Spell names out.** `slideIndex`, not `si`. Booleans start with `is`, `has` or `should`.

## TypeScript

- Strict mode is on. Avoid `any`; use `unknown` and narrow it, or write a small interface.
- Prefer `const`. Use `readonly` for members that never change.
- Catch only errors you expect, and say what happens instead.
- If ESLint reports something you have a reason to keep, disable that one rule on that one line with a reason, and list it in the pull request.

## Angular (`src/app`)

- Standalone components, signals (`input()`, `output()`, `signal()`, `computed()`) and `inject()`.
- A component keeps its template in an `.html` file next to its `.ts` (`templateUrl: './name.html'`), also a one-line one. The class scan of the generator reads `.html` files too, so classes used only there still get their CSS.
- Native control flow (`@if`, `@for`, `@switch`). Use `class` and `style` bindings instead of `ngClass` and `ngStyle`.
- Host bindings go in the `host` object of the decorator.
- The app is zoneless: state that changes must be a signal.
- Layouts use the `sn-` selector prefix. A component that slides use by tag name keeps the name documented in `docs/SYNTAX.md`.

## Generator and scripts (`scripts`)

- Plain `.mjs` files with ES modules and no build step. Only Node's own modules and the packages in `package.json`.
- Pure functions that take text and return text are easy to test. Keep file system and network code at the edges, in small files.
- Anything that reads a path from a request or from a deck must keep it inside the deck folder (see `scripts/dev/auth.mjs`).

## Tests

- A unit test sits next to its file as `name.spec.ts` and runs with `npm test`.
- Browser behavior is checked in `tests/e2e`, the dev server in the `test:dev` suites and the command line in `tests/export`.
- A bug fix comes with a test that fails without the fix.
- A test must not depend on the exact formatting of a source file.

## Documentation

When behavior, an option, a layout or a command changes, update the page in `docs/` (and the README) in the same pull request. Say what is not done in `docs/STATUS.md`, not in code comments.
