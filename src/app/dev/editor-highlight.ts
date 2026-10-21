// Colours for the side editor's text, the way Slidev does it (its ShikiEditor.vue): Shiki turns the markdown into HTML and a transparent
// textarea lies on top of it. Shiki is loaded with `import()` the first time the editor opens, so nothing of it is in the main bundle;
// the JavaScript regex engine is used, so there is no wasm file either. Only the markdown grammar and the two default themes are loaded.
export type Highlight = (code: string) => string;

export async function createEditorHighlighter(): Promise<Highlight> {
  const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, markdown, light, dark] =
    await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('shiki/langs/markdown.mjs'),
      import('shiki/themes/vitesse-light.mjs'),
      import('shiki/themes/vitesse-dark.mjs'),
    ]);
  const highlighter = await createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    langs: [markdown.default],
    themes: [light.default, dark.default],
  });
  // Both colours are written as CSS variables; styles/code.css picks one by the `dark` class, like the code in slides.
  // The trailing space keeps a last empty line (after a final newline) as tall as the textarea draws it.
  return (code) =>
    highlighter.codeToHtml(`${code} `, {
      lang: 'markdown',
      themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
      defaultColor: false,
      // Only a picture behind the textarea: not a Tab stop, not read out (the textarea has the same text).
      tabindex: -1,
      transformers: [
        {
          pre(pre) {
            pre.properties['aria-hidden'] = 'true';
          },
        },
      ],
    });
}
