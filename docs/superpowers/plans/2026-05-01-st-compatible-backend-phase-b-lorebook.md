# ST-Compatible Backend Phase B Lorebook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a SillyTavern-compatible lorebook runtime slice that normalizes ST lorebook assets, matches entries against session-derived text, and injects matched world info into chat and instruct prompt assembly.

**Architecture:** Keep the existing `apps/engine/src/prompt-runtime` core intact and add a focused lorebook asset plus matcher beside it. Extend `buildPromptRuntimeContext()` to populate `wiBefore` and `wiAfter`, then let `assembly.ts` consume those sections without learning lorebook rules itself.

**Tech Stack:** TypeScript, Zod, Vitest

---

## File Structure

- Create: `apps/engine/src/prompt-runtime/lorebook.ts`
  - Zod-backed normalization and export helpers for ST-style lorebook JSON.
- Create: `apps/engine/src/prompt-runtime/lorebook.test.ts`
  - Locks lorebook normalize/export behavior.
- Create: `apps/engine/src/prompt-runtime/lorebook-match.ts`
  - Builds searchable text sources and returns matched lorebook entries.
- Create: `apps/engine/src/prompt-runtime/lorebook-match.test.ts`
  - Locks matching semantics, scan depth, dedupe, and ordering.
- Modify: `apps/engine/src/prompt-runtime/types.ts`
  - Add lorebook asset and match result types.
- Modify: `apps/engine/src/prompt-runtime/context.ts`
  - Accept an optional lorebook asset and populate `sections.wiBefore` / `sections.wiAfter`.
- Modify: `apps/engine/src/prompt-runtime/context.test.ts`
  - Verify lorebook sections are populated from matches.
- Modify: `apps/engine/src/prompt-runtime/assembly.ts`
  - Include world info sections in the story-string render data.
- Modify: `apps/engine/src/prompt-runtime/assembly.test.ts`
  - Verify matched lorebook text appears in chat and instruct outputs.
- Modify: `apps/engine/src/prompt-runtime/index.ts`
  - Re-export lorebook helpers.

### Task 1: Add normalized lorebook asset support

**Files:**
- Create: `apps/engine/src/prompt-runtime/lorebook.ts`
- Create: `apps/engine/src/prompt-runtime/lorebook.test.ts`
- Modify: `apps/engine/src/prompt-runtime/types.ts`

- [ ] **Step 1: Write the failing lorebook asset tests**

Create `apps/engine/src/prompt-runtime/lorebook.test.ts` with:

```ts
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
});
```

- [ ] **Step 2: Run the lorebook asset test to verify it fails**

Run: `npx vitest run apps/engine/src/prompt-runtime/lorebook.test.ts`

Expected: FAIL because `lorebook.ts` does not exist yet.

- [ ] **Step 3: Add lorebook types to `types.ts`**

Update `apps/engine/src/prompt-runtime/types.ts` to add:

```ts
export type LorebookInsertionPosition = 'before_history' | 'after_history';

export type LorebookEntry = {
  id: string;
  text: string;
  enabled: boolean;
  keywords: string[];
  secondaryKeywords: string[];
  matchMode: 'any' | 'all';
  scanDepth: number | null;
  insertionPosition: LorebookInsertionPosition;
  order: number;
  comment: string;
  rawSource?: unknown;
};

export type LorebookAsset = {
  kind: 'lorebook';
  name: string;
  entries: LorebookEntry[];
  rawSource?: unknown;
};
```

- [ ] **Step 4: Implement lorebook normalize/export**

Create `apps/engine/src/prompt-runtime/lorebook.ts` with:

