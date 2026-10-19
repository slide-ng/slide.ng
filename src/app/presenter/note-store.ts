import { Injectable, inject } from '@angular/core';
import { DevApi } from '../dev/dev-api';

/** Reads and writes speaker notes through the dev server (the overview page and the notes editor). */
@Injectable({ providedIn: 'root' })
export class NoteStore {
  private api = inject(DevApi);

  /** The notes as the files have them now (null for a slide that is not in a file of the project), or null without a dev server. */
  async load(): Promise<(string | null)[] | null> {
    return (await this.api.get<{ notes: (string | null)[] }>('/notes'))?.notes ?? null;
  }

  /** Saves the note of slide `no`. `base` is the note as it was read: when the file has another one now, the server answers 409. */
  save(no: number, note: string, base: string): Promise<number> {
    return this.api.request('PUT', `/slides/${no}/note`, { note, base });
  }
}
