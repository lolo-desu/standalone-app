import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'shared',
      include: ['packages/shared/src/**/*.test.ts'],
    },
  },
]);
