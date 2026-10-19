// The headmatter switches `contextMenu`, `presenter`, `editor` and `wakeLock`, as in Slidev (types/src/frontmatter.ts):
// `true`, `false`, or `dev` / `build` to turn the feature on in that mode only. Not set means on.
import { isDevMode } from '@angular/core';
import { HEADMATTER } from '../../slides/generated';

export function readSwitch(value: unknown, dev: boolean): boolean {
  if (value === true || value === false) return value;
  if (value === 'dev') return dev;
  if (value === 'build') return !dev;
  return true;
}

export const contextMenuEnabled = (): boolean => readSwitch(HEADMATTER['contextMenu'], isDevMode());
export const presenterEnabled = (): boolean => readSwitch(HEADMATTER['presenter'], isDevMode());
export const editorEnabled = (): boolean => HEADMATTER['editor'] !== false;
export const wakeLockEnabled = (): boolean => readSwitch(HEADMATTER['wakeLock'], isDevMode());
