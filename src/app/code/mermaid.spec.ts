import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { Dark } from '../lib/dark';
import { MERMAID_RENDERER } from '../setup/tokens';
import { Mermaid } from './mermaid';

describe('Mermaid', () => {
  it('draws a diagram that works after one that failed, and clears the export marker', async () => {
    const renderer = async (code: string) => {
      if (code === 'bad') throw new Error('cannot draw');
      return `<svg id="drawn" viewBox="0 0 10 10"><text>${code}</text></svg>`;
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [
        { provide: MERMAID_RENDERER, useValue: [() => renderer] },
        { provide: Dark, useValue: { isDark: () => false } },
      ],
    });
    const fixture = TestBed.createComponent(Mermaid);
    const host = fixture.nativeElement as HTMLElement;
    const settle = async () => {
      for (let i = 0; i < 5; i++) {
        await fixture.whenStable();
        await new Promise((r) => setTimeout(r));
      }
    };
    fixture.componentRef.setInput('code', 'bad');
    await settle();
    expect(host.querySelector('.mermaid-error')).not.toBeNull();
    expect(host.getAttribute('data-slide-ng-waitfor')).toBeNull();

    fixture.componentRef.setInput('code', 'good');
    await settle();
    expect(host.querySelector('.mermaid > svg#drawn')?.textContent).toBe('good');
    expect(host.getAttribute('data-slide-ng-waitfor')).toBeNull();
    warn.mockRestore();
  });
});
