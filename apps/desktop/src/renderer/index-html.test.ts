import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rendererDir = dirname(fileURLToPath(import.meta.url));

describe('renderer html shell', () => {
  it('loads the emitted renderer stylesheet', () => {
    const html = readFileSync(resolve(rendererDir, 'index.html'), 'utf8');

    expect(html).toContain('<link rel="stylesheet" href="./index.css" />');
  });
});
