import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// An icon class whose name is not in the installed set draws nothing (the record button was an empty 16px box).
const sets: Record<string, { icons: Record<string, unknown>; aliases?: Record<string, unknown> }> =
  {};
for (const s of ['carbon', 'mdi', 'ph'])
  sets[s] = JSON.parse(readFileSync(`node_modules/@iconify-json/${s}/icons.json`, 'utf8'));

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(join(dir, e.name))
      : /\.(ts|css)$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );

describe('icon names', () => {
  it('every icon the app and the example themes use exists in its set', () => {
    const missing = [];
    for (const file of [...files('src/app'), ...files('examples')])
      for (const [icon, set, name] of readFileSync(file, 'utf8').matchAll(
        /i-(carbon|mdi|ph):([a-z0-9-]+)/g,
      ))
        if (!sets[set].icons[name] && !sets[set].aliases?.[name]) missing.push(`${file}: ${icon}`);
    expect(missing).toEqual([]);
  });
});
