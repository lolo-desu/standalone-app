import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { bootstrap } from './bootstrap';

describe('desktop bootstrap', () => {
  it('passes the resolved savesDir environment into engine launch', async () => {
    let launchInput:
      | {
          env: Record<string, string | undefined>;
        }
      | undefined;

    const runtime = await bootstrap({
      env: {
        HOME: '/tmp/lologames-home',
        NODE_ENV: 'test',
      },
      launchEngine: async (input) => {
        launchInput = input;
        return {
          baseUrl: 'http://127.0.0.1:43111',
        };
      },
      log() {},
    });

    expect(launchInput).toMatchObject({
      env: {
        NODE_ENV: 'test',
        RIJI_LUOLUO_SAVES_DIR: path.join('/tmp/lologames-home', 'riji-luoluo', 'saves'),
      },
    });
    expect(runtime.engineBaseUrl).toBe('http://127.0.0.1:43111');
  });

  it('falls back to the system home directory when env vars are unavailable', async () => {
    let launchInput:
      | {
          env: Record<string, string | undefined>;
        }
      | undefined;

    await bootstrap({
      env: {},
      launchEngine: async (input) => {
        launchInput = input;
        return {
          baseUrl: 'http://127.0.0.1:43111',
        };
      },
      log() {},
    });

    expect(launchInput).toMatchObject({
      env: {
        RIJI_LUOLUO_SAVES_DIR: path.join(os.homedir(), 'riji-luoluo', 'saves'),
      },
    });
  });

  it('returns config rpc handlers backed by the resolved app config files', async () => {
    const tempHome = mkdtempSync(path.join(os.tmpdir(), 'riji-luoluo-bootstrap-'));

    try {
      const runtime = await bootstrap({
        env: {
          HOME: tempHome,
        },
        launchEngine: async () => ({
          baseUrl: 'http://127.0.0.1:43111',
        }),
        log() {},
      });

      await runtime.configRpcHandlers.saveCredentialProfiles({
        profiles: [
          {
            id: 'default',
            providerId: 'openai-compatible',
            label: 'Default',
            apiKey: 'sk-test',
            baseUrl: null,
          },
        ],
      });

      expect(await runtime.configRpcHandlers.loadCredentialProfiles({})).toEqual({
        profiles: [
          {
            id: 'default',
            providerId: 'openai-compatible',
            label: 'Default',
            apiKey: 'sk-test',
            baseUrl: null,
          },
        ],
      });
      expect(runtime.paths.settingsFile).toBe(path.join(tempHome, 'riji-luoluo', 'config', 'settings.json'));
      expect(runtime.engineBaseUrl).toBe('http://127.0.0.1:43111');
    } finally {
      rmSync(tempHome, { force: true, recursive: true });
    }
  });
});
