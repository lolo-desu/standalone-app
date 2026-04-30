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
    const mainHandlers = defineRPC.mock.calls[0]?.[0]?.handlers?.requests;

    expect(bootstrap).toHaveBeenCalledWith();
    expect(defineRPC).toHaveBeenCalledWith({
      handlers: {
        requests: expect.objectContaining({
          ...runtime.configRpcHandlers,
          loadRendererRuntime: expect.any(Function),
        }),
      },
    });
    expect(mainHandlers.loadRendererRuntime({})).toEqual({
      engineBaseUrl: runtime.engineBaseUrl,
    });
    expect(BrowserWindow).toHaveBeenCalledWith({
      title: '日记络络',
      url: 'views://renderer/index.html',
      rpc,
    });
    expect(launched).toMatchObject({
      rpc,
      runtime,
    });
  });
});
