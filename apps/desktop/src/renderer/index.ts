import { createApp } from 'vue';
import { Electroview } from 'electrobun/view';

import { bootstrapElectrobunRenderer } from './electrobun-entry';

function renderStartupError(error: unknown) {
  const appRoot = document.querySelector('#app');
  if (!(appRoot instanceof HTMLElement)) {
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  appRoot.innerHTML = `<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0;background:#120f17;color:#f6eef7;font-family:system-ui,sans-serif;padding:24px;box-sizing:border-box;"><section style="max-width:720px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px;box-shadow:0 16px 48px rgba(0,0,0,0.28);"><h1 style="margin:0 0 12px;font-size:24px;">渲染器启动失败</h1><p style="margin:0 0 12px;line-height:1.7;">桌面应用已启动，但前端在初始化时发生错误。</p><pre style="margin:0;white-space:pre-wrap;word-break:break-word;line-height:1.6;">${escapeHtml(message)}</pre></section></main>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

void bootstrapElectrobunRenderer({
  Electroview,
})
  .then(({ App, sessionStore }) => {
    createApp(App, { sessionStore }).mount('#app');
  })
  .catch((error) => {
    console.error('Renderer bootstrap failed', error);
    renderStartupError(error);
  });
