import { describe, expect, it, vi } from 'vitest';

vi.mock('./bootstrap', () => ({
  bootstrapRenderer: vi.fn().mockResolvedValue({
    apiClient: {
      createNewSession: vi.fn(),
      createSaveSnapshot: vi.fn(),
      loadSaveSnapshot: vi.fn(),
    },
    configStore: {
      credentialProfiles: [],
      appSettings: {
        defaultProviderId: null,
        defaultCredentialProfileId: null,
        defaultStoryModel: null,
        defaultLogicModel: null,
        useDualModel: false,
      },
    },
    sessionStore: {
      currentSession: null,
    },
  }),
}));

import { bootstrapRenderer as bootstrapRendererRuntime } from './bootstrap';
import { bootstrapRenderer } from './main';

describe('renderer main wrapper', () => {
  it('returns the app component together with the bootstrapped runtime', async () => {
    const dependencies = {
      configRpc: {
        request: {
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
        },
      },
      engineBaseUrl: 'http://engine.test',
    };

    const runtime = await bootstrapRenderer(dependencies);

    expect(bootstrapRendererRuntime).toHaveBeenCalledWith(dependencies);
    expect(runtime.App).not.toBeTypeOf('string');
    expect(runtime).toEqual({
      App: expect.any(Object),
      apiClient: {
        createNewSession: expect.any(Function),
        createSaveSnapshot: expect.any(Function),
        loadSaveSnapshot: expect.any(Function),
      },
      configStore: {
        credentialProfiles: [],
        appSettings: {
          defaultProviderId: null,
          defaultCredentialProfileId: null,
          defaultStoryModel: null,
          defaultLogicModel: null,
          useDualModel: false,
        },
      },
      sessionStore: {
        currentSession: null,
      },
    });
  });
});
