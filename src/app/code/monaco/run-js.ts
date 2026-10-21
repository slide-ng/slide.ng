// Runs JavaScript in a sandboxed iframe and collects what it logs.
import { frameHtml } from './runner-frame';

/** One line of output: the values given to one console.log call. */
export type OutputLine = string[];
export interface RunResult {
  lines: OutputLine[];
  error?: string;
}

const TIMEOUT_MS = 5000;
let counter = 0;

export function runJs(js: string, strict = true): Promise<RunResult> {
  return new Promise((resolve) => {
    const id = `run-${++counter}`;
    const result: RunResult = { lines: [] };
    const frame = document.createElement('iframe');
    // `allow-scripts` without `allow-same-origin`: the code runs, but cannot reach the page.
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.style.display = 'none';

    const finish = () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      frame.remove();
      resolve(result);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow || e.data?.id !== id) return;
      if (e.data.line) result.lines.push(e.data.line);
      if (e.data.clear) result.lines = [];
      if (e.data.error) result.error = e.data.error;
      if (e.data.done) finish();
    };
    // Code that never ends (an endless loop, a promise that never settles) is cut off.
    const timer = setTimeout(() => {
      result.error = `Stopped after ${TIMEOUT_MS / 1000} seconds`;
      finish();
    }, TIMEOUT_MS);

    window.addEventListener('message', onMessage);
    frame.srcdoc = frameHtml(js, id, strict);
    document.body.append(frame);
  });
}
