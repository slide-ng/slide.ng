import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { quietClosedSockets } from '../../proxy.conf.mjs';

describe('quietClosedSockets', () => {
  const setup = () => {
    const proxy = new EventEmitter();
    const logged = vi.fn();
    quietClosedSockets(proxy);
    proxy.on('error', logged); // the dev server's own handler, which logs in red
    return { proxy, logged };
  };
  const reset = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });

  it('ends the socket of a closed tab without logging', () => {
    const { proxy, logged } = setup();
    const socket = { end: vi.fn() };
    proxy.emit('error', reset, {}, socket);
    expect(logged).not.toHaveBeenCalled();
    expect(socket.end).toHaveBeenCalled();
  });

  it('still reports other errors, and errors of HTTP requests', () => {
    const { proxy, logged } = setup();
    const refused = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    proxy.emit('error', refused, {}, { end() {} });
    proxy.emit('error', reset, {}, { req: {}, end() {} });
    expect(logged).toHaveBeenCalledTimes(2);
  });

  it('keeps the clean-up of a reset browser socket, but not the logger added after it', () => {
    const { proxy } = setup();
    const socket = new EventEmitter();
    const cleanUp = vi.fn();
    socket.on('error', cleanUp);
    proxy.emit('proxyReqWs', {}, {}, socket);
    const logger = vi.fn();
    socket.on('error', logger);
    socket.emit('error', reset);
    expect(cleanUp).toHaveBeenCalledWith(reset);
    expect(logger).not.toHaveBeenCalled();
    socket.emit('error', Object.assign(new Error('other'), { code: 'EOTHER' }));
    expect(logger).toHaveBeenCalledTimes(1);
  });
});
