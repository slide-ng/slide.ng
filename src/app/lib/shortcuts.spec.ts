import { Shortcut, ShortcutActions, defaultShortcuts, findShortcut, matches } from './shortcuts';

const key = (k: string, mods: Partial<KeyboardEvent> = {}) =>
  ({
    key: k,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...mods,
  }) as KeyboardEvent;

describe('matches', () => {
  it('compares key names', () => {
    expect(matches(key('ArrowRight'), 'ArrowRight')).toBe(true);
    expect(matches(key('ArrowLeft'), 'ArrowRight')).toBe(false);
  });
  it('treats shift as part of the spec for named keys', () => {
    expect(matches(key('ArrowRight', { shiftKey: true }), 'ArrowRight')).toBe(false);
    expect(matches(key('ArrowRight', { shiftKey: true }), 'shift+ArrowRight')).toBe(true);
  });
  it('writes a space as `space`', () => {
    expect(matches(key(' '), 'space')).toBe(true);
    expect(matches(key(' ', { shiftKey: true }), 'shift+space')).toBe(true);
    expect(matches(key(' ', { shiftKey: true }), 'space')).toBe(false);
  });
  it('ignores the case of letters', () => {
    expect(matches(key('D'), 'd')).toBe(true);
  });
  it('never takes keys used with ctrl, meta or alt', () => {
    expect(matches(key('d', { ctrlKey: true }), 'd')).toBe(false);
    expect(matches(key('ArrowRight', { altKey: true }), 'ArrowRight')).toBe(false);
  });
});

function actions(log: string[], overview = false, drawing = false, drag = false): ShortcutActions {
  const names = [
    'next',
    'prev',
    'nextSlide',
    'prevSlide',
    'toggleDark',
    'toggleOverview',
    'toggleGoto',
    'toggleFullscreen',
    'closeAll',
    'overviewGo',
  ];
  const base: any = Object.fromEntries(names.map((n) => [n, () => log.push(n)]));
  return {
    ...base,
    overviewOpen: () => overview,
    drawingEnabled: () => drawing,
    dragActive: () => drag,
    overviewMove: (by: string) => log.push(`move ${by}`),
  };
}

describe('default shortcuts (the same keys as Slidev)', () => {
  const run = (k: string, mods: Partial<KeyboardEvent> = {}, overview = false, drawing = false) => {
    const log: string[] = [];
    findShortcut(key(k, mods), defaultShortcuts(actions(log, overview, drawing)))?.run();
    return log.join();
  };
  it('moves with space, arrows, page keys', () => {
    expect(run(' ')).toBe('next');
    expect(run(' ', { shiftKey: true })).toBe('prev');
    expect(run('ArrowRight')).toBe('next');
    expect(run('ArrowLeft')).toBe('prev');
    expect(run('PageDown')).toBe('next');
    expect(run('PageUp')).toBe('prev');
    expect(run('ArrowDown')).toBe('nextSlide');
    expect(run('ArrowUp')).toBe('prevSlide');
    expect(run('ArrowRight', { shiftKey: true })).toBe('nextSlide');
    expect(run('ArrowLeft', { shiftKey: true })).toBe('prevSlide');
  });
  it('opens things with d, o, `, g, f and closes with Escape', () => {
    expect([run('d'), run('o'), run('`'), run('g'), run('f'), run('Escape')]).toEqual([
      'toggleDark',
      'toggleOverview',
      'toggleOverview',
      'toggleGoto',
      'toggleFullscreen',
      'closeAll',
    ]);
  });
  it('leaves d, o, `, g and Escape to the drawing toolbar while it is on, arrows still move', () => {
    expect(['d', 'o', '`', 'g', 'Escape'].map((k) => run(k, {}, false, true))).toEqual([
      '',
      '',
      '',
      '',
      '',
    ]);
    expect(run('ArrowRight', {}, false, true)).toBe('next');
  });
  it('leaves the arrow keys to a selected slide-ng-drag element', () => {
    const run = (k: string, mods = {}) => {
      const log: string[] = [];
      findShortcut(key(k, mods), defaultShortcuts(actions(log, false, false, true)))?.run();
      return log.join();
    };
    expect([run('ArrowRight'), run('ArrowUp'), run('ArrowRight', { shiftKey: true })]).toEqual([
      '',
      '',
      '',
    ]);
    expect(run(' ')).toBe('next');
  });
  it('uses the arrows to move inside the overview, and Enter to go', () => {
    expect(run('ArrowRight', {}, true)).toBe('move right');
    expect(run('ArrowDown', {}, true)).toBe('move down');
    expect(run('Enter', {}, true)).toBe('overviewGo');
    expect(run('Enter', {}, false)).toBe('');
  });
});

describe('findShortcut', () => {
  it('takes a match that is allowed right now', () => {
    const list: Shortcut[] = [
      { name: 'a', key: 'x', run: () => {}, when: () => false },
      { name: 'b', key: 'x', run: () => {} },
    ];
    expect(findShortcut(key('x'), list)?.name).toBe('b');
  });
  it('lets a shortcut added later win over one with the same key', () => {
    const list: Shortcut[] = [
      { name: 'addon-a', key: 'k', run: () => {} },
      { name: 'addon-b', key: 'k', run: () => {} },
    ];
    expect(findShortcut(key('k'), list)?.name).toBe('addon-b');
    const deck = [...defaultShortcuts(actions([])), { name: 'mine', key: 'space', run: () => {} }];
    expect(findShortcut(key(' '), deck)?.name).toBe('mine');
  });
  it('lets a deck replace a shortcut by filtering the list', () => {
    const setup = (_a: ShortcutActions, list: Shortcut[]) =>
      list.filter((s) => s.name !== 'next_space');
    const list = setup(actions([]), defaultShortcuts(actions([])));
    expect(findShortcut(key(' '), list)).toBeUndefined();
  });
});
