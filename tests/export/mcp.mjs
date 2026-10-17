// `slide-ng mcp` end to end: a scripted client starts the real command over stdio, initializes, lists the tools and uses them
// on a copy of a deck. After each change slides.md is read from disk. Part of `npm run test:export`.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { reporter } from '../e2e/browser.mjs';

const t = reporter();
const scratch = mkdtempSync(join(tmpdir(), 'slide-ng-mcp-'));
const deckDir = join(scratch, 'deck');
mkdirSync(deckDir);
const file = join(deckDir, 'slides.md');
const original = `---
title: MCP deck
---

# One

first

---
layout: center
---

# Two

second

<!--
note two
-->

---

# Three

third
`;
writeFileSync(file, original);
writeFileSync(join(scratch, 'outside.md'), '# Outside\n\nA file next to the deck folder.\n');

const client = new Client({ name: 'test-client', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve('bin/slide-ng.mjs'), 'mcp', file],
  stderr: 'pipe',
});
await client.connect(transport); // this sends `initialize`
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content[0].text;
  return { error: Boolean(r.isError), text, json: r.isError ? null : JSON.parse(text) };
};
const disk = () => readFileSync(file, 'utf8');

t.ok(
  'initialize: the server names itself',
  client.getServerVersion()?.name === 'slide-ng',
  JSON.stringify(client.getServerVersion()),
);
const { tools } = await client.listTools();
const names = tools.map((x) => x.name).sort();
t.ok(
  'tools/list: the six slide tools and the outline',
  JSON.stringify(names) ===
    JSON.stringify([
      'get_outline',
      'get_slide',
      'insert_slide',
      'list_slides',
      'move_slide',
      'remove_slide',
      'update_slide',
    ]),
  names.join(),
);
t.ok(
  'every tool has a description and an input schema',
  tools.every((x) => x.description && x.inputSchema?.type === 'object'),
);

// ---- read
const list = await call('list_slides', {});
t.ok(
  'list_slides: three slides with titles and layouts',
  list.json.length === 3 &&
    list.json[1].title === 'Two' &&
    list.json[1].layout === 'center' &&
    list.json[1].hasNotes,
  list.text.replace(/\s+/g, ' '),
);
const outline = await call('get_outline', {});
t.ok(
  'get_outline: the titles as a list and as text',
  outline.json.items.map((i) => i.title).join() === 'MCP deck,Two,Three' &&
    /2\. Two/.test(outline.json.text),
  outline.json.text,
);
const got = await call('get_slide', { no: 2 });
t.ok(
  'get_slide: the markdown as written, frontmatter and notes included',
  got.json.markdown.includes('layout: center') &&
    got.json.markdown.includes('note two') &&
    got.json.notes === 'note two',
  got.json.markdown.replace(/\n/g, '|'),
);

// ---- update
const updated = await call('update_slide', {
  no: 2,
  markdown: got.json.markdown.replace('second', 'SECOND, edited'),
});
t.ok(
  'update_slide: slides.md on disk has the new text',
  !updated.error && disk().includes('SECOND, edited') && !disk().includes('\nsecond\n'),
  updated.text.replace(/\s+/g, ' '),
);
t.ok(
  'update_slide: the other slides are untouched',
  disk().includes('first') &&
    disk().includes('third') &&
    disk().startsWith('---\ntitle: MCP deck\n---'),
);
const split = await call('update_slide', { no: 3, markdown: '# Three\n\n---\n\n# Surprise' });
t.ok(
  'update_slide: text that is more than one slide is refused and nothing is written',
  split.error && /exactly one slide/.test(split.text) && !disk().includes('Surprise'),
  split.text,
);

// ---- insert, move, remove
const inserted = await call('insert_slide', {
  after: 1,
  markdown: '# Inserted\n\nnew text',
  frontmatter: { layout: 'section' },
});
const afterInsert = await call('list_slides', {});
t.ok(
  'insert_slide: a fourth slide at place 2 with its frontmatter',
  !inserted.error &&
    afterInsert.json.map((s) => s.title).join() === 'MCP deck,Inserted,Two,Three' &&
    afterInsert.json[1].layout === 'section',
  afterInsert.json.map((s) => s.title).join(),
);
const moved = await call('move_slide', { from: 4, to: 2 });
const afterMove = await call('list_slides', {});
t.ok(
  'move_slide: Three is now slide 2',
  !moved.error && afterMove.json.map((s) => s.title).join() === 'MCP deck,Three,Inserted,Two',
  afterMove.json.map((s) => s.title).join(),
);
t.ok(
  'move_slide: the notes and text travelled with the slide',
  disk().includes('note two') && disk().includes('SECOND, edited'),
);
const removed = await call('remove_slide', { no: 3 });
const afterRemove = await call('list_slides', {});
t.ok(
  'remove_slide: the result names the removed slide',
  removed.json?.removed?.title === 'Inserted',
);
t.ok(
  'remove_slide: Inserted is gone',
  !removed.error &&
    afterRemove.json.map((s) => s.title).join() === 'MCP deck,Three,Two' &&
    !disk().includes('new text'),
  afterRemove.json.map((s) => s.title).join(),
);
t.ok(
  'the file still starts with the headmatter and ends with one newline',
  disk().startsWith('---\ntitle: MCP deck\n---\n') && /[^\n]\n$/.test(disk()),
);

// ---- refusals
for (const [label, name, args, pattern] of [
  ['a slide that does not exist', 'get_slide', { no: 99 }, /there is no slide 99/],
  ['removing slide 1', 'remove_slide', { no: 1 }, /headmatter/],
  ['moving slide 1', 'move_slide', { from: 1, to: 2 }, /headmatter/],
  [
    'inserting a slide that is out of range',
    'insert_slide',
    { after: 9, markdown: '# x' },
    /from 1 to 3/,
  ],
]) {
  const before = disk();
  const r = await call(name, args);
  t.ok(
    `refused: ${label}, and slides.md is unchanged`,
    r.error && pattern.test(r.text) && disk() === before,
    r.text,
  );
}
const bad = await client.callTool({ name: 'get_slide', arguments: { no: 'two' } }).then(
  (r) => ({ error: Boolean(r.isError), text: r.content?.[0]?.text }),
  (e) => ({ error: true, text: e.message }),
);
t.ok('refused: a slide number that is not a number', bad.error, bad.text);

// ---- path confinement: a slide imported from outside the deck's folder is never written
// The read is allowed on purpose here (allowOutsideRoot), so the test is about the write.
writeFileSync(
  file,
  `---\ntitle: Imports\nallowOutsideRoot: true\n---\n\n# Local\n\n---\nsrc: ../outside.md\n---\n`,
);
const outsideBefore = readFileSync(join(scratch, 'outside.md'), 'utf8');
const imported = await call('list_slides', {});
t.ok(
  'the imported slide is listed',
  imported.json.length === 2,
  imported.text.replace(/\s+/g, ' '),
);
const attack = await call('update_slide', { no: 2, markdown: '# Hijacked' });
t.ok(
  'update_slide: a slide of a file outside the folder is refused and the file is unchanged',
  attack.error && readFileSync(join(scratch, 'outside.md'), 'utf8') === outsideBefore,
  attack.text,
);
const structural = await call('remove_slide', { no: 2 });
t.ok(
  'remove_slide: refused for a deck that imports slides',
  structural.error && /src:/.test(structural.text),
  structural.text,
);

await client.close();
process.exit(t.done());
