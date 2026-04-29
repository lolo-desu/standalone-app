import { describe, expect, it } from 'vitest';

import { getAppPaths } from './paths';

describe('getAppPaths', () => {
  it('separates saves from config secrets', () => {
    const paths = getAppPaths('/tmp/lologames-home');

    expect(paths.savesDir.endsWith('/saves')).toBe(true);
    expect(paths.credentialsFile.endsWith('/credentials.json')).toBe(true);
    expect(paths.savesDir).not.toBe(paths.credentialsFile);
  });
});
