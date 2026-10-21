// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { slideImages } from './slide-images.mjs';

describe('slideImages', () => {
  it('lists <img src> and url() in inline styles, once each', () => {
    const html =
      '<p><img src="/talk/a.png" alt=""><img src="https://x.test/b.jpg?w=1&amp;h=2"></p>' +
      '<div style="background-image: url(&quot;/talk/c.webp&quot;)"></div><img src="/talk/a.png">' +
      `<div style="background: url('/talk/d.jpg') no-repeat"></div>`;
    expect(slideImages(html)).toEqual([
      '/talk/a.png',
      'https://x.test/b.jpg?w=1&h=2',
      '/talk/c.webp',
      '/talk/d.jpg',
    ]);
  });
  it('takes the image layouts and the background from the frontmatter, with the base', () => {
    expect(slideImages('', { layout: 'image', image: '/pic.png' }, '/talk/')).toEqual([
      '/talk/pic.png',
    ]);
    expect(slideImages('', { background: '/bg.jpg' }, './')).toEqual(['bg.jpg']);
    expect(slideImages('', { backgroundImage: 'https://x.test/p.png' })).toEqual([
      'https://x.test/p.png',
    ]);
  });
  it('leaves out colours, data addresses, bindings and code samples', () => {
    expect(slideImages('', { background: '#123456' })).toEqual([]);
    expect(slideImages('', { background: 'linear-gradient(red, blue)' })).toEqual([]);
    const html =
      '<img src="data:image/png;base64,AAAA"><img src="{{ pic }}"><img [src]="pic">' +
      '<pre><code><img src="/code.png"></code></pre><svg style="fill: url(#g)"></svg>';
    expect(slideImages(html)).toEqual([]);
  });
  it('is empty for a slide with preload: false', () => {
    expect(slideImages('<img src="/a.png">', { preload: false, image: '/b.png' })).toEqual([]);
  });
});
