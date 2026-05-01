import type { Session } from '@lologames/shared';

import { createGameSceneViewModel } from './game-scene-view-model';

export type SessionStore = {
  currentSession: Session | null;
};

type AppInstance = {
  sessionStore: SessionStore;
};

const App = {
  name: 'App',
  props: {
    sessionStore: {
      type: Object,
      required: true,
    },
  },
  computed: {
    scene(this: AppInstance) {
      return createGameSceneViewModel(this.sessionStore.currentSession);
    },
  },
  template: `
    <main>
      <div class="prototype-container">
        <div class="background-image"></div>
        <div class="character-portrait"></div>

        <div class="vertical-date">
          <div class="text">{{ scene.dateLabel }}</div>
        </div>

        <div class="bottom-area">
          <div v-if="scene.speaker" class="name-text">{{ scene.speaker }}</div>
          <div class="text-content">{{ scene.text }}</div>

          <div class="bottom-widgets">
            <div class="widget">⏵ AUTO</div>
            <div class="widget">⏭ SKIP</div>
            <div class="widget">📜 LOG</div>
            <div class="widget">⚙ MENU</div>
          </div>
        </div>
      </div>
    </main>
  `,
};

export default App;
