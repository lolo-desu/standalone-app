import { describe, expect, it } from 'vitest';

import { normalizeLorebook } from './index';

describe('prompt-runtime index', () => {
  it('re-exports lorebook helpers', () => {
    expect(
      normalizeLorebook({
        name: 'Lorebook',
        entries: {},
      }).kind,
    ).toBe('lorebook');
  });
});
