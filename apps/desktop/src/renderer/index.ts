import { createApp } from 'vue';
import { Electroview } from 'electrobun/view';

import { bootstrapElectrobunRenderer } from './electrobun-entry';

void bootstrapElectrobunRenderer({
  Electroview,
}).then(({ App }) => {
  createApp(App).mount('#app');
});
