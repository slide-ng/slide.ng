import { isTyping } from './key-handler';
import { pressesControl } from './key-focus';

describe('isTyping', () => {
  const input = (type: string) => Object.assign(document.createElement('input'), { type });
  it('counts text fields and sliders as typing', () => {
    expect(isTyping(input('text'))).toBe(true);
    expect(isTyping(input('range'))).toBe(true);
    expect(isTyping(document.createElement('textarea'))).toBe(true);
  });
  it('does not count a checkbox or a button; a radio group uses the arrows itself', () => {
    expect(isTyping(input('checkbox'))).toBe(false);
    expect(isTyping(document.createElement('button'))).toBe(false);
    expect(isTyping(input('radio'))).toBe(true);
  });
  it('leaves Space and Enter to a focused button or checkbox', () => {
    const key = (k: string, target: EventTarget) => {
      const e = new KeyboardEvent('keydown', { key: k });
      Object.defineProperty(e, 'target', { value: target });
      return e;
    };
    expect(pressesControl(key(' ', input('checkbox')))).toBe(true);
    expect(pressesControl(key('Enter', document.createElement('summary')))).toBe(true);
    expect(pressesControl(key('ArrowRight', input('checkbox')))).toBe(false);
    expect(pressesControl(key(' ', document.createElement('div')))).toBe(false);
  });
});
