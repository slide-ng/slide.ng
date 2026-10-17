// What the browser tests count as a console problem: errors and warnings, with the address of a request that failed.
// Chrome on a machine without a GPU (CI runners) warns "No available adapters." when a page asks for WebGPU;
// that says nothing about the deck, so it is not counted.
const NOT_OURS = new Set(['No available adapters.']);

/** The problem as text, or null when the message is not one. */
export function consoleProblem(message) {
  if (!['error', 'warning'].includes(message.type())) return null;
  const text = message.text();
  if (NOT_OURS.has(text)) return null;
  const where = text.startsWith('Failed to load resource') ? ` (${message.location().url})` : '';
  return `${message.type()}: ${text}${where}`;
}
