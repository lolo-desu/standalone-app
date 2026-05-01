import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

describe('desktop package manifest', () => {
  it('declares vue for the live renderer bundle', () => {
    const packageJsonPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.vue).toBeTypeOf('string');
  });
});
