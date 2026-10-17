import { isTyping } from './key-handler';

describe('isTyping', () => {
  const input = (type: string) => Object.assign(document.createElement('input'), { type });
  it('counts text fields and sliders as typing', () => {
    expect(isTyping(input('text'))).toBe(true);
    expect(isTyping(input('range'))).toBe(true);
    expect(isTyping(document.createElement('textarea'))).toBe(true);
  });
  it('does not count a checkbox, a radio or a button', () => {
    expect(isTyping(input('checkbox'))).toBe(false);
    expect(isTyping(input('radio'))).toBe(false);
    expect(isTyping(document.createElement('button'))).toBe(false);
  });
});
