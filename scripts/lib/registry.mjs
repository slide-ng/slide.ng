// What a generated slide is allowed to use.
// A standalone Angular component must list what its template uses, so the
// generator checks the slide's HTML against this table and imports only
// what is needed. To make your own component available in slides, add a line
// to COMPONENTS. (Layouts live in layouts.mjs.)
export { LAYOUTS } from './layouts.mjs';

// Components and directives: `test` finds out if the slide uses it. A tag's test ends at the end of its name, so
// `<slide-ng-tocc>` (a typo) does not import SlideToc.
export const COMPONENTS = [
  {
    className: 'SlideNgClick',
    file: 'lib/slide-ng-click',
    test: /[\s[](slide-ng-click|slide-ng-after)(-hide)?\]?[\s=>/]/,
  },
  { className: 'SlideNgClicks', file: 'lib/slide-ng-clicks', test: /<slide-ng-clicks[\s>/]/ },
  {
    className: 'SlideNgClickGap',
    file: 'lib/slide-ng-click-gap',
    test: /<slide-ng-click-gap[\s>/]/,
  },
  { className: 'SlideNgSwitch', file: 'lib/slide-ng-switch', test: /<slide-ng-switch[\s>/]/ },
  { className: 'SlideToc', file: 'builtin/slide-toc', test: /<slide-ng-toc[\s>/]/ },
  {
    className: 'SlideCurrentNo',
    file: 'builtin/slide-current-no',
    test: /<slide-ng-current-no[\s>/]/,
  },
  { className: 'SlidesTotal', file: 'builtin/slides-total', test: /<slide-ng-total[\s>/]/ },
  {
    className: 'SlideProgressBar',
    file: 'builtin/progress-bar',
    test: /<slide-ng-progress-bar[\s>/]/,
  },
  {
    className: 'SlideTitleRenderer',
    file: 'builtin/slide-title-renderer',
    test: /<slide-ng-title-renderer[\s>/]/,
  },
  {
    className: 'LightOrDark',
    file: 'builtin/light-or-dark',
    test: /<slide-ng-light-or-dark[\s>/]/,
  },
  { className: 'RenderWhen', file: 'builtin/render-when', test: /<slide-ng-render-when[\s>/]/ },
  { className: 'SlideLink', file: 'builtin/slide-link', test: /<slide-ng-link[\s>/]/ },
  {
    className: 'CodeBlockWrapper',
    file: 'code/code-block-wrapper',
    test: /<slide-ng-code-block-wrapper[\s>/]/,
  },
  { className: 'CodeGroup', file: 'code/code-group', test: /<slide-ng-code-group[\s>/]/ },
  { className: 'ShikiMagicMove', file: 'code/magic-move', test: /<slide-ng-magic-move[\s>/]/ },
  {
    className: 'KatexBlockWrapper',
    file: 'code/katex-block',
    test: /<slide-ng-katex-block-wrapper[\s>/]/,
  },
  { className: 'Mermaid', file: 'code/mermaid', test: /<slide-ng-mermaid[\s>]/ },
  { className: 'PlantUml', file: 'code/plant-uml', test: /<slide-ng-plant-uml[\s>]/ },
  { className: 'MonacoEditor', file: 'code/monaco-editor', test: /<slide-ng-monaco[\s>]/ },
  { className: 'Arrow', file: 'builtin/arrow', test: /<slide-ng-arrow[\s>/]/ },
  {
    className: 'AutoFitText',
    file: 'builtin/auto-fit-text',
    test: /<slide-ng-auto-fit-text[\s>/]/,
  },
  { className: 'Transform', file: 'builtin/transform', test: /<slide-ng-transform[\s>/]/ },
  { className: 'Youtube', file: 'builtin/youtube', test: /<slide-ng-youtube[\s>/]/ },
  { className: 'SlideVideo', file: 'builtin/slide-video', test: /<slide-ng-video[\s>/]/ },
  { className: 'Tweet', file: 'builtin/tweet', test: /<slide-ng-tweet[\s>/]/ },
  { className: 'BlueSky', file: 'builtin/blue-sky', test: /<slide-ng-blue-sky[\s>/]/ },
  { className: 'SlideNgMark', file: 'lib/slide-ng-mark', test: /[\s[]slide-ng-mark[\s=>/.\]]/ },
  {
    className: 'SlideNgMotion',
    file: 'lib/slide-ng-motion',
    test: /\[slide-ng-motion\]|\sslide-ng-motion[\s=>/]/,
  },
  { className: 'SlideNgDrag', file: 'drag/slide-ng-drag', test: /\sslide-ng-drag[\s=>/]/ },
  { className: 'SlideNgDragBox', file: 'drag/slide-ng-drag-box', test: /<slide-ng-drag[\s>/]/ },
  {
    className: 'SlideNgDragArrow',
    file: 'drag/slide-ng-drag-arrow',
    test: /<slide-ng-drag-arrow[\s>/]/,
  },
  { className: 'SlideLayer', file: 'lib/slide-layer', test: /<app-slide-layer/ },
  { className: 'Counter', file: 'lib/counter', test: /<app-counter/ },
];

// Every built-in `slide-ng-*` element and attribute. Any other `slide-ng-*` name in a slide is a typo: the generator warns
// and names the nearest one (unknown-names.mjs).
export const BUILTIN_ELEMENTS = [
  'slide-ng-arrow',
  'slide-ng-auto-fit-text',
  'slide-ng-blue-sky',
  'slide-ng-click-gap',
  'slide-ng-clicks',
  'slide-ng-code-block-wrapper',
  'slide-ng-code-group',
  'slide-ng-current-no',
  'slide-ng-drag',
  'slide-ng-drag-arrow',
  'slide-ng-katex-block-wrapper',
  'slide-ng-light-or-dark',
  'slide-ng-link',
  'slide-ng-magic-move',
  'slide-ng-mermaid',
  'slide-ng-monaco',
  'slide-ng-plant-uml',
  'slide-ng-render-when',
  'slide-ng-switch',
  'slide-ng-title-renderer',
  'slide-ng-toc',
  'slide-ng-total',
  'slide-ng-transform',
  'slide-ng-tweet',
  'slide-ng-video',
  'slide-ng-youtube',
];
export const BUILTIN_ATTRIBUTES = [
  'slide-ng-click',
  'slide-ng-after',
  'slide-ng-click-hide',
  'slide-ng-mark',
  'slide-ng-motion',
  'slide-ng-drag',
];
