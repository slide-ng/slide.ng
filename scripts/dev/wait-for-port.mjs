// Loaded into the Angular dev server's process (`node --import`, see cli/dev.mjs). Angular's dev server only starts to listen
// after its first good build; until then `slide-ng dev` shows a page on the port that says what is wrong (waiting-page.mjs).
// When the Angular server wants the port, this asks that page to let it go and waits for it to be free.
import net from 'node:net';

const port = Number(process.env.SLIDE_NG_WAIT_PORT);
const secret = process.env.SLIDE_NG_WAIT_SECRET;
const LIMIT_MS = 15_000;

if (port && secret) {
  const listen = net.Server.prototype.listen;
  net.Server.prototype.listen = function (...args) {
    const [first, second] = args;
    const options = typeof first === 'object' && first !== null ? first : null;
    const wanted = Number(options ? options.port : first);
    if (wanted !== port) return listen.apply(this, args);
    // Angular's own port check (`checkPort` in @angular/build) listens on the port with a plain net server and closes it at
    // once, before the first build. Asking the page to step aside for it would leave the port free for the whole build:
    // the check listens on a spare port instead and is told it got the one it asked for. Only the real server (an HTTP,
    // HTTPS or HTTP/2 server, never a plain net.Server) takes the port over.
    if (Object.getPrototypeOf(this) === net.Server.prototype) {
      const address = this.address.bind(this);
      this.address = () => {
        const real = address();
        return real && typeof real === 'object' ? { ...real, port } : real;
      };
      return options
        ? listen.call(this, { ...options, port: 0 })
        : listen.call(this, 0, ...args.slice(1));
    }
    const host = options ? options.host : typeof second === 'string' ? second : undefined;
    const started = Date.now();
    let asked = false;
    const attempt = () => {
      // A server of our own on the same address: free when it can listen (it closes again at once).
      const probe = net.createServer();
      probe.once('error', async () => {
        if (!asked) {
          asked = true;
          await release(host);
        }
        if (Date.now() - started > LIMIT_MS) listen.apply(this, args);
        else setTimeout(attempt, 100);
      });
      probe.once('listening', () => probe.close(() => listen.apply(this, args)));
      listen.call(probe, port, host);
    };
    attempt();
    return this;
  };
}

// Asks the waiting page to close (only one that knows the secret answers it).
async function release(host) {
  const name = !host || host === '0.0.0.0' || host === '::' ? 'localhost' : host;
  try {
    await fetch(`http://${name.includes(':') ? `[${name}]` : name}:${port}/__slide-ng-release`, {
      method: 'POST',
      headers: { 'x-slide-ng-wait': secret },
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // not ours, or gone already: wait for the port as it is
  }
}
