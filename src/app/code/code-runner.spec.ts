import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ClicksContext } from '../lib/clicks';
import { SlideNgClick } from '../lib/slide-ng-click';
import { CodeRunner } from './code-runner';
import type { RunResult } from './monaco/run-js';

const never = () => new Promise<RunResult>(() => undefined);

// The runner sits inside the editor's component, like in a `{monaco-run}` block.
@Component({
  selector: 'run-box',
  imports: [CodeRunner],
  template: `<code-runner code="x" [execute]="execute" [autorun]="false" showOutputAt="+1" />`,
})
class RunBox {
  protected execute = never;
}

@Component({
  imports: [RunBox, SlideNgClick],
  providers: [ClicksContext],
  template: '<run-box /><div id="after" slide-ng-click>after</div>',
})
class Slide {}

describe('CodeRunner', () => {
  it('keeps the newest result when an older run ends later', async () => {
    const done: Array<(r: RunResult) => void> = [];
    const execute = () => new Promise<RunResult>((resolve) => done.push(resolve));
    TestBed.configureTestingModule({
      providers: [{ provide: ClicksContext, useValue: { register() {}, unregister() {} } }],
    });
    const fixture = TestBed.createComponent(CodeRunner);
    fixture.componentRef.setInput('code', 'x');
    fixture.componentRef.setInput('execute', execute);
    fixture.componentRef.setInput('autorun', false);
    const run = () => (fixture.componentInstance as unknown as { run(): Promise<void> }).run();
    const old = run();
    const fresh = run();
    done[1]({ lines: [['new']] });
    await fresh;
    done[0]({ lines: [['old']] });
    await old;
    const result = (fixture.componentInstance as unknown as { result(): RunResult }).result();
    expect(result.lines).toEqual([['new']]);
  });

  it('numbers the output click in document order, before a later slide-ng-click', async () => {
    const fixture = TestBed.createComponent(Slide);
    fixture.detectChanges();
    await fixture.whenStable();
    const ctx = fixture.debugElement.injector.get(ClicksContext);
    const after = fixture.nativeElement.querySelector('#after');
    expect(after.getAttribute('data-slidev-clicks-start')).toBe('2');
    ctx.setCurrent(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('code-runner').classList).not.toContain(
      'slidev-vclick-hidden',
    );
    expect(after.classList).toContain('slidev-vclick-hidden');
  });
});
