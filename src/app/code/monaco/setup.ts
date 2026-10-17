// Loads Monaco and tells it where its workers are. This file is only ever imported with `import()`,
// so Monaco (several MB) is a separate download that decks without an editor never fetch.
import * as monaco from 'monaco-editor';

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
