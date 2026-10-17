// `slide-ng format [slides.md]`: tidies the markdown file with the same parser that reads it.
// What it does, slide by slide: trims blank lines around the content (one blank line after the frontmatter and before
// the next `---`), prints the frontmatter again as clean YAML (comments are kept), and puts the speaker note in an
// HTML comment at the end. Files that `src:` imports are not touched; give them as arguments to format them too.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse, prettify, stringify } from '@slidev/parser/fs';
import { parseFlags } from './flags.mjs';

/** The formatted text of a markdown deck. Throws when formatting would change the number of slides. */
export async function formatMarkdown(text, filepath = 'slides.md') {
  const parsed = await parse(text, filepath);
  // A last slide written `---` then `# B` keeps the `---` in its content; printed again it would make an empty slide.
  for (const slide of parsed.slides) slide.content = slide.content.replace(/^---[ \t]*\n/, '');
  const after = stringify(prettify(parsed));
  const count = (await parse(after, filepath)).slides.length;
  if (count !== parsed.slides.length)
    throw new Error(
      `${filepath}: formatting would turn ${parsed.slides.length} slides into ${count}, so the file is left as it is (an empty line after each "---" that starts a slide with text avoids this)`,
    );
  return after;
}

export async function formatCommand(argv) {
  const { positionals } = parseFlags(argv, {});
  const files = (positionals.length ? positionals : ['slides.md']).map((f) => resolve(f));
  for (const file of files) {
    const before = await readFile(file, 'utf8');
    const after = await formatMarkdown(before, file);
    if (after === before) {
      console.log(`${file}: already formatted`);
      continue;
    }
    await writeFile(file, after);
    console.log(`${file}: formatted`);
  }
}
