import { rewriteDirectives } from './directives.mjs';

describe('rewriteDirectives: slide-ng-mark', () => {
  it('moves the modifiers into an attribute', () => {
    expect(rewriteDirectives('<span slide-ng-mark.red.circle="2">x</span>')).toBe(
      '<span mark-mods="red.circle" slide-ng-mark="2">x</span>',
    );
  });
  it('keeps a bare slide-ng-mark and other attributes', () => {
    expect(rewriteDirectives('<span class="a" slide-ng-mark>x</span>')).toBe(
      '<span class="a" slide-ng-mark>x</span>',
    );
  });
  it('turns an object or a range into a binding', () => {
    expect(rewriteDirectives(`<b slide-ng-mark="{ at: 5, color: '#234' }">`)).toBe(
      `<b [slide-ng-mark]="{ at: 5, color: '#234' }">`,
    );
    expect(rewriteDirectives('<b slide-ng-mark.blue="[2, 4]">')).toBe(
      '<b mark-mods="blue" [slide-ng-mark]="[2, 4]">',
    );
  });
  it('unquotes a Vue string like "\'+1\'"', () => {
    expect(rewriteDirectives(`<b slide-ng-mark="'+1'">`)).toBe('<b slide-ng-mark="+1">');
  });
  it('leaves other tags alone', () => {
    const html = '<div class="x" slide-ng-click>a</div> and <a href="b">c</a>';
    expect(rewriteDirectives(html)).toBe(html);
  });
});

describe('rewriteDirectives: slide-ng-motion', () => {
  it('collects the variants into one binding', () => {
    const html =
      '<div slide-ng-motion :initial="{ x: -80 }" :enter="{ x: 0 }" :click-2-4="{ y: 3 }" :leave="{ x: 80 }" class="a">hi</div>';
    expect(rewriteDirectives(html)).toBe(
      `<div class="a" [slide-ng-motion]="{ 'initial': ({ x: -80 }), 'enter': ({ x: 0 }), 'click-2-4': ({ y: 3 }), 'leave': ({ x: 80 }) }">hi</div>`,
    );
  });
  it('keeps slide-ng-click on the same element', () => {
    expect(
      rewriteDirectives('<div slide-ng-click="[2,4]" slide-ng-motion :enter="{ x: 0 }">'),
    ).toContain('slide-ng-click="[2,4]"');
  });
  it('warns about variants it cannot do and drops them', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(rewriteDirectives('<div slide-ng-motion :hovered="{ x: 1 }">')).not.toContain('hovered');
    expect(warn.mock.calls[0][0]).toContain(':hovered');
    warn.mockRestore();
  });
});

describe('rewriteDirectives: click animation presets', () => {
  it('moves the modifiers of slide-ng-click into click-anim', () => {
    expect(rewriteDirectives('<div slide-ng-click.fade.right="2">x</div>')).toBe(
      '<div click-anim="fade.right" slide-ng-click="2">x</div>',
    );
    expect(rewriteDirectives('<p class="a" slide-ng-click.up>x</p>')).toBe(
      '<p class="a" click-anim="up" slide-ng-click>x</p>',
    );
  });
  it('does the same for slide-ng-after and slide-ng-click-hide', () => {
    expect(rewriteDirectives('<li slide-ng-after.scale>x</li>')).toBe(
      '<li click-anim="scale" slide-ng-after>x</li>',
    );
    expect(rewriteDirectives("<li slide-ng-click-hide.none='3'>x</li>")).toBe(
      '<li click-anim="none" slide-ng-click-hide=\'3\'>x</li>',
    );
  });
  it('leaves a slide-ng-click without modifiers as it was written', () => {
    const tag = '<div\n  slide-ng-click="2"   class="a">';
    expect(rewriteDirectives(tag)).toBe(tag);
  });
  it('warns about .hide and keeps the other presets', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(rewriteDirectives('<div slide-ng-click.hide.fade>')).toBe(
      '<div click-anim="fade" slide-ng-click>',
    );
    expect(warn.mock.calls[0][0]).toContain('slide-ng-click-hide');
    warn.mockRestore();
  });
});
