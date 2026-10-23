// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// Every watch fails the way it does once the system's watch limit is used up.
vi.mock('node:fs', async (actual) => ({
  ...(await actual<typeof import('node:fs')>()),
  watch: () => {
    throw Object.assign(new Error('ENOSPC: System limit for number of file watchers reached'), {
      code: 'ENOSPC',
    });
  },
}));

const { watchFolder } = await import('./watch-folder.mjs');

describe('watchFolder when no watch can be made', () => {
  it('gives up on a missing folder instead of trying the folder above it forever', () => {
    const root = mkdtempSync(join(tmpdir(), 'slide-ng-watch-limit-'));
    try {
      const w = watchFolder(join(root, 'layers'), () => {});
      expect(() => w.close()).not.toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
