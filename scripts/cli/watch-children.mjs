// Keeps the dev processes together: when any of them ends or cannot start, stop the rest and say which one.
/**
 * @param {{ name: string, child: import('node:events').EventEmitter & { kill(): void } }[]} parts
 * @param {(code: number) => void} finish called once, with the exit code for the command
 * @returns {{ stop(): void }} `stop` lets the processes end without ending the command (a restart)
 */
export function watchChildren(parts, finish, log = console.error) {
  let done = false;
  const end = (code, message) => {
    if (done) return;
    done = true;
    if (message) log(message);
    parts.forEach((p) => p.child.kill());
    finish(code);
  };
  for (const { name, child } of parts) {
    child.on('error', (e) => end(1, `[slide.ng] could not start ${name}: ${e.message}. Stopping.`));
    child.on('exit', (code, signal) => {
      // The Angular server ending on its own is a normal way to stop; the helpers ending is not.
      if (name === 'the Angular dev server') return end(code ?? 0);
      end(
        1,
        `[slide.ng] ${name} stopped (${signal ?? `exit code ${code}`}). Stopping the dev server.`,
      );
    });
  }
  return {
    stop() {
      done = true;
    },
  };
}
