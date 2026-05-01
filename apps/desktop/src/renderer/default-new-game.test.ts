import type { AppSettings } from '../config-store';
import { describe, expect, it } from 'vitest';

import { getDefaultNewGameInput } from './default-new-game';

function createSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    defaultProviderId: 'openai-compatible',
    defaultCredentialProfileId: 'default',
    defaultStoryModel: 'story-001',
    defaultLogicModel: null,
    useDualModel: false,
    ...overrides,
  };
}

describe('getDefaultNewGameInput', () => {
  it('returns a single-model payload when required defaults are present', () => {
    expect(getDefaultNewGameInput(createSettings())).toEqual({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: null,
      useDualModel: false,
    });
  });

  it('returns a dual-model payload when logic defaults are complete', () => {
    expect(
      getDefaultNewGameInput(
        createSettings({
          useDualModel: true,
          defaultLogicModel: 'logic-001',
        }),
      ),
    ).toEqual({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
    });
  });

  it('returns null when defaults are incomplete', () => {
    expect(getDefaultNewGameInput(createSettings({ defaultStoryModel: null }))).toBeNull();
    expect(getDefaultNewGameInput(createSettings({ useDualModel: true, defaultLogicModel: null }))).toBeNull();
  });
});
