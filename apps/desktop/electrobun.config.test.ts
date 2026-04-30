import { describe, expect, it } from 'vitest';

import config from './electrobun.config';

describe('electrobun config', () => {
  it('uses the bun entrypoint name expected by the flat-files launcher', () => {
    expect(config.build.bun.entrypoint).toBe('src/bun/index.ts');
  });
});
