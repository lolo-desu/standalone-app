export default {
  app: {
    name: '日记络络',
    identifier: 'com.lologames.riji-luoluo',
    version: '0.1.0',
  },
  build: {
    bun: {
      entrypoint: 'src/main.ts',
    },
    views: {
      renderer: {
        entrypoint: 'src/renderer/index.ts',
      },
    },
    copy: {
      'src/renderer/index.html': 'views/renderer/index.html',
    },
  },
};
