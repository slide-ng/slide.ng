import { applyAttrSugar } from './attr-sugar.mjs';

describe('applyAttrSugar', () => {
  it('puts {#id .class} of a heading on the heading', () => {
    expect(applyAttrSugar('<h2>Intro {#intro .big .red}</h2>')).toBe(
      '<h2 id="intro" class="big red">Intro</h2>',
    );
    expect(applyAttrSugar('<h1>Plain</h1>')).toBe('<h1>Plain</h1>');
  });
  it('puts {width=..} of a picture on the picture', () => {
    expect(applyAttrSugar('<p><img src="/a.png" alt="a">{width=120 height=40}</p>')).toBe(
      '<p><img src="/a.png" alt="a" width="120" height="40"></p>',
    );
  });
});
