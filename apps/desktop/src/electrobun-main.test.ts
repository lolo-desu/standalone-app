import { describe, expect, it, vi } from 'vitest';

import type { ConfigRpcHandlers } from './config-rpc';
import { launchElectrobunApp } from './electrobun-main';

function createConfigRpcHandlers(): ConfigRpcHandlers {
  return {
    loadCredentialProfiles: async () => ({ profiles: [] }),
    saveCredentialProfiles: async () => {},
    loadAppSettings: async () => ({
      settings: {
        defaultProviderId: null,
        defaultCredentialProfileId: null,
        defaultStoryModel: null,
        defaultLogicModel: null,
        useDualModel: false,
      },
    }),
    saveAppSettings: async () => {},
  };
}

describe('launchElectrobunApp', () => {
  it('creates a BrowserWindow wired to BrowserView.defineRPC handlers from bootstrap', async () => {
    const runtime = {
      configRpcHandlers: createConfigRpcHandlers(),
      engineBaseUrl: 'http://127.0.0.1:43111',
      engineEnv: {
        RIJI_LUOLUO_SAVES_DIR: '/tmp/riji-luoluo/saves',
      },
      paths: {
        settingsFile: '/tmp/riji-luoluo/config/settings.json',
      },
    };
    const rpc = { request: {} };
    const bootstrap = vi.fn().mockResolvedValue(runtime);
    const defineRPC = vi.fn().mockReturnValue(rpc);
    const BrowserWindow = vi.fn(function BrowserWindow(this: { options: unknown }, options: unknown) {
      this.options = options;
    });

    const launched = await launchElectrobunApp({
      bootstrap,
      BrowserView: {
        defineRPC,
      },
      BrowserWindow: BrowserWindow as unknown as new (options: unknown) => unknown,
    });

    expect(bootstrap).toHaveBeenCalledWith();
    expect(defineRPC).toHaveBeenCalledWith({
      handlers: {
        requests: runtime.configRpcHandlers,
      },
    });
    expect(BrowserWindow).toHaveBeenCalledWith({
      title: '日记络络',
      url: 'views://renderer/index.html?engineBaseUrl=http%3A%2F%2F127.0.0.1%3A43111',
      rpc,
    });
    expect(launched).toMatchObject({
      rpc,
      runtime,
    });
  });
});
