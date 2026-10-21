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

// `signal` stops the run early: a new run, or leaving the slide, removes the old frame at once, so code stuck in an
// endless loop does not hold up the next run (sandboxed frames of one site can share a process) until its cut-off.
export function runJs(js: string, strict = true, signal?: AbortSignal): Promise<RunResult> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve({ lines: [], error: 'Stopped' });
    const id = `run-${++counter}`;
    const result: RunResult = { lines: [] };
    const frame = document.createElement('iframe');
    // `allow-scripts` without `allow-same-origin`: the code runs, but cannot reach the page.
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.style.display = 'none';

    const finish = () => {
      window.removeEventListener('message', onMessage);
      signal?.removeEventListener('abort', onAbort);
      clearTimeout(timer);
      frame.remove();
      resolve(result);
    };
    const onAbort = () => {
      result.error = 'Stopped';
      finish();
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
    signal?.addEventListener('abort', onAbort);
    frame.srcdoc = frameHtml(js, id, strict);
    document.body.append(frame);
  });
}
