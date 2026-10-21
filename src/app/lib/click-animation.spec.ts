import { clickPresets, presetNames } from './click-animation';

describe('presetNames', () => {
  it('reads dots, spaces, commas and lists', () => {
    expect(presetNames('fade.right')).toEqual(['fade', 'right']);
    expect(presetNames('fade, up scale')).toEqual(['fade', 'up', 'scale']);
    expect(presetNames(['fade', 'left'])).toEqual(['fade', 'left']);
    expect(presetNames(undefined)).toEqual([]);
  });
});

describe('clickPresets', () => {
  it('prefers the element, then the slide, then the headmatter', () => {
    expect(clickPresets('up', { clickAnimation: 'fade' }, { clickAnimation: 'scale' })).toEqual([
      'up',
    ]);
    expect(
      clickPresets(undefined, { clickAnimation: 'fade' }, { clickAnimation: 'scale' }),
    ).toEqual(['fade']);
    expect(clickPresets('', {}, { clickAnimation: 'scale' })).toEqual(['scale']);
    expect(clickPresets(undefined, {}, {})).toEqual([]);
  });
});
