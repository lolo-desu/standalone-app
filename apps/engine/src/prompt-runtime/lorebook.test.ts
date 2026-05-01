import { describe, expect, it } from 'vitest';

import { exportLorebook, normalizeLorebook } from './lorebook';

describe('normalizeLorebook', () => {
  it('normalizes a ST-style lorebook entry into the internal asset shape', () => {
    const lorebook = normalizeLorebook({
      name: 'Diary Lorebook',
      entries: {
        hero: {
          uid: 7,
          key: ['学校', '教室'],
          keysecondary: ['络络'],
          selective: true,
          order: 20,
          position: 0,
          disable: false,
          content: '学校是故事主要舞台。',
          comment: 'School',
          extensions: {
            scan_depth: 3,
          },
        },
      },
    });

    expect(lorebook).toEqual({
      kind: 'lorebook',
      name: 'Diary Lorebook',
      entries: [
        {
          id: '7',
          text: '学校是故事主要舞台。',
          enabled: true,
          keywords: ['学校', '教室'],
          secondaryKeywords: ['络络'],
          matchMode: 'all',
          scanDepth: 3,
          insertionPosition: 'before_history',
          order: 20,
          comment: 'School',
          rawSource: expect.any(Object),
        },
      ],
      rawSource: expect.any(Object),
    });
  });

  it('exports the normalized lorebook back into a ST-style object', () => {
    expect(
      exportLorebook({
        kind: 'lorebook',
        name: 'Diary Lorebook',
        entries: [
          {
            id: 'entry-1',
            text: '夜晚时分络络会避开教学楼。',
            enabled: true,
            keywords: ['夜晚'],
            secondaryKeywords: [],
            matchMode: 'any',
            scanDepth: null,
            insertionPosition: 'after_history',
            order: 5,
            comment: 'Night rule',
          },
        ],
      }),
    ).toEqual({
      name: 'Diary Lorebook',
      entries: {
        'entry-1': {
          uid: 'entry-1',
          key: ['夜晚'],
          keysecondary: [],
          selective: false,
          order: 5,
          position: 1,
          disable: false,
          content: '夜晚时分络络会避开教学楼。',
          comment: 'Night rule',
          extensions: {},
        },
      },
    });
  });

  it('drops blank keywords during normalization', () => {
    expect(
      normalizeLorebook({
        name: 'Diary Lorebook',
        entries: {
          hero: {
            key: ['学校', '', '   '],
            keysecondary: ['', '络络'],
            content: '学校是故事主要舞台。',
          },
        },
      }).entries[0],
    ).toMatchObject({
      keywords: ['学校'],
      secondaryKeywords: ['络络'],
    });
  });
});
