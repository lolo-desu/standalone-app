import { afterEach, describe, expect, it, vi } from 'vitest';

const mount = vi.fn();
const createApp = vi.fn(() => ({
  mount,
}));
const bootstrapElectrobunRenderer = vi.fn();

vi.mock('vue', () => ({
  createApp,
}));

vi.mock('electrobun/view', () => ({
  Electroview: 'ElectroviewStub',
}));

vi.mock('./electrobun-entry', () => ({
  bootstrapElectrobunRenderer,
}));

describe('renderer index', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('bootstraps and mounts the Vue app into #app', async () => {
    const appRoot = { innerHTML: '' };
    const sessionStore = {
      currentSession: null,
    };

    bootstrapElectrobunRenderer.mockResolvedValue({
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
      sessionStore,
    });
    vi.stubGlobal('document', {
      querySelector: vi.fn().mockReturnValue(appRoot),
    });
    vi.stubGlobal('HTMLElement', Object);

    await import('./index');
    await Promise.resolve();

    expect(bootstrapElectrobunRenderer).toHaveBeenCalledWith({
      Electroview: 'ElectroviewStub',
    });
    expect(createApp).toHaveBeenCalledWith('AppStub', { sessionStore });
    expect(mount).toHaveBeenCalledWith('#app');
  });

  it('renders a readable error screen when bootstrap fails', async () => {
    const appRoot = { innerHTML: '' };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    bootstrapElectrobunRenderer.mockRejectedValue(new Error('boom <fail>'));
    vi.stubGlobal('document', {
      querySelector: vi.fn().mockReturnValue(appRoot),
    });
    vi.stubGlobal('HTMLElement', Object);

    await import('./index');
    await Promise.resolve();
    await Promise.resolve();

    expect(consoleError).toHaveBeenCalledWith('Renderer bootstrap failed', expect.any(Error));
    expect(appRoot.innerHTML).toContain('渲染器启动失败');
    expect(appRoot.innerHTML).toContain('boom &lt;fail&gt;');
  });
});
