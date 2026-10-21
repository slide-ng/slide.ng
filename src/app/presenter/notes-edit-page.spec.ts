import { typeKeys } from './notes-edit-page';

const keys = (...list: string[]) => list.map((key) => ({ key, ctrl: false }));

describe('typeKeys', () => {
  it('types the keys kept during a reload at the caret', () => {
    expect(typeKeys('tyslow', 2, 2, keys('p', 'e', 'd', '-'))).toEqual({
      text: 'typed-slow',
      caret: 6,
    });
    expect(typeKeys('ab', 2, 2, keys('Enter', 'c'))).toEqual({ text: 'ab\nc', caret: 4 });
  });

  it('replaces a selection and deletes with Backspace and Delete', () => {
    expect(typeKeys('hello world', 0, 5, keys('H', 'i'))).toEqual({ text: 'Hi world', caret: 2 });
    expect(typeKeys('abc', 2, 2, keys('Backspace', 'Delete'))).toEqual({ text: 'a', caret: 1 });
    expect(typeKeys('abc', 0, 3, keys('Backspace'))).toEqual({ text: '', caret: 0 });
    expect(typeKeys('', 0, 0, keys('Backspace'))).toEqual({ text: '', caret: 0 });
  });

  it('skips shortcuts and keys that type nothing', () => {
    expect(
      typeKeys('a', 1, 1, [
        { key: 'z', ctrl: true },
        { key: 'Shift', ctrl: false },
        { key: 'ArrowLeft', ctrl: false },
        { key: 'é', ctrl: false },
      ]),
    ).toEqual({ text: 'aé', caret: 2 });
  });
});
