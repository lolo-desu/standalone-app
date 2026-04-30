import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createConfigStore,
  type AppSettings,
  type CredentialProfile,
} from './config-store';

async function withTempConfigStore(
  run: (context: {
    store: ReturnType<typeof createConfigStore>;
    credentialsFile: string;
    settingsFile: string;
  }) => void | Promise<void>,
) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'riji-luoluo-config-'));
  const credentialsFile = path.join(tempDir, 'config', 'credentials.json');
  const settingsFile = path.join(tempDir, 'config', 'settings.json');

  try {
    await run({
      store: createConfigStore({
        credentialsFile,
        settingsFile,
      }),
      credentialsFile,
      settingsFile,
    });
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

describe('config-store', () => {
  it('returns empty defaults when config files are missing', () => {
    return withTempConfigStore(({ store }) => {
      expect(store.loadCredentialProfiles()).toEqual([]);
      expect(store.loadAppSettings()).toEqual({
        defaultProviderId: null,
        defaultCredentialProfileId: null,
        defaultStoryModel: null,
        defaultLogicModel: null,
        useDualModel: false,
      });
    });
  });

  it('persists credential profiles to credentials.json', () => {
    const profiles: CredentialProfile[] = [
      {
        id: 'default',
        providerId: 'openai-compatible',
        label: '默认渠道',
        apiKey: 'sk-test',
        baseUrl: 'https://api.example.com',
      },
    ];

    return withTempConfigStore(({ store }) => {
      store.saveCredentialProfiles(profiles);

      expect(store.loadCredentialProfiles()).toEqual(profiles);
    });
  });

  it('persists app settings separately from credentials', () => {
    const settings: AppSettings = {
      defaultProviderId: 'openai-compatible',
      defaultCredentialProfileId: 'default',
      defaultStoryModel: 'story-001',
      defaultLogicModel: 'logic-001',
      useDualModel: true,
    };

    return withTempConfigStore(({ store }) => {
      store.saveAppSettings(settings);

      expect(store.loadAppSettings()).toEqual(settings);
      expect(store.loadCredentialProfiles()).toEqual([]);
    });
  });

  it('falls back to defaults when config files contain invalid json', () => {
    return withTempConfigStore(({ store, credentialsFile, settingsFile }) => {
      mkdirSync(path.dirname(credentialsFile), { recursive: true });
      writeFileSync(credentialsFile, '{');
      writeFileSync(settingsFile, '{');

      expect(store.loadCredentialProfiles()).toEqual([]);
      expect(store.loadAppSettings()).toEqual({
        defaultProviderId: null,
        defaultCredentialProfileId: null,
        defaultStoryModel: null,
        defaultLogicModel: null,
        useDualModel: false,
      });
    });
  });

  it('keeps temporary config files available for async test callbacks', async () => {
    const profiles: CredentialProfile[] = [
      {
        id: 'default',
        providerId: 'openai-compatible',
        label: '默认渠道',
        apiKey: 'sk-test',
        baseUrl: null,
      },
    ];

    await withTempConfigStore(async ({ store, credentialsFile }) => {
      store.saveCredentialProfiles(profiles);

      await Promise.resolve();

      expect(existsSync(credentialsFile)).toBe(true);
      expect(store.loadCredentialProfiles()).toEqual(profiles);
    });
  });
});
