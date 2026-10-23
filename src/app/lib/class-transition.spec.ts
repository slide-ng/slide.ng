import { transitionInfo } from './class-transition';

const style = (values: Record<string, string>) => ({
  getPropertyValue: (name: string) => values[name] ?? '',
});

describe('transitionInfo', () => {
  it('waits for the longest transition, one event per property', () => {
    expect(
      transitionInfo(
        style({
          'transition-duration': '0.5s, 200ms',
          'transition-delay': '0s, 0.1s',
          'animation-duration': '0s',
          'animation-delay': '0s',
        }),
      ),
    ).toEqual({ type: 'transition', timeout: 500, count: 2 });
  });
  it('picks an animation when it is longer', () => {
    expect(
      transitionInfo(
        style({
          'transition-duration': '0s',
          'transition-delay': '0s',
          'animation-duration': '1s',
          'animation-delay': '0.2s',
        }),
      ),
    ).toEqual({ type: 'animation', timeout: 1200, count: 1 });
  });
  it('has nothing to wait for when the classes animate nothing', () => {
    expect(transitionInfo(style({ 'transition-duration': '0s' })).type).toBeNull();
  });
});
