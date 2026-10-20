// The table of contents tree. A port of Slidev's useTocTree.ts, written as plain functions.
// A slide with a bigger `level` than the one before it becomes a child of that one.
export interface TocSlide {
  no: number;
  title: string | null;
  titleHtml?: string | null;
  level: number | null;
  routeAlias: string | null;
  hideInToc: boolean;
}

export interface TocItem {
  no: number;
  title: string;
  titleHtml?: string | null; // the title with inline markdown and KaTeX math as HTML
  path: string; // `3` or the routeAlias
  level: number; // depth in the tree, 1 = top
  hideInToc: boolean;
  children: TocItem[];
  active: boolean; // this is the slide on screen
  activeParent: boolean; // a child (at any depth) is on screen
  hasActiveParent: boolean; // a parent is on screen
}

function add(tree: TocItem[], slide: TocSlide, level = 1) {
  const titleLevel = slide.level ?? level;
  if (titleLevel > level && tree.length > 0) {
    add(tree.at(-1)!.children, slide, level + 1);
    return;
  }
  tree.push({
    no: slide.no,
    title: slide.title!,
    titleHtml: slide.titleHtml ?? null,
    path: slide.routeAlias ?? String(slide.no),
    level,
    hideInToc: slide.hideInToc,
    children: [],
    active: false,
    activeParent: false,
    hasActiveParent: false,
  });
}

// Marks which items are on the path to the current slide.
function mark(tree: TocItem[], current: number, hasActiveParent = false): boolean {
  let anyActive = false;
  for (const item of tree) {
    item.active = item.no === current;
    item.hasActiveParent = hasActiveParent;
    item.activeParent = mark(item.children, current, item.active || hasActiveParent);
    anyActive ||= item.active || item.activeParent;
  }
  return anyActive;
}

// Removes the items marked `hideInToc` (with their children), like Slidev.
function withoutHidden(tree: TocItem[]): TocItem[] {
  return tree
    .filter((i) => !i.hideInToc)
    .map((i) => ({ ...i, children: withoutHidden(i.children) }));
}

export function buildTocTree(slides: TocSlide[], current: number): TocItem[] {
  const tree: TocItem[] = [];
  slides.filter((s) => s.title).forEach((s) => add(tree, s));
  mark(tree, current);
  return withoutHidden(tree);
}

export interface TocOptions {
  minDepth: number;
  maxDepth: number;
  mode: 'all' | 'onlyCurrentTree' | 'onlySiblings';
}

// Keep only the depths asked for. Below `minDepth` we follow the active branch down.
function byDepth(tree: TocItem[], o: TocOptions, level = 1): TocItem[] {
  if (level > o.maxDepth) return [];
  if (level < o.minDepth) {
    const active = tree.find((i) => i.active || i.activeParent);
    return active ? byDepth(active.children, o, level + 1) : [];
  }
  return tree.map((i) => ({ ...i, children: byDepth(i.children, o, level + 1) }));
}

const onPath = (i: TocItem) => i.active || i.activeParent || i.hasActiveParent;

function onlyCurrentTree(tree: TocItem[]): TocItem[] {
  return tree.filter(onPath).map((i) => ({ ...i, children: onlyCurrentTree(i.children) }));
}

function onlySiblings(tree: TocItem[]): TocItem[] {
  const keep = tree.some(onPath);
  return tree.filter(() => keep).map((i) => ({ ...i, children: onlySiblings(i.children) }));
}

export function filterToc(tree: TocItem[], o: TocOptions): TocItem[] {
  const deep = byDepth(tree, o);
  return o.mode === 'onlyCurrentTree'
    ? onlyCurrentTree(deep)
    : o.mode === 'onlySiblings'
      ? onlySiblings(deep)
      : deep;
}
