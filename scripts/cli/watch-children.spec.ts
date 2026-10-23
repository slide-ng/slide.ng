import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { watchChildren } from './watch-children.mjs';

const fake = () =>
  Object.assign(new EventEmitter(), {
    killed: false,
    kill() {
      this.killed = true;
    },
  });

describe('watchChildren', () => {
  it('stops the others and fails when a helper exits', () => {
    const [gen, srv, ng] = [fake(), fake(), fake()];
    const codes: number[] = [];
    const logs: string[] = [];
    watchChildren(
      [
        { name: 'the slide generator', child: gen },
        { name: 'the companion server', child: srv },
        { name: 'the Angular dev server', child: ng },
      ],
      (c) => codes.push(c),
      (m) => logs.push(m),
    );
    gen.emit('exit', 1, null);
    expect(codes).toEqual([1]);
    expect(srv.killed && ng.killed).toBe(true);
    expect(logs[0]).toContain('the slide generator stopped');
    ng.emit('exit', 0, null);
    expect(codes).toEqual([1]);
  });
  it('passes on the exit code of the Angular server and reports a spawn error', () => {
    const ng = fake();
    const codes: number[] = [];
    watchChildren([{ name: 'the Angular dev server', child: ng }], (c) => codes.push(c));
    ng.emit('exit', 3, null);
    expect(codes).toEqual([3]);
    const srv = fake();
    const logs: string[] = [];
    watchChildren(
      [{ name: 'the companion server', child: srv }],
      (c) => codes.push(c),
      (m) => logs.push(m),
    );
    srv.emit('error', new Error('ENOENT'));
    expect(codes).toEqual([3, 1]);
    expect(logs[0]).toContain('could not start the companion server');
  });
  it('after stop, a process that ends no longer ends the command (a restart)', () => {
    const [gen, ng] = [fake(), fake()];
    const codes: number[] = [];
    const watcher = watchChildren(
      [
        { name: 'the slide generator', child: gen },
        { name: 'the Angular dev server', child: ng },
      ],
      (c) => codes.push(c),
      () => {},
    );
    watcher.stop();
    gen.emit('exit', null, 'SIGTERM');
    ng.emit('exit', 0, null);
    expect(codes).toEqual([]);
    expect(gen.killed || ng.killed).toBe(false);
  });
});
