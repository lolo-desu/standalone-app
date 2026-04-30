import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./App.vue', () => ({
  default: 'AppStub',
}));

describe('bootstrapElectrobunRenderer', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('creates an Electroview rpc client and injects it into the renderer bootstrap', async () => {
    const { bootstrapElectrobunRenderer } = await import('./electrobun-entry');
    const rpc = {
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
        loadRendererRuntime: async () => ({
          engineBaseUrl: 'http://127.0.0.1:43111',
        }),
      },
    };
    const defineRPC = vi.fn().mockReturnValue(rpc);
    const bootstrapRenderer = vi.fn().mockResolvedValue({
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
    });
    const Electroview = vi.fn(function Electroview(this: { rpc: unknown }, options: { rpc: unknown }) {
      this.rpc = options.rpc;
    }) as unknown as {
      new (options: { rpc: unknown }): { rpc: typeof rpc };
      defineRPC: (config: unknown) => typeof rpc;
    };

    Electroview.defineRPC = defineRPC;

    const runtime = await bootstrapElectrobunRenderer({
      Electroview,
      bootstrapRenderer,
      locationHref: 'views://renderer/index.html',
    });

    expect(defineRPC).toHaveBeenCalledWith({
      handlers: {
        requests: {},
      },
    });
    expect(Electroview).toHaveBeenCalledWith({ rpc });
    expect(bootstrapRenderer).toHaveBeenCalledWith({
      configRpc: {
        request: rpc.request,
      },
      engineBaseUrl: 'http://127.0.0.1:43111',
    });
    expect(runtime).toMatchObject({
      configStore: {
        credentialProfiles: [],
      },
    });
  });

  it('uses the main renderer bootstrap by default so the runtime includes App', async () => {
    const bootstrapRenderer = vi.fn().mockResolvedValue({
      App: 'AppStub',
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
    vi.doMock('./main', () => ({
      bootstrapRenderer,
    }));

    const { bootstrapElectrobunRenderer } = await import('./electrobun-entry');
    const rpc = {
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
        loadRendererRuntime: async () => ({
          engineBaseUrl: 'http://127.0.0.1:43111',
        }),
      },
    };
    const defineRPC = vi.fn().mockReturnValue(rpc);
    const Electroview = vi.fn(function Electroview(this: { rpc: unknown }, options: { rpc: unknown }) {
      this.rpc = options.rpc;
    }) as unknown as {
      new (options: { rpc: unknown }): { rpc: typeof rpc };
      defineRPC: (config: unknown) => typeof rpc;
    };

    Electroview.defineRPC = defineRPC;

    const runtime = await bootstrapElectrobunRenderer({
      Electroview,
    });

    expect(bootstrapRenderer).toHaveBeenCalledWith({
      configRpc: {
        request: rpc.request,
      },
      engineBaseUrl: 'http://127.0.0.1:43111',
    });
    expect(runtime).toMatchObject({
      App: 'AppStub',
      configStore: {
        credentialProfiles: [],
      },
    });
  });
});
