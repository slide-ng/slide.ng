import { monacoWriteTargets, renderMonaco, resetMonacoWriteTargets } from './monaco.mjs';

const fence = (extra: object) => ({ info: 'ts {monaco-write}', code: 'let a = 1', ...extra });
const ctx = { root: '/project' };

describe('{monaco-write}', () => {
  beforeEach(() => resetMonacoWriteTargets());

  it('gives a snippet editor a write-id and lists its file relative to the project', () => {
    const html = renderMonaco(fence({ file: '/project/snippets/a.ts', partial: false }), ctx);
    const id = /write-id="(\w+)"/.exec(html)?.[1];
    expect(id).toMatch(/^[0-9a-f]{12}$/);
    expect(monacoWriteTargets()).toEqual({ [id!]: 'snippets/a.ts' });
  });
  it('gives the same id to the same file every time', () => {
    const a = renderMonaco(fence({ file: '/project/a.ts' }), ctx);
    const b = renderMonaco(fence({ file: '/project/a.ts' }), ctx);
    expect(a).toBe(b);
  });
  it('writes nothing for a code block that is not a whole file, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(renderMonaco(fence({}), ctx)).not.toContain('write-id');
    expect(renderMonaco(fence({ file: '/project/a.ts', partial: true }), ctx)).not.toContain(
      'write-id',
    );
    expect(warn).toHaveBeenCalledTimes(2);
    expect(monacoWriteTargets()).toEqual({});
    warn.mockRestore();
  });
  it('refuses a file outside the project', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(renderMonaco(fence({ file: '/elsewhere/a.ts' }), ctx)).not.toContain('write-id');
    expect(monacoWriteTargets()).toEqual({});
    warn.mockRestore();
  });
  it('lists no file the tools load or run: setup, package, git, hidden, odd extensions', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const f of ['setup/shiki.ts', 'package.json', '.git/config', '.env', 'run.sh'])
      expect(renderMonaco(fence({ file: `/project/${f}` }), ctx), f).not.toContain('write-id');
    expect(monacoWriteTargets()).toEqual({});
    expect(warn.mock.calls[0][0]).toContain('{monaco-write}');
    warn.mockRestore();
  });
  it("lists no theme's or addon's index.html, which goes into the page", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const roots = ['/project/my-theme', '/project'];
    expect(
      renderMonaco(fence({ file: '/project/my-theme/index.html' }), { ...ctx, roots }),
    ).not.toContain('write-id');
    expect(
      renderMonaco(fence({ file: '/project/snippets/index.html' }), { ...ctx, roots }),
    ).toContain('write-id');
    expect(Object.values(monacoWriteTargets())).toEqual(['snippets/index.html']);
    warn.mockRestore();
  });
  it('does not touch the other editors', () => {
    expect(renderMonaco({ info: 'ts {monaco}', code: 'x' }, ctx)).not.toContain('write-id');
  });
});
