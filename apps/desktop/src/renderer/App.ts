import type { Session } from '@lologames/shared';
import { defineComponent, h, reactive, type PropType } from 'vue';

import { createGameSceneViewModel } from './game-scene-view-model';
import './app.css';

export type SessionStore = {
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

const PlayerSetupForm = defineComponent({
  name: 'PlayerSetupForm',
  props: {
    defaults: {
      type: Object as PropType<SessionStore['setupDefaults']>,
      required: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    onSubmit: {
      type: Function as PropType<SessionStore['submitPlayerProfile']>,
      required: true,
    },
  },
  setup(props) {
    const draft = reactive({
      name: props.defaults.name,
      gender: props.defaults.gender,
      persona: props.defaults.persona,
    });

    async function submit() {
      if (!draft.name.trim()) {
        return;
      }

      await props.onSubmit({
        name: draft.name.trim(),
        gender: draft.gender.trim(),
        persona: draft.persona.trim(),
      });
    }

    return () =>
      h('main', { class: 'app-shell' }, [
        h('div', { class: 'prototype-container' }, [
          h('div', { class: 'background-image' }),
          h('div', { class: 'character-portrait' }),
          h('div', { class: 'vertical-date' }, [h('div', { class: 'text' }, '四月十七日 - 放学后')]),
          h('div', { class: 'bottom-area' }, [
            h('div', { class: 'text-content' }, '开始新的游戏'),
            ...(props.errorMessage ? [h('div', { class: 'text-content' }, `提交玩家设定失败：${props.errorMessage}`)] : []),
            h('label', [
              '姓名',
              h('input', {
                value: draft.name,
                onInput: (event: Event) => {
                  draft.name = (event.target as HTMLInputElement).value;
                },
              }),
            ]),
            h('label', [
              '性别',
              h('input', {
                value: draft.gender,
                onInput: (event: Event) => {
                  draft.gender = (event.target as HTMLInputElement).value;
                },
              }),
            ]),
            h('label', [
              '自定义人设',
              h('textarea', {
                value: draft.persona,
                onInput: (event: Event) => {
                  draft.persona = (event.target as HTMLTextAreaElement).value;
                },
              }),
            ]),
            h(
              'button',
              {
                type: 'button',
                disabled: !draft.name.trim(),
                onClick: submit,
              },
              '开始游戏',
            ),
          ]),
        ]),
      ]);
  },
});

export default defineComponent({
  name: 'App',
  props: {
    sessionStore: {
      type: Object,
      required: true,
    },
  },
  render() {
    const sessionStore = this.sessionStore as SessionStore;
    const scene = createGameSceneViewModel(sessionStore.currentSession);
    const isEmptyScene = scene.state === 'empty';

    if (isEmptyScene && sessionStore.bootstrapState !== 'starting') {
      return h(PlayerSetupForm, {
        defaults: sessionStore.setupDefaults,
        errorMessage: sessionStore.bootstrapState === 'error' ? (sessionStore.bootstrapError ?? '未知错误') : null,
        onSubmit: sessionStore.submitPlayerProfile,
      });
    }

    let text = scene.text;

    if (isEmptyScene && sessionStore.bootstrapState === 'starting') {
      text = '正在进入新的游戏...';
    }

    return h('main', { class: 'app-shell' }, [
      h('div', { class: 'prototype-container' }, [
        h('div', { class: 'background-image' }),
        h('div', { class: 'character-portrait' }),
        h('div', { class: 'vertical-date' }, [
          h('div', { class: 'text' }, scene.dateLabel),
        ]),
        h('div', { class: 'bottom-area' }, [
          ...(scene.speaker ? [h('div', { class: 'name-text' }, scene.speaker)] : []),
          h('div', { class: 'text-content' }, text),
          h('div', { class: 'bottom-widgets' }, [
            h('div', { class: 'widget' }, 'AUTO'),
            h('div', { class: 'widget' }, 'SKIP'),
            h('div', { class: 'widget' }, 'LOG'),
            h('div', { class: 'widget' }, 'MENU'),
          ]),
        ]),
      ]),
    ]);
  },
});
