import { TestBed } from '@angular/core/testing';
import { UI_TEXT, mergeUiText } from '../i18n/ui-text';
import { DevApi, passwordInAddress, withoutPassword } from './dev-api';

describe('the password in the address', () => {
  it('is read from the query, and from the query after the # of a hash deck', () => {
    expect(passwordInAddress({ search: '?password=a%20b', hash: '' })).toBe('a b');
    expect(passwordInAddress({ search: '', hash: '#/presenter/1?password=x&y=1' })).toBe('x');
    expect(passwordInAddress({ search: '', hash: '#/?password=%20s%20' })).toBe(' s ');
    expect(passwordInAddress({ search: '?other=1', hash: '#/3' })).toBeNull();
  });
  it('is taken out of the address, the rest stays', () => {
    expect(withoutPassword('http://h:1/presenter/1?password=x&y=2')).toBe(
      'http://h:1/presenter/1?y=2',
    );
    expect(withoutPassword('http://h:1/#/?password=x')).toBe('http://h:1/#/');
    expect(withoutPassword('http://h:1/#/presenter/1?password=x&y=2')).toBe(
      'http://h:1/#/presenter/1?y=2',
    );
    expect(withoutPassword('http://h:1/#/3')).toBe('http://h:1/#/3');
  });
});

describe('DevApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks for the password in the deck's language", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 })),
    );
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue(null);
    TestBed.configureTestingModule({
      providers: [{ provide: UI_TEXT, useValue: mergeUiText({ 'dev.password': 'Parola' }) }],
    });
    const api = TestBed.inject(DevApi);
    expect(await api.token()).toBeNull();
    expect(prompt).toHaveBeenCalledWith('Parola');
    expect(api.locked()).toBe(true);
    prompt.mockRestore();
  });
});
