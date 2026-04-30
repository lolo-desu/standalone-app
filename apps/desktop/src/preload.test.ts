import { describe, expect, it } from 'vitest';

import { createPreloadState, preloadState } from './preload';

describe('preload', () => {
  it('creates a minimal ready marker for the preload entrypoint', () => {
    expect(createPreloadState()).toEqual({ ready: true });
  });

  it('exports the default preload state', () => {
    expect(preloadState).toEqual({ ready: true });
  });
});
