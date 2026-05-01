import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppSettings, CredentialProfile } from '../config-store';
import { bootstrapRenderer } from './bootstrap';

describe('bootstrapRenderer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hydrates a renderer config store from the injected config rpc client', async () => {
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
      lastPlayerName: null,
    };
    const runtime = await bootstrapRenderer({
      configRpc: {
        request: {
          loadCredentialProfiles: async () => ({ profiles }),
          saveCredentialProfiles: async (_payload: { profiles: CredentialProfile[] }) => {},
          loadAppSettings: async () => ({ settings }),
          saveAppSettings: async (_payload: { settings: AppSettings }) => {},
        },
      },
      engineBaseUrl: 'http://engine.test',
    });

    expect(runtime.configStore.credentialProfiles).toEqual(profiles);
    expect(runtime.configStore.appSettings).toEqual(settings);
  });

  it('creates a session api client bound to the injected engine base url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionMeta: { id: 'sess_1', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
        modelConfig: { providerId: 'openai-compatible', credentialProfileId: 'default', storyModel: 'story-001', logicModel: null, useDualModel: false },
        gameState: { playerLocation: '教室', luoluoLocation: '教室', currentLocation: '教室', availableActions: ['interact', 'move', 'investigate'] },
        variableState: { stat_data: {} },
        timelineState: { nodes: [] },
        logState: { entries: [] },
        sceneState: { mode: 'dialog', text: '第一条消息', speaker: '络络' },
        investigationState: { entries: [] },
        saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const runtime = await bootstrapRenderer({
      configRpc: {
        request: {
          loadCredentialProfiles: async () => ({ profiles: [] }),
          saveCredentialProfiles: async (_payload: { profiles: CredentialProfile[] }) => {},
          loadAppSettings: async () => ({
            settings: {
              defaultProviderId: null,
              defaultCredentialProfileId: null,
              defaultStoryModel: null,
              defaultLogicModel: null,
              useDualModel: false,
              lastPlayerName: null,
            },
          }),
          saveAppSettings: async (_payload: { settings: AppSettings }) => {},
        },
      },
      engineBaseUrl: 'http://engine.test',
    });

    await runtime.sessionStore.startNewGame({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: null,
      useDualModel: false,
      playerProfile: {
        name: '林明霜',
        gender: '女',
        persona: '普通高中生，外冷内热。',
      },
    });

    expect(fetchMock).toHaveBeenCalledWith('http://engine.test/session/new', expect.any(Object));
  });

  it('saves lastPlayerName and starts a new game from the submitted player profile', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionMeta: { id: 'sess_1', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
        modelConfig: { providerId: 'openai-compatible', credentialProfileId: 'default', storyModel: 'story-001', logicModel: null, useDualModel: false },
        gameState: { playerLocation: '教室', luoluoLocation: '教室', currentLocation: '教室', availableActions: ['interact', 'move', 'investigate'] },
        variableState: {
          stat_data: {
            玩家: { 姓名: '沈秋', 性别: '非二元', 人设: '沉静，观察力强。' },
          },
        },
        timelineState: { nodes: [] },
        logState: { entries: [] },
        sceneState: { mode: 'dialog', text: '第一条真实首帧', speaker: '络络' },
        investigationState: { entries: [] },
        saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    let savedSettings: AppSettings | null = null;
    const runtime = await bootstrapRenderer({
      configRpc: {
        request: {
          loadCredentialProfiles: async () => ({ profiles: [] }),
          saveCredentialProfiles: async (_payload: { profiles: CredentialProfile[] }) => {},
          loadAppSettings: async () => ({
            settings: {
              defaultProviderId: 'openai-compatible',
              defaultCredentialProfileId: 'default',
              defaultStoryModel: 'story-001',
              defaultLogicModel: null,
              useDualModel: false,
              lastPlayerName: '林明霜',
            },
          }),
          saveAppSettings: async (_payload: { settings: AppSettings }) => {
            savedSettings = _payload.settings;
          },
        },
      },
      engineBaseUrl: 'http://engine.test',
    });

    await runtime.sessionStore.submitPlayerProfile({
      name: '沈秋',
      gender: '非二元',
      persona: '沉静，观察力强。',
    });

    expect(savedSettings?.lastPlayerName).toBe('沈秋');
    expect(fetchMock).toHaveBeenCalledWith('http://engine.test/session/new', expect.objectContaining({ method: 'POST' }));
    expect(runtime.sessionStore.currentSession?.variableState.stat_data.玩家).toEqual({
      姓名: '沈秋',
      性别: '非二元',
      人设: '沉静，观察力强。',
    });
  });

  it('hydrates setupDefaults.name from lastPlayerName after renderer bootstrap', async () => {
    const runtime = await bootstrapRenderer({
      configRpc: {
        request: {
          loadCredentialProfiles: async () => ({ profiles: [] }),
          saveCredentialProfiles: async (_payload: { profiles: CredentialProfile[] }) => {},
          loadAppSettings: async () => ({
            settings: {
              defaultProviderId: null,
              defaultCredentialProfileId: null,
              defaultStoryModel: null,
              defaultLogicModel: null,
              useDualModel: false,
              lastPlayerName: '林明霜',
            },
          }),
          saveAppSettings: async (_payload: { settings: AppSettings }) => {},
        },
      },
      engineBaseUrl: 'http://engine.test',
    });

    expect(runtime.sessionStore.setupDefaults).toEqual({
      name: '林明霜',
      gender: '',
      persona: '',
    });
  });

  it('does not fabricate model defaults when player profile submission runs without complete settings', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    let savedSettings: AppSettings | null = null;
    const runtime = await bootstrapRenderer({
      configRpc: {
        request: {
          loadCredentialProfiles: async () => ({ profiles: [] }),
          saveCredentialProfiles: async (_payload: { profiles: CredentialProfile[] }) => {},
          loadAppSettings: async () => ({
            settings: {
              defaultProviderId: null,
              defaultCredentialProfileId: null,
              defaultStoryModel: null,
              defaultLogicModel: null,
              useDualModel: false,
              lastPlayerName: null,
            },
          }),
          saveAppSettings: async (_payload: { settings: AppSettings }) => {
            savedSettings = _payload.settings;
          },
        },
      },
      engineBaseUrl: 'http://engine.test',
    });

    await runtime.sessionStore.submitPlayerProfile({
      name: '沈秋',
      gender: '',
      persona: '',
    });

    expect(savedSettings?.lastPlayerName).toBe('沈秋');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(runtime.sessionStore.bootstrapState).toBe('error');
    expect(runtime.sessionStore.bootstrapError).toBe('当前还没有可用于开始新游戏的默认配置。');
  });
});
