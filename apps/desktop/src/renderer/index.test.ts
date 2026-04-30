import { afterEach, describe, expect, it, vi } from 'vitest';

const mount = vi.fn();
const createApp = vi.fn(() => ({
  mount,
}));
const bootstrapElectrobunRenderer = vi.fn().mockResolvedValue({
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
  });

  it('bootstraps and mounts the Vue app into #app', async () => {
    await import('./index');
    await Promise.resolve();

    expect(bootstrapElectrobunRenderer).toHaveBeenCalledWith({
      Electroview: 'ElectroviewStub',
    });
    expect(createApp).toHaveBeenCalledWith('AppStub');
    expect(mount).toHaveBeenCalledWith('#app');
  });
});