```ts
import { z } from 'zod';

import type { LorebookAsset, LorebookEntry } from './types';

const LorebookEntrySchema = z
  .object({
    uid: z.union([z.string(), z.number()]).optional(),
    key: z.array(z.string()).default([]),
    keysecondary: z.array(z.string()).default([]),
    selective: z.boolean().optional(),
    order: z.number().int().default(100),
    position: z.number().int().default(0),
    disable: z.boolean().default(false),
    content: z.string().default(''),
    comment: z.string().default(''),
    extensions: z
      .object({
        scan_depth: z.number().int().positive().optional(),
      })
      .partial()
      .default({}),
  })
  .passthrough();

const LorebookSchema = z
  .object({
    name: z.string().default('Lorebook'),
    entries: z.record(z.string(), LorebookEntrySchema).default({}),
  })
  .passthrough();

function toInsertionPosition(value: number): LorebookEntry['insertionPosition'] {
  return value === 1 ? 'after_history' : 'before_history';
}

export function normalizeLorebook(input: unknown): LorebookAsset {
  const parsed = LorebookSchema.parse(input);
  const entries = Object.entries(parsed.entries).map(([fallbackId, entry]) => ({
    id: String(entry.uid ?? fallbackId),
    text: entry.content,
    enabled: !entry.disable,
    keywords: entry.key,
    secondaryKeywords: entry.keysecondary,
    matchMode: entry.selective ? 'all' : 'any',
    scanDepth: entry.extensions.scan_depth ?? null,
    insertionPosition: toInsertionPosition(entry.position),
    order: entry.order,
    comment: entry.comment,
    rawSource: entry,
  }));

  return {
    kind: 'lorebook',
    name: parsed.name,
    entries,
    rawSource: parsed,
  };
}

export function exportLorebook(lorebook: LorebookAsset): Record<string, unknown> {
  return {
    name: lorebook.name,
    entries: Object.fromEntries(
      lorebook.entries.map((entry) => [
        entry.id,
        {
          uid: entry.id,
          key: entry.keywords,
          keysecondary: entry.secondaryKeywords,
          selective: entry.matchMode === 'all',
          order: entry.order,
          position: entry.insertionPosition === 'after_history' ? 1 : 0,
          disable: !entry.enabled,
          content: entry.text,
          comment: entry.comment,
          extensions: entry.scanDepth === null ? {} : { scan_depth: entry.scanDepth },
        },
      ]),
    ),
  };
}
```

- [ ] **Step 5: Run the lorebook asset test to verify it passes**

Run: `npx vitest run apps/engine/src/prompt-runtime/lorebook.test.ts`

Expected: PASS with `2 passed`.

### Task 2: Add lorebook matching against runtime text sources

**Files:**
- Create: `apps/engine/src/prompt-runtime/lorebook-match.ts`
- Create: `apps/engine/src/prompt-runtime/lorebook-match.test.ts`

- [ ] **Step 1: Write the failing matcher tests**

Create `apps/engine/src/prompt-runtime/lorebook-match.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { matchLorebookEntries } from './lorebook-match';
import type { LorebookAsset, PromptRuntimeContext } from './types';

const context = {
  playerName: '阿遥',
  characterName: '络络',
  statData: {
    玩家: {
      姓名: '阿遥',
      地点: '学校',
    },
  },
  sections: {
    system: '',
    description: '',
    personality: '',
    scenario: '现在是夜晚，地点在学校。',
    persona: '',
    wiBefore: '',
    wiAfter: '',
    anchorBefore: '',
    anchorAfter: '',
  },
  chatHistory: [
    { role: 'user', content: '我们回学校吧。' },
    { role: 'assistant', content: '夜晚的教学楼很安静。' },
  ],
} as PromptRuntimeContext;

const lorebook: LorebookAsset = {
  kind: 'lorebook',
  name: 'Diary Lorebook',
  entries: [
    {
      id: 'school-night',
      text: '夜晚时分，学校会变得格外安静。',
      enabled: true,
      keywords: ['学校', '夜晚'],
      secondaryKeywords: [],
      matchMode: 'all',
      scanDepth: 2,
      insertionPosition: 'before_history',
      order: 10,
      comment: '',
    },
    {
      id: 'luoluo',
      text: '络络会刻意回避空荡的走廊。',
      enabled: true,
      keywords: ['络络'],
      secondaryKeywords: [],
      matchMode: 'any',
      scanDepth: null,
      insertionPosition: 'after_history',
      order: 20,
      comment: '',
    },
  ],
};

describe('matchLorebookEntries', () => {
  it('matches entries from runtime text sources and returns them in stable order', () => {
    expect(matchLorebookEntries(context, lorebook).map((entry) => entry.id)).toEqual(['school-night', 'luoluo']);
  });

  it('dedupes repeated hits and respects scanDepth when reading history', () => {
    const matched = matchLorebookEntries(context, {
      ...lorebook,
      entries: [
        {
          id: 'classroom',
          text: '教室已经熄灯。',
          enabled: true,
          keywords: ['教室'],
          secondaryKeywords: [],
          matchMode: 'any',
          scanDepth: 1,
          insertionPosition: 'before_history',
          order: 5,
          comment: '',
        },
      ],
    });

    expect(matched).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the matcher tests to verify they fail**

Run: `npx vitest run apps/engine/src/prompt-runtime/lorebook-match.test.ts`

Expected: FAIL because matcher does not exist yet.

- [ ] **Step 3: Implement the matcher**

Create `apps/engine/src/prompt-runtime/lorebook-match.ts` with:

```ts
import type { LorebookAsset, LorebookEntry, PromptRuntimeContext } from './types';

function flattenValue(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenValue(item));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap((item) => flattenValue(item));
  }

  return [];
}

