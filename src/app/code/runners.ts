// A theme or addon can change how an editor runs its code (Slidev's setupCodeRunners). Provide this token with `multi: true`
// in setup/providers.ts; the key is the language id ('javascript', 'typescript') and the function gets the editor's text.
import { InjectionToken } from '@angular/core';
import type { RunResult } from './monaco/run-js';

// A runner may answer at once or later (Slidev accepts both).
export type CodeRunnerFn = (code: string) => RunResult | Promise<RunResult>;

export const CODE_RUNNERS = new InjectionToken<Record<string, CodeRunnerFn>[]>('CODE_RUNNERS');
