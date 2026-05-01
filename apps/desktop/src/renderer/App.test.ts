import type { Session } from '@lologames/shared';
import { createRenderer } from '@vue/runtime-core';
import { nextTick, reactive } from 'vue';
import { describe, expect, it } from 'vitest';

import App from './App';

type SessionStore = {
  currentSession: Session | null;
  bootstrapState: 'idle' | 'starting' | 'error';
  bootstrapError: string | null;
  setupDefaults: {
    name: string;
    gender: string;
    persona: string;
  };
  submitPlayerProfile: (profile: { name: string; gender: string; persona: string }) => Promise<void> | void;
};

function createSetupDefaults(overrides: Partial<SessionStore['setupDefaults']> = {}) {
  return {
    name: '',
    gender: '',
    persona: '',
    ...overrides,
  };
}

function createTestSession(overrides: Partial<Session> = {}): Session {
  return {
    sessionMeta: { id: 'sess_test', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
    modelConfig: { providerId: 'test', credentialProfileId: 'test', storyModel: 'test', logicModel: null, useDualModel: false },
    gameState: { playerLocation: 'loc', luoluoLocation: 'loc', currentLocation: 'loc', availableActions: [] },
    variableState: { stat_data: {} },
    timelineState: { nodes: [] },
    logState: { entries: [] },
    sceneState: { mode: 'dialog', speaker: '络络', text: '第一条消息' },
    investigationState: { entries: [] },
    saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
    ...overrides,
  };
}

function renderAppWithSessionStore(sessionStore: SessionStore) {
  return JSON.stringify(
    (App as { render: (this: { sessionStore: SessionStore }) => unknown }).render.call({
      sessionStore,
    }),
  );
}

type HostNode = {
  type: string;
  text: string | null;
  children: HostNode[];
  props?: Record<string, unknown>;
};

function createHostNode(type: string, text: string | null = null): HostNode {
  return {
    type,
    text,
    children: [],
  };
}

function getRenderedText(node: HostNode): string {
  return [node.text ?? '', ...node.children.map(getRenderedText)].join('');
}

function mountApp(sessionStore: SessionStore) {
  const root = createHostNode('root');
  const renderer = createRenderer<HostNode, HostNode>({
    patchProp(node, key, _prev, next) {
      node.props ??= {};
      node.props[key] = next;
    },
    insert(child, parent, anchor) {
      const existingIndex = parent.children.indexOf(child);
      if (existingIndex >= 0) {
        parent.children.splice(existingIndex, 1);
      }

      if (!anchor) {
        parent.children.push(child);
        return;
      }

      const anchorIndex = parent.children.indexOf(anchor);
      if (anchorIndex < 0) {
        parent.children.push(child);
        return;
      }

      parent.children.splice(anchorIndex, 0, child);
    },
    remove(child) {
      const stack = [root];

      while (stack.length > 0) {
        const node = stack.pop();
        if (!node) {
          continue;
        }

        const childIndex = node.children.indexOf(child);
        if (childIndex >= 0) {
          node.children.splice(childIndex, 1);
          return;
        }

        stack.push(...node.children);
      }
    },
    createElement(type) {
      return createHostNode(type);
    },
    createText(text) {
      return createHostNode('text', text);
    },
    createComment(text) {
      return createHostNode('comment', text);
    },
    setText(node, text) {
      node.text = text;
    },
    setElementText(node, text) {
      node.text = text;
      node.children = [];
    },
    parentNode() {
      return null;
    },
    nextSibling() {
      return null;
    },
    querySelector() {
      return null;
    },
    setScopeId() {},
    cloneNode(node) {
      return createHostNode(node.type, node.text);
    },
    insertStaticContent(content, parent, anchor) {
      const node = createHostNode('static', content);
      rendererOptions.insert(node, parent, anchor);
      return [node, node];
    },
  });
  const rendererOptions = renderer;

  renderer.createApp(App, { sessionStore }).mount(root);

  return {
    root,
  };
}

function mountAppForInteraction(sessionStore: SessionStore) {
  const { root } = mountApp(sessionStore);

  function findLabelControl(node: HostNode, labelText: string): HostNode {
    if (node.type === 'label' && getRenderedText(node).includes(labelText)) {
      return node.children.find((child) => child.type === 'input' || child.type === 'textarea') as HostNode;
    }

    for (const child of node.children) {
      try {
        return findLabelControl(child, labelText);
      } catch {
        continue;
      }
    }

    throw new Error(`Unable to find control for label: ${labelText}`);
  }

  function findButton(node: HostNode, labelText: string): HostNode {
    if (node.type === 'button' && getRenderedText(node).includes(labelText)) {
      return node;
    }

    for (const child of node.children) {
      try {
        return findButton(child, labelText);
      } catch {
        continue;
      }
    }

    throw new Error(`Unable to find button: ${labelText}`);
  }

  return {
    root,
    fillInput(rootNode: HostNode, labelText: string, value: string) {
      const control = findLabelControl(rootNode, labelText) as HostNode & {
        props?: { onInput?: (event: { target: { value: string } }) => void };
      };
      control.props?.onInput?.({ target: { value } });
    },
    async clickButton(rootNode: HostNode, labelText: string) {
      const button = findButton(rootNode, labelText) as HostNode & {
        props?: { onClick?: () => Promise<void> | void };
      };
      await button.props?.onClick?.();
      await nextTick();
    },
  };
}

describe('App', () => {
  it('renders the ready scene from sessionStore.currentSession', () => {
    const output = renderAppWithSessionStore({
      currentSession: createTestSession({
        sceneState: { mode: 'dialog', speaker: '络络', text: '放学后一起回家吧。' },
      }),
      bootstrapState: 'idle',
      bootstrapError: null,
      setupDefaults: createSetupDefaults(),
      submitPlayerProfile: () => {},
    });

    expect(output).toContain('四月十七日 - 放学后');
    expect(output).toContain('络络');
    expect(output).toContain('放学后一起回家吧。');
    expect(output).toContain('AUTO');
  });

  it('renders the empty scene without a speaker line when there is no current session', () => {
    const { root } = mountApp({
      currentSession: null,
      bootstrapState: 'idle',
      bootstrapError: null,
      setupDefaults: createSetupDefaults(),
      submitPlayerProfile: () => {},
    });

    const text = getRenderedText(root);

    expect(text).toContain('开始新的游戏');
    expect(text).toContain('姓名');
    expect(text).not.toContain('当前还没有进行中的游戏，也没有可用于自动开局的默认配置。');
  });

  it('renders a startup message while automatic new-game bootstrap is running', () => {
    const output = renderAppWithSessionStore({
      currentSession: null,
      bootstrapState: 'starting',
      bootstrapError: null,
      setupDefaults: createSetupDefaults(),
      submitPlayerProfile: () => {},
    });

    expect(output).toContain('正在进入新的游戏');
    expect(output).not.toContain('name-text');
  });

  it('renders a readable retryable error state when player profile submission fails', () => {
    const { root } = mountApp({
      currentSession: null,
      bootstrapState: 'error',
      bootstrapError: 'boom',
      setupDefaults: createSetupDefaults(),
      submitPlayerProfile: () => {},
    });

    const text = getRenderedText(root);

    expect(text).toContain('开始新的游戏');
    expect(text).toContain('提交玩家设定失败：boom');
    expect(text).toContain('开始游戏');
  });

  it('keeps a ready scene without speaker text instead of replacing it with bootstrap copy', () => {
    const output = renderAppWithSessionStore({
      currentSession: createTestSession({
        sceneState: { mode: 'dialog', speaker: null, text: '窗外的风声很轻。' },
      }),
      bootstrapState: 'starting',
      bootstrapError: null,
      setupDefaults: createSetupDefaults(),
      submitPlayerProfile: () => {},
    });

    expect(output).toContain('窗外的风声很轻。');
    expect(output).not.toContain('正在进入新的游戏');
  });

  it('re-renders after a reactive session store receives the first frame', async () => {
    const sessionStore = reactive<SessionStore>({
      currentSession: null,
      bootstrapState: 'starting',
      bootstrapError: null,
      setupDefaults: createSetupDefaults(),
      submitPlayerProfile: () => {},
    });
    const { root } = mountApp(sessionStore);

    expect(getRenderedText(root)).toContain('正在进入新的游戏');

    sessionStore.currentSession = createTestSession({
      sceneState: { mode: 'dialog', speaker: '络络', text: '第一条真实首帧' },
    });
    sessionStore.bootstrapState = 'idle';
    await nextTick();

    expect(getRenderedText(root)).toContain('第一条真实首帧');
    expect(getRenderedText(root)).not.toContain('正在进入新的游戏');
  });

  it('renders a player setup form when there is no current session and bootstrap is idle', () => {
    const { root } = mountApp({
      currentSession: null,
      bootstrapState: 'idle',
      bootstrapError: null,
      setupDefaults: createSetupDefaults({
        name: '林明霜',
        gender: '女',
        persona: '普通高中生，外冷内热。',
      }),
      submitPlayerProfile: () => {},
    });

    const text = getRenderedText(root);

    expect(text).toContain('开始新的游戏');
    expect(text).toContain('姓名');
    expect(text).toContain('性别');
    expect(text).toContain('自定义人设');
    expect(text).toContain('开始游戏');
    expect(text).not.toContain('当前还没有进行中的游戏，也没有可用于自动开局的默认配置。');
  });

  it('submits the trimmed player profile from the setup form', async () => {
    let submittedProfile: { name: string; gender: string; persona: string } | null = null;
    const sessionStore = reactive<SessionStore>({
      currentSession: null,
      bootstrapState: 'idle',
      bootstrapError: null,
      setupDefaults: createSetupDefaults(),
      submitPlayerProfile(profile) {
        submittedProfile = profile;
      },
    });
    const { root, fillInput, clickButton } = mountAppForInteraction(sessionStore);

    fillInput(root, '姓名', '  沈秋  ');
    fillInput(root, '性别', ' 非二元 ');
    fillInput(root, '自定义人设', ' 沉静，观察力强。 ');
    await clickButton(root, '开始游戏');

    expect(submittedProfile).toEqual({
      name: '沈秋',
      gender: '非二元',
      persona: '沉静，观察力强。',
    });
  });

  it('still allows retrying profile submission from the error state', async () => {
    let submittedProfile: { name: string; gender: string; persona: string } | null = null;
    const sessionStore = reactive<SessionStore>({
      currentSession: null,
      bootstrapState: 'error',
      bootstrapError: 'boom',
      setupDefaults: createSetupDefaults({ name: '林明霜' }),
      submitPlayerProfile(profile) {
        submittedProfile = profile;
      },
    });
    const { root, fillInput, clickButton } = mountAppForInteraction(sessionStore);

    fillInput(root, '姓名', '沈秋');
    await clickButton(root, '开始游戏');

    expect(submittedProfile).toEqual({
      name: '沈秋',
      gender: '',
      persona: '',
    });
  });
});
