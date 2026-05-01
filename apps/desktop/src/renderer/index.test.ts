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
    const startNewGameFromDefaults = vi.fn().mockResolvedValue(undefined);
    const sessionStore = {
      currentSession: null,
      bootstrapState: 'idle',
      bootstrapError: null,
      setupDefaults: { name: '', gender: '', persona: '' },
      submitPlayerProfile: vi.fn(),
      startNewGameFromDefaults,
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
          lastPlayerName: null,
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
    expect(createApp).toHaveBeenCalledWith('AppStub', {
      sessionStore,
    });
    expect(startNewGameFromDefaults).not.toHaveBeenCalled();
    expect(mount).toHaveBeenCalledWith('#app');
  });

  it('does not auto-start a new game on empty startup', async () => {
    const appRoot = { innerHTML: '' };
    const startNewGameFromDefaults = vi.fn().mockResolvedValue(undefined);
    const sessionStore = {
      currentSession: null,
      bootstrapState: 'idle',
      bootstrapError: null,
      setupDefaults: { name: '林明霜', gender: '', persona: '' },
      submitPlayerProfile: vi.fn(),
      startNewGameFromDefaults,
    };

    bootstrapElectrobunRenderer.mockResolvedValue({
      App: 'AppStub',
      configStore: {
        credentialProfiles: [],
        appSettings: {
          defaultProviderId: 'openai-compatible',
          defaultCredentialProfileId: 'default',
          defaultStoryModel: 'story-001',
          defaultLogicModel: null,
          useDualModel: false,
          lastPlayerName: '林明霜',
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
    await Promise.resolve();

    expect(startNewGameFromDefaults).not.toHaveBeenCalled();
    expect(createApp).toHaveBeenCalledWith('AppStub', { sessionStore });
  });

  it('does not auto-start when a session already exists', async () => {
    const appRoot = { innerHTML: '' };
    const startNewGameFromDefaults = vi.fn().mockResolvedValue(undefined);
    const sessionStore = {
      currentSession: { sceneState: { mode: 'dialog', speaker: '络络', text: '已有存档' } },
      bootstrapState: 'idle',
      bootstrapError: null,
      setupDefaults: { name: '林明霜', gender: '', persona: '' },
      submitPlayerProfile: vi.fn(),
      startNewGameFromDefaults,
    };

    bootstrapElectrobunRenderer.mockResolvedValue({
      App: 'AppStub',
      configStore: {
        credentialProfiles: [],
        appSettings: {
          defaultProviderId: 'openai-compatible',
          defaultCredentialProfileId: 'default',
          defaultStoryModel: 'story-001',
          defaultLogicModel: null,
          useDualModel: false,
          lastPlayerName: '林明霜',
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
    await Promise.resolve();

    expect(startNewGameFromDefaults).not.toHaveBeenCalled();
  });

  it('mounts the app while auto-start is still pending', async () => {
    const appRoot = { innerHTML: '' };
    const startNewGameFromDefaults = vi.fn().mockReturnValue(new Promise(() => {}));
    const sessionStore = {
      currentSession: null,
      bootstrapState: 'idle',
      bootstrapError: null,
      setupDefaults: { name: '林明霜', gender: '', persona: '' },
      submitPlayerProfile: vi.fn(),
      startNewGameFromDefaults,
    };

    bootstrapElectrobunRenderer.mockResolvedValue({
      App: 'AppStub',
      configStore: {
        credentialProfiles: [],
        appSettings: {
          defaultProviderId: 'openai-compatible',
          defaultCredentialProfileId: 'default',
          defaultStoryModel: 'story-001',
          defaultLogicModel: null,
          useDualModel: false,
          lastPlayerName: '林明霜',
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
    await Promise.resolve();

    expect(startNewGameFromDefaults).not.toHaveBeenCalled();
    expect(createApp).toHaveBeenCalledWith('AppStub', {
      sessionStore,
    });
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

  it('shows the current startup stage while renderer bootstrap is still pending', async () => {
    const appRoot = { innerHTML: '' };

    bootstrapElectrobunRenderer.mockReturnValue(new Promise(() => {}));
    vi.stubGlobal('document', {
      querySelector: vi.fn().mockReturnValue(appRoot),
    });
    vi.stubGlobal('HTMLElement', Object);

    await import('./index');
    await Promise.resolve();

    expect(appRoot.innerHTML).toContain('渲染器启动中');
    expect(appRoot.innerHTML).toContain('bootstrap');
  });
});
