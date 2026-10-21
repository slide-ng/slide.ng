import { titleIcon, titleIconProblem } from './title-icon.mjs';

describe('titleIcon', () => {
  it('uses an icon written as ~icon~, whether or not its set is installed', () => {
    expect(titleIcon('npm ~i-uil:github~', [])).toBe('i-uil:github');
    expect(titleIcon('~i-logos:vue~ App.vue', [])).toBe('i-logos:vue');
  });
  it('the first ~icon~ wins', () => {
    expect(titleIcon('~i-a:b~ ~i-c:d~', [])).toBe('i-a:b');
  });
  it('matches a known name from vscode-icons when the set is installed', () => {
    expect(titleIcon('pnpm', ['vscode-icons'])).toBe('i-vscode-icons:file-type-light-pnpm');
    expect(titleIcon('NPM', ['vscode-icons'])).toBe('i-vscode-icons:file-type-npm');
    expect(titleIcon('logo.svg', ['vscode-icons'])).toBe('i-vscode-icons:file-type-svg');
  });
  it('the longest name wins, as in Slidev', () => {
    expect(titleIcon('package.json', ['vscode-icons'])).toBe('i-vscode-icons:file-type-node');
    expect(titleIcon('data.json', ['vscode-icons'])).toBe('i-vscode-icons:file-type-json');
    expect(titleIcon('pnpm', ['vscode-icons'])).not.toBe('i-vscode-icons:file-type-npm');
  });
  it('gives no built-in icon when its set is missing', () => {
    expect(titleIcon('package.json', ['carbon'])).toBe('');
    expect(titleIcon('solid', ['vscode-icons'])).toBe('');
    expect(titleIcon('solid', ['logos'])).toBe('i-logos:solidjs-icon');
  });
  it('gives nothing for an unknown title', () => {
    expect(titleIcon('Example', ['vscode-icons'])).toBe('');
  });
  it('matches whole file names and extensions, not any part of the title', () => {
    const icon = (t: string) => titleIcon(t, ['vscode-icons']);
    expect(icon('results.tsv')).toBe('');
    expect(icon('notes.txt')).toBe('');
    expect(icon('components')).toBe('');
    expect(icon('main.ts')).toBe('i-vscode-icons:file-type-typescript');
    expect(icon('App.vue')).toBe('i-vscode-icons:file-type-vue');
    expect(icon('npm install')).toBe('i-vscode-icons:file-type-npm');
    expect(icon('src/package.json')).toBe('i-vscode-icons:file-type-node');
    expect(icon('eslint.config.js')).toBe('i-vscode-icons:file-type-eslint');
    expect(icon('.eslintrc.json')).toBe('i-vscode-icons:file-type-eslint');
    expect(icon('.vscode/settings.json')).toBe('i-vscode-icons:file-type-vscode');
    expect(icon('(.env)')).toBe('i-vscode-icons:file-type-dotenv');
  });
});

describe('titleIconProblem', () => {
  const carbon = (set: string) =>
    set === 'carbon' ? new Set(['code', 'bucket-2', 'logo-github']) : null;
  it('names an icon its installed set does not have, with near names', () => {
    expect(titleIconProblem('~i-carbon:bucket~ a.ts', carbon)).toBe(
      'the code title icon "i-carbon:bucket" is not in the installed carbon icon set, so nothing is drawn (did you mean "i-carbon:bucket-2"?)',
    );
  });
  it('says nothing for a known icon, a set that is not installed or no ~icon~', () => {
    expect(titleIconProblem('~i-carbon:code~', carbon)).toBe('');
    expect(titleIconProblem('~i-logos:vue~', carbon)).toBe('');
    expect(titleIconProblem('package.json', carbon)).toBe('');
  });
  it('checks the sets that are really installed', () => {
    expect(titleIconProblem('~i-carbon:code~')).toBe('');
    expect(titleIconProblem('~i-carbon:no-such-icon-here~')).toContain(
      'not in the installed carbon',
    );
  });
});
