import { describe, expect, it } from 'vitest';

import type { AppSettings, CredentialProfile } from '../../config-store';
import { createConfigStore } from './config';

function createDefaultSettings(): AppSettings {
  return {
    defaultProviderId: null,
    defaultCredentialProfileId: null,
    defaultStoryModel: null,
    defaultLogicModel: null,
    useDualModel: false,
  };
}

describe('createConfigStore', () => {
  it('hydrates credential profiles and app settings from the preload bridge', async () => {
    const profiles: CredentialProfile[] = [
      {
        id: 'default',
        providerId: 'openai-compatible',
        label: 'Default',
        apiKey: 'sk-test',
        baseUrl: 'https://api.example.com',
      },
    ];
    const settings: AppSettings = {
      defaultProviderId: 'openai-compatible',
      defaultCredentialProfileId: 'default',
      defaultStoryModel: 'story-001',
      defaultLogicModel: 'logic-001',
      useDualModel: true,
    };
    const bridge = {
      loadCredentialProfiles: async () => profiles,
      saveCredentialProfiles: async (_nextProfiles: CredentialProfile[]) => {},
      loadAppSettings: async () => settings,
      saveAppSettings: async (_nextSettings: AppSettings) => {},
    };

    const store = createConfigStore(bridge);

    await store.hydrate();

    expect(store.credentialProfiles).toEqual(profiles);
    expect(store.appSettings).toEqual(settings);
  });

  it('persists profile and setting updates through the preload bridge', async () => {
    let profiles: CredentialProfile[] = [];
    let settings = createDefaultSettings();
    const nextProfiles: CredentialProfile[] = [
      {
        id: 'school',
        providerId: 'openai-compatible',
        label: 'School',
        apiKey: 'sk-school',
        baseUrl: null,
      },
    ];
    const nextSettings: AppSettings = {
      defaultProviderId: 'openai-compatible',
      defaultCredentialProfileId: 'school',
      defaultStoryModel: 'story-002',
      defaultLogicModel: null,
      useDualModel: false,
    };
    const bridge = {
      loadCredentialProfiles: async () => profiles,
      saveCredentialProfiles: async (value: CredentialProfile[]) => {
        profiles = value;
      },
      loadAppSettings: async () => settings,
      saveAppSettings: async (value: AppSettings) => {
        settings = value;
      },
    };

    const store = createConfigStore(bridge);

    await store.saveCredentialProfiles(nextProfiles);
    await store.saveAppSettings(nextSettings);

    expect(store.credentialProfiles).toEqual(nextProfiles);
    expect(store.appSettings).toEqual(nextSettings);
  });
});
