import { describe, expect, it } from 'vitest';

import type { AppSettings, CredentialProfile } from './config-store';
import { createConfigRpcHandlers, createRendererConfigBridge } from './config-rpc';

function createDefaultSettings(): AppSettings {
  return {
    defaultProviderId: null,
    defaultCredentialProfileId: null,
    defaultStoryModel: null,
    defaultLogicModel: null,
    useDualModel: false,
  };
}

describe('config-rpc', () => {
  it('adapts a file-backed config store into async rpc handlers and a renderer bridge', async () => {
    let profiles: CredentialProfile[] = [];
    let settings = createDefaultSettings();
    const nextProfiles: CredentialProfile[] = [
      {
        id: 'default',
        providerId: 'openai-compatible',
        label: 'Default',
        apiKey: 'sk-test',
        baseUrl: null,
      },
    ];
    const nextSettings: AppSettings = {
      defaultProviderId: 'openai-compatible',
      defaultCredentialProfileId: 'default',
      defaultStoryModel: 'story-001',
      defaultLogicModel: null,
      useDualModel: false,
    };
    const handlers = createConfigRpcHandlers({
      loadCredentialProfiles: () => profiles,
      saveCredentialProfiles: (value) => {
        profiles = value;
      },
      loadAppSettings: () => settings,
      saveAppSettings: (value) => {
        settings = value;
      },
    });
    const bridge = createRendererConfigBridge({
      request: handlers,
    });

    await bridge.saveCredentialProfiles(nextProfiles);
    await bridge.saveAppSettings(nextSettings);

    expect(await bridge.loadCredentialProfiles()).toEqual(nextProfiles);
    expect(await bridge.loadAppSettings()).toEqual(nextSettings);
  });
});
