// Loads Monaco and tells it where its workers are. This file is only ever imported with `import()`,
// so Monaco (several MB) is a separate download that decks without an editor never fetch.
import * as monaco from 'monaco-editor';
// Monaco's stylesheet (its icon font is inside, about 125 kB compressed) comes with this chunk too, instead of with the deck's
// styles, where it held up the first slide of every deck with an editor. Its package exports JavaScript only, hence the path.
// Monaco's modules also import their own stylesheets one by one: a production build (angular.json) loads every `.css` that
// JavaScript imports as empty, as those became stylesheet files that nothing loaded (this one is the same rules in one file).
import editorCss from '../../../../node_modules/monaco-editor/min/vs/editor/editor.main.css' with {
  loader: 'text',
};

// After the app's stylesheet, as the reset there must not win over Monaco's rules (they have the same specificity).
const style = document.createElement('style');
style.textContent = editorCss;
const sheets = document.head.querySelectorAll('link[rel="stylesheet"]');
if (sheets.length) sheets[sheets.length - 1].after(style);
else document.head.prepend(style);

// Angular's bundler turns `new Worker(new URL(...))` into separate worker files next to the app, so
// the editor works offline with no CDN. JSON, CSS and HTML are highlighted but have no language server.
(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker(_id: string, label: string) {
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(new URL('./ts.worker', import.meta.url), { type: 'module' });
    }
    return new Worker(new URL('./editor.worker', import.meta.url), { type: 'module' });
  },
};

// Their language features would ask a JSON, CSS or HTML worker that is not bundled, and log "Missing requestHandler" errors:
// turn every feature off, so those languages are highlighted and edited only.
for (const defaults of [
  monaco.json.jsonDefaults,
  monaco.css.cssDefaults,
  monaco.css.scssDefaults,
  monaco.css.lessDefaults,
  monaco.html.htmlDefaults,
])
  defaults.setModeConfiguration(
    Object.fromEntries(Object.keys(defaults.modeConfiguration).map((k) => [k, false])),
  );

export { monaco };
