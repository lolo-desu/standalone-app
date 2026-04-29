import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('first-message', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('node:fs');
  });

  it('does not read lolocard content when the package entry is imported', async () => {
    const readFileSync = vi.fn(() => {
      throw new Error('content should not be read during module import');
    });

    vi.doMock('node:fs', () => ({ readFileSync }));

    await expect(import('./index')).resolves.toBeDefined();
    expect(readFileSync).not.toHaveBeenCalled();
  });

  it('parses the first luoluo dialog even if other item fields appear before speech', async () => {
    const readFileSync = vi.fn(
      () => '<galgame>\n```yaml\n- speaker: 旁白\n  speech: 忽略我\n- speaker: 络络\n  background: 教室/白天.jpg\n  tachie: 水手服/稍微脸红.png\n  speech: 打……打扰了。\n- speaker: 络络\n  speech: 第二句\n```\n</galgame>'
    );

    vi.doMock('node:fs', () => ({ readFileSync }));

    const { getFirstMessage } = await import('./first-message');

    expect(getFirstMessage()).toEqual({
      speaker: '络络',
      text: '打……打扰了。',
    });
  });

  it('loads the first real luoluo dialog from the galgame opening script', async () => {
    const { getFirstMessage } = await import('./first-message');
    const msg = getFirstMessage();

    expect(msg).toBeDefined();
    expect(msg.speaker).toBe('络络');
    expect(msg.text).toBe('打……打扰了。那个，可以找一下……<user>同学吗？');
  });
});