function includesAllTerms(haystack: string, terms: string[]): boolean {
  return terms.every((term) => haystack.includes(term));
}

function includesAnyTerm(haystack: string, terms: string[]): boolean {
  return terms.some((term) => haystack.includes(term));
}

function buildSearchText(context: PromptRuntimeContext, scanDepth: number | null): string {
  const history = scanDepth === null ? context.chatHistory : context.chatHistory.slice(-scanDepth);
  const parts = [
    ...history.map((message) => message.content),
    context.playerName,
    context.characterName,
    ...Object.values(context.sections),
    ...flattenValue(context.statData),
    context.session.sceneState.text,
  ];

  return parts.filter((value) => value.length > 0).join('\n');
}

function matchesEntry(context: PromptRuntimeContext, entry: LorebookEntry): boolean {
  if (!entry.enabled || entry.keywords.length === 0) {
    return false;
  }

  const haystack = buildSearchText(context, entry.scanDepth);
  const primaryMatched = entry.matchMode === 'all'
    ? includesAllTerms(haystack, entry.keywords)
    : includesAnyTerm(haystack, entry.keywords);

  if (!primaryMatched) {
    return false;
  }

  return entry.secondaryKeywords.length === 0 || includesAnyTerm(haystack, entry.secondaryKeywords);
}

export function matchLorebookEntries(
  context: PromptRuntimeContext,
  lorebook: LorebookAsset | null | undefined,
): LorebookEntry[] {
  if (!lorebook) {
    return [];
  }

  const matched = lorebook.entries.filter((entry) => matchesEntry(context, entry));
  const deduped = new Map<string, LorebookEntry>();

  for (const entry of matched) {
    if (!deduped.has(entry.id)) {
      deduped.set(entry.id, entry);
    }
  }

  return [...deduped.values()].sort((left, right) => left.order - right.order);
}
```

- [ ] **Step 4: Run the matcher tests to verify they pass**

Run: `npx vitest run apps/engine/src/prompt-runtime/lorebook-match.test.ts`

Expected: PASS with `2 passed`.

### Task 3: Populate world info sections from lorebook matches

**Files:**
- Modify: `apps/engine/src/prompt-runtime/context.ts`
- Modify: `apps/engine/src/prompt-runtime/context.test.ts`

- [ ] **Step 1: Write the failing context test**

Add to `apps/engine/src/prompt-runtime/context.test.ts`:

```ts
it('populates wiBefore and wiAfter from matched lorebook entries', () => {
  const context = buildPromptRuntimeContext(session, {
    lorebook: {
      kind: 'lorebook',
      name: 'Diary Lorebook',
      entries: [
        {
          id: 'school',
          text: '学校在夜晚会显得更空旷。',
          enabled: true,
          keywords: ['学校'],
          secondaryKeywords: [],
          matchMode: 'any',
          scanDepth: null,
          insertionPosition: 'before_history',
          order: 1,
          comment: '',
        },
        {
          id: 'luoluo',
          text: '络络会放轻脚步。',
          enabled: true,
          keywords: ['络络'],
          secondaryKeywords: [],
          matchMode: 'any',
          scanDepth: null,
          insertionPosition: 'after_history',
          order: 2,
          comment: '',
        },
      ],
    },
  });

  expect(context.sections.wiBefore).toBe('学校在夜晚会显得更空旷。');
  expect(context.sections.wiAfter).toBe('络络会放轻脚步。');
});
```

- [ ] **Step 2: Run the context test to verify it fails**

Run: `npx vitest run apps/engine/src/prompt-runtime/context.test.ts`

Expected: FAIL because `buildPromptRuntimeContext()` does not accept lorebook yet.

- [ ] **Step 3: Implement lorebook integration in context**

Update `apps/engine/src/prompt-runtime/context.ts` to:

```ts
import { matchLorebookEntries } from './lorebook-match';
import type { ContextPreset, InstructPreset, LorebookAsset, PromptMessage, PromptRuntimeContext, PromptSections } from './types';

type BuildPromptRuntimeContextOptions = {
  contextPreset?: ContextPreset;
  instructPreset?: InstructPreset | null;
  lorebook?: LorebookAsset | null;
};

function joinLorebookEntries(texts: string[]): string {
  return texts.filter((text) => text.length > 0).join('\n\n');
}

// inside buildPromptRuntimeContext()
const baseContext = {
  session,
  contextPreset: options.contextPreset ?? DEFAULT_CONTEXT_PRESET,
  instructPreset: options.instructPreset ?? null,
  statData,
  playerName,
  characterName,
  sections: {
    ...DEFAULT_SECTIONS,
    persona: buildPersonaSection(statData),
  },
  chatHistory: session.logState.entries.map((entry) => toChatMessage(entry, playerName)),
} satisfies PromptRuntimeContext;

