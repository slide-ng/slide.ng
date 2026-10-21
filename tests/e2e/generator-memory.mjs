// `npm run test:dev`: the dev server runs the generator again on every save, so what a run sets up (Shiki and
// its WebAssembly memory, Twoslash, UnoCSS) must be let go or reused. Runs those steps 200 times and checks that the memory
// stays flat. Needs `node --expose-gc`.
import {
  codeToHtml,
  initHighlighter,
  twoslashTransformer,
} from '../../scripts/lib/code/highlighter.mjs';
import { makeCss } from '../../scripts/lib/make-css.mjs';
import { reporter } from './browser.mjs';

const RUNS = 200;
const t = reporter();
const used = () => {
  globalThis.gc();
  const { heapUsed, external } = process.memoryUsage();
  return (heapUsed + external) / 1048576;
};

let start = 0;
const started = Date.now();
for (let run = 1; run <= RUNS; run++) {
  await initHighlighter({ langs: ['ts', 'python'], twoslash: true });
  codeToHtml('const a = 1', 'ts');
  codeToHtml('const a = 1\n//    ^?', 'ts', {
    transformers: [twoslashTransformer()],
    meta: { __raw: 'twoslash' },
  });
  await makeCss(['scripts/lib/make-css.mjs']);
  if (run === 20) start = used(); // after the first runs have filled the caches
}
const grown = used() - start;
t.ok(
  `memory stays flat over ${RUNS} regenerations`,
  grown < 20,
  `${grown.toFixed(1)} MB more after run ${RUNS} than after run 20 (${Date.now() - started} ms)`,
);
process.exit(t.done());
