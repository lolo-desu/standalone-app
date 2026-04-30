import { describe, expect, it, vi } from 'vitest';

import { createEngineEnvironment, createEngineBaseUrl, getRuntimeHomeDir, launchEngineServer } from './runtime';

describe('desktop runtime helpers', () => {
  it('prefers HOME when resolving the app runtime directory', () => {
    expect(
      getRuntimeHomeDir({
        HOME: '/tmp/home-dir',
        USERPROFILE: '/tmp/profile-dir',
      }),
    ).toBe('/tmp/home-dir');
  });

  it('falls back to USERPROFILE when HOME is unavailable', () => {
    expect(
      getRuntimeHomeDir({
        USERPROFILE: '/tmp/profile-dir',
      }),
    ).toBe('/tmp/profile-dir');
  });

  it('ignores an empty HOME value and falls back to USERPROFILE', () => {
    expect(
      getRuntimeHomeDir({
        HOME: '',
        USERPROFILE: '/tmp/profile-dir',
      }),
    ).toBe('/tmp/profile-dir');
  });

  it('injects the desktop savesDir into the engine environment', () => {
    expect(
      createEngineEnvironment(
        {
          savesDir: '/tmp/riji-luoluo/saves',
        },
        {
          NODE_ENV: 'test',
        },
      ),
    ).toMatchObject({
      NODE_ENV: 'test',
      RIJI_LUOLUO_SAVES_DIR: '/tmp/riji-luoluo/saves',
    });
  });

  it('formats an http base url for the launched engine server', () => {
    expect(
      createEngineBaseUrl({
        port: 43111,
      }),
    ).toBe('http://127.0.0.1:43111');
  });

  it('launches the engine request handler through the configured server factory', async () => {
    const serve = vi.fn().mockReturnValue({
      port: 43111,
      stop: vi.fn(),
    });

    const runtime = await launchEngineServer({
      env: {
        NODE_ENV: 'test',
      },
      paths: {
        savesDir: '/tmp/riji-luoluo/saves',
      },
      serve,
    });

    expect(serve).toHaveBeenCalledWith({
      fetch: expect.any(Function),
      hostname: '127.0.0.1',
      port: 0,
    });
    expect(runtime.baseUrl).toBe('http://127.0.0.1:43111');
  });
});