const matchedLorebookEntries = matchLorebookEntries(baseContext, options.lorebook);

return {
  ...baseContext,
  sections: {
    ...baseContext.sections,
    wiBefore: joinLorebookEntries(
      matchedLorebookEntries
        .filter((entry) => entry.insertionPosition === 'before_history')
        .map((entry) => entry.text),
    ),
    wiAfter: joinLorebookEntries(
      matchedLorebookEntries
        .filter((entry) => entry.insertionPosition === 'after_history')
        .map((entry) => entry.text),
    ),
  },
};
```

- [ ] **Step 4: Run the context test to verify it passes**

Run: `npx vitest run apps/engine/src/prompt-runtime/context.test.ts`

Expected: PASS with the new lorebook assertion green.

### Task 4: Inject world info into assembled chat and instruct prompts

**Files:**
- Modify: `apps/engine/src/prompt-runtime/assembly.ts`
- Modify: `apps/engine/src/prompt-runtime/assembly.test.ts`
- Modify: `apps/engine/src/prompt-runtime/index.ts`

- [ ] **Step 1: Write the failing assembly tests**

Add to `apps/engine/src/prompt-runtime/assembly.test.ts`:

```ts
it('renders wiBefore and wiAfter into chat-mode system text', () => {
  const prompt = assemblePrompt({
    ...baseContext,
    sections: {
      ...baseContext.sections,
      wiBefore: '世界书前置信息',
      wiAfter: '世界书后置信息',
    },
    contextPreset: {
      ...baseContext.contextPreset,
      storyString: '{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{trim}}',
    },
  });

  expect(prompt.systemText).toBe('世界书前置信息\n世界书后置信息');
});

it('renders world info sections into instruct prompts', () => {
  const prompt = assemblePrompt({
    ...baseContext,
    instructPreset: {
      kind: 'instruct',
      name: 'Alpaca',
      inputSequence: '### Instruction:',
      outputSequence: '### Response:',
      lastOutputSequence: '',
      systemSequence: '### System:',
      stopSequence: '',
      wrap: true,
      macro: true,
      namesBehavior: 'force',
      activationRegex: '',
      firstOutputSequence: '',
      skipExamples: false,
      outputSuffix: '\n',
      inputSuffix: '\n',
      systemSuffix: '\n',
      userAlignmentMessage: '',
      systemSameAsUser: false,
      lastSystemSequence: '',
      firstInputSequence: '',
      lastInputSequence: '',
      sequencesAsStopStrings: true,
      storyStringPrefix: '',
      storyStringSuffix: '\n',
    },
    sections: {
      ...baseContext.sections,
      wiBefore: '学校规则',
      wiAfter: '',
    },
    contextPreset: {
      ...baseContext.contextPreset,
      storyString: '{{wiBefore}}{{trim}}',
    },
  });

  expect(prompt.promptText).toContain('学校规则');
});
```

- [ ] **Step 2: Run the assembly tests to verify they fail**

Run: `npx vitest run apps/engine/src/prompt-runtime/assembly.test.ts`

Expected: FAIL because story render data does not yet expose world info sections end-to-end.

- [ ] **Step 3: Implement the minimal assembly/export changes**

Update `apps/engine/src/prompt-runtime/assembly.ts` so `buildStoryRenderData()` continues to spread `context.sections` and does not drop `wiBefore` / `wiAfter`. If the helper already spreads the whole `sections` object, keep the implementation and only adjust tests if the failure came from missing context population.

Update `apps/engine/src/prompt-runtime/index.ts` to export:

```ts
export * from './lorebook';
export * from './lorebook-match';
```

- [ ] **Step 4: Run the focused prompt-runtime tests**

Run: `npx vitest run apps/engine/src/prompt-runtime/lorebook.test.ts apps/engine/src/prompt-runtime/lorebook-match.test.ts apps/engine/src/prompt-runtime/context.test.ts apps/engine/src/prompt-runtime/assembly.test.ts`

Expected: PASS with all new lorebook tests green.

### Task 5: Full verification

**Files:**
- No file changes expected

- [ ] **Step 1: Run the full repository test suite**

Run: `npm test`

Expected: PASS with all test files green and `typecheck:test-contracts` passing.

- [ ] **Step 2: Inspect git status**

Run: `git status --short`

Expected: only the planned prompt-runtime files and docs are modified or added.

## Self-Review Checklist

- Spec coverage: normalize/export, matching, context injection, and assembly verification all have explicit tasks.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: `LorebookAsset`, `LorebookEntry`, `matchLorebookEntries`, and `lorebook` option names are used consistently across tasks.
