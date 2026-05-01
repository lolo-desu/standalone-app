# ST-Compatible Backend Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working ST-compatible engine runtime slice by normalizing SillyTavern-style context/instruct presets, rendering a minimal ST story-string subset, assembling chat/instruct prompts from session state, and normalizing those results into provider request payloads.

**Architecture:** Keep the existing `apps/engine` session/save shell intact and add a new `prompt-runtime` module tree beside it. Phase A stops before character cards, lorebooks, and generation execution; it only produces normalized assets, runtime context, assembled prompts, and provider request payloads that can later be consumed by an orchestrator.

**Tech Stack:** TypeScript, Zod, Vitest

---

## Scope

This plan covers only **Phase A** from `docs/superpowers/specs/2026-04-30-st-compatible-backend-design.md`.

It intentionally does **not** implement:

- character card compatibility
- lorebook/world info matching and injection
- generation preset compatibility assets
- provider HTTP execution
- orchestrator integration into `/session/action`

Those should be implemented in follow-up plans after this runtime core is green.

## File Structure

- Create: `apps/engine/src/prompt-runtime/types.ts`
  - Shared normalized runtime types for context presets, instruct presets, runtime context, assembled prompts, and normalized provider requests.
- Create: `apps/engine/src/prompt-runtime/context-preset.ts`
  - Zod-backed normalization for SillyTavern-style context preset JSON.
- Create: `apps/engine/src/prompt-runtime/context-preset.test.ts`
  - Locks context preset import/export behavior against real ST-style fields such as `story_string`, `story_string_depth`, and `story_string_role`.
- Create: `apps/engine/src/prompt-runtime/instruct-preset.ts`
  - Zod-backed normalization for SillyTavern-style instruct preset JSON.
- Create: `apps/engine/src/prompt-runtime/instruct-preset.test.ts`
  - Locks instruct preset normalization for fields such as `input_sequence`, `output_sequence`, and `story_string_suffix`.
- Create: `apps/engine/src/prompt-runtime/context.ts`
  - Builds a `PromptRuntimeContext` from `Session`, normalized presets, session variables, and section overrides.
- Create: `apps/engine/src/prompt-runtime/context.test.ts`
  - Verifies chat history extraction and alias data derived from `session.variableState.stat_data`.
- Create: `apps/engine/src/prompt-runtime/story-string.ts`
  - Renders the supported ST story-string subset: `{{key}}`, `{{#if key}}...{{/if}}`, and trailing `{{trim}}`.
- Create: `apps/engine/src/prompt-runtime/story-string.test.ts`
  - Verifies conditional expansion, missing-key behavior, and trim handling.
- Create: `apps/engine/src/prompt-runtime/assembly.ts`
  - Assembles chat-mode messages and instruct-mode prompt strings from runtime context.
- Create: `apps/engine/src/prompt-runtime/assembly.test.ts`
  - Verifies history depth clipping, chat-mode system placement, and instruct-mode sequence formatting.
- Create: `apps/engine/src/prompt-runtime/provider-request.ts`
  - Converts assembled prompts into normalized OpenAI/OpenAI-compatible request payloads.
- Create: `apps/engine/src/prompt-runtime/provider-request.test.ts`
  - Verifies endpoint and payload selection for chat vs instruct outputs.
- Create: `apps/engine/src/prompt-runtime/index.ts`
  - Re-export public runtime helpers for future orchestrator integration.

### Task 1: Add Normalized ST Context And Instruct Presets

**Files:**
- Create: `apps/engine/src/prompt-runtime/types.ts`
- Create: `apps/engine/src/prompt-runtime/context-preset.ts`
- Create: `apps/engine/src/prompt-runtime/context-preset.test.ts`
- Create: `apps/engine/src/prompt-runtime/instruct-preset.ts`
- Create: `apps/engine/src/prompt-runtime/instruct-preset.test.ts`

- [ ] **Step 1: Write the failing preset normalization tests**

Create `apps/engine/src/prompt-runtime/context-preset.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { exportContextPreset, normalizeContextPreset } from './context-preset';

describe('normalizeContextPreset', () => {
  it('normalizes a ST-style context preset into the internal context asset shape', () => {
    const preset = normalizeContextPreset({
      name: 'Default',
      story_string: '{{#if system}}{{system}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}',
      example_separator: '***',
      chat_start: '***',
      use_stop_strings: false,
      names_as_stop_strings: true,
      story_string_position: 0,
      story_string_depth: 1,
      story_string_role: 0,
      always_force_name2: true,
      trim_sentences: false,
      single_line: false,
    });

    expect(preset).toEqual({
      kind: 'context',
      name: 'Default',
      storyString: '{{#if system}}{{system}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}',
      exampleSeparator: '***',
      chatStart: '***',
      useStopStrings: false,
      namesAsStopStrings: true,
      storyStringPosition: 'before_history',
      storyStringDepth: 1,
      storyStringRole: 'system',
      alwaysForceCharacterName: true,
      trimSentences: false,
      singleLine: false,
      rawSource: expect.any(Object),
    });
  });

  it('exports the normalized context preset back into a ST-style JSON object', () => {
    const exported = exportContextPreset({
      kind: 'context',
      name: 'Default',
      storyString: '{{#if system}}{{system}}\n{{/if}}{{trim}}',
      exampleSeparator: '***',
      chatStart: '***',
      useStopStrings: false,
      namesAsStopStrings: true,
      storyStringPosition: 'after_history',
      storyStringDepth: 2,
      storyStringRole: 'user',
      alwaysForceCharacterName: false,
      trimSentences: false,
      singleLine: false,
    });

    expect(exported).toEqual({
      name: 'Default',
      story_string: '{{#if system}}{{system}}\n{{/if}}{{trim}}',
      example_separator: '***',
      chat_start: '***',
      use_stop_strings: false,
      names_as_stop_strings: true,
      story_string_position: 1,
      story_string_depth: 2,
      story_string_role: 1,
      always_force_name2: false,
      trim_sentences: false,
      single_line: false,
    });
  });
});
```

Create `apps/engine/src/prompt-runtime/instruct-preset.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { normalizeInstructPreset } from './instruct-preset';

describe('normalizeInstructPreset', () => {
  it('normalizes a ST-style instruct preset into the internal instruct asset shape', () => {
    const preset = normalizeInstructPreset({
      name: 'Alpaca',
      input_sequence: '### Instruction:',
      output_sequence: '### Response:',
      last_output_sequence: '',
      system_sequence: '### Input:',
      stop_sequence: '',
      wrap: true,
      macro: true,
      names_behavior: 'force',
      activation_regex: '',
      first_output_sequence: '',
      skip_examples: false,
      output_suffix: '\n\n',
      input_suffix: '\n\n',
      system_suffix: '\n\n',
      user_alignment_message: '',
      system_same_as_user: false,
      last_system_sequence: '',
      first_input_sequence: '',
      last_input_sequence: '',
      sequences_as_stop_strings: true,
      story_string_prefix: '',
      story_string_suffix: '\n\n',
    });

    expect(preset).toEqual({
      kind: 'instruct',
      name: 'Alpaca',
      inputSequence: '### Instruction:',
      outputSequence: '### Response:',
      lastOutputSequence: '',
      systemSequence: '### Input:',
      stopSequence: '',
      wrap: true,
      macro: true,
      namesBehavior: 'force',
      activationRegex: '',
      firstOutputSequence: '',
      skipExamples: false,
      outputSuffix: '\n\n',
      inputSuffix: '\n\n',
      systemSuffix: '\n\n',
      userAlignmentMessage: '',
      systemSameAsUser: false,
      lastSystemSequence: '',
      firstInputSequence: '',
      lastInputSequence: '',
      sequencesAsStopStrings: true,
      storyStringPrefix: '',
      storyStringSuffix: '\n\n',
      rawSource: expect.any(Object),
    });
  });
});
```

- [ ] **Step 2: Run the preset tests to verify they fail**

Run: `npx vitest run apps/engine/src/prompt-runtime/context-preset.test.ts apps/engine/src/prompt-runtime/instruct-preset.test.ts`

Expected: FAIL because the `prompt-runtime` directory and normalization helpers do not exist yet.

- [ ] **Step 3: Write the shared preset types and normalizers**

Create `apps/engine/src/prompt-runtime/types.ts` with:

```ts
import type { Session } from '@lologames/shared';

export type StoryStringRole = 'system' | 'user' | 'assistant';
export type StoryStringPosition = 'before_history' | 'after_history';

export type ContextPreset = {
  kind: 'context';
  name: string;
  storyString: string;
  exampleSeparator: string;
  chatStart: string;
  useStopStrings: boolean;
  namesAsStopStrings: boolean;
  storyStringPosition: StoryStringPosition;
  storyStringDepth: number;
  storyStringRole: StoryStringRole;
  alwaysForceCharacterName: boolean;
  trimSentences: boolean;
  singleLine: boolean;
  rawSource?: unknown;
};

export type InstructPreset = {
  kind: 'instruct';
  name: string;
  inputSequence: string;
  outputSequence: string;
  lastOutputSequence: string;
  systemSequence: string;
  stopSequence: string;
  wrap: boolean;
  macro: boolean;
  namesBehavior: 'always' | 'never' | 'force';
  activationRegex: string;
  firstOutputSequence: string;
  skipExamples: boolean;
  outputSuffix: string;
  inputSuffix: string;
  systemSuffix: string;
  userAlignmentMessage: string;
  systemSameAsUser: boolean;
  lastSystemSequence: string;
  firstInputSequence: string;
  lastInputSequence: string;
  sequencesAsStopStrings: boolean;
  storyStringPrefix: string;
  storyStringSuffix: string;
  rawSource?: unknown;
};

export type PromptMessage = {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string;
};

export type PromptSections = {
  system: string;
  description: string;
  personality: string;
  scenario: string;
  persona: string;
  wiBefore: string;
  wiAfter: string;
  anchorBefore: string;
  anchorAfter: string;
};

export type PromptRuntimeContext = {
  session: Session;
  contextPreset: ContextPreset;
  instructPreset: InstructPreset | null;
  statData: Record<string, unknown>;
  playerName: string;
  characterName: string;
  sections: PromptSections;
  chatHistory: Array<PromptMessage>;
};

export type AssembledPrompt = {
  mode: 'chat' | 'instruct';
  systemText: string | null;
  promptText: string | null;
  messages: PromptMessage[];
  debug: {
    historyCount: number;
    usedInstructPreset: boolean;
  };
};

export type NormalizedProviderRequest = {
  providerId: string;
  endpoint: 'chat/completions' | 'completions';
  body: Record<string, unknown>;
};
```

Create `apps/engine/src/prompt-runtime/context-preset.ts` with:

```ts
import { z } from 'zod';

import type { ContextPreset, StoryStringPosition, StoryStringRole } from './types';

const ContextPresetSchema = z.object({
  name: z.string().default('Default'),
  story_string: z.string(),
  example_separator: z.string().default('***'),
  chat_start: z.string().default('***'),
  use_stop_strings: z.boolean().default(false),
  names_as_stop_strings: z.boolean().default(true),
  story_string_position: z.number().int().default(0),
  story_string_depth: z.number().int().nonnegative().default(1),
  story_string_role: z.number().int().default(0),
  always_force_name2: z.boolean().default(false),
  trim_sentences: z.boolean().default(false),
  single_line: z.boolean().default(false),
}).passthrough();

function mapPosition(value: number): StoryStringPosition {
  return value === 1 ? 'after_history' : 'before_history';
}

function mapRole(value: number): StoryStringRole {
  if (value === 1) return 'user';
  if (value === 2) return 'assistant';
  return 'system';
}

export function normalizeContextPreset(input: unknown): ContextPreset {
  const parsed = ContextPresetSchema.parse(input);

  return {
    kind: 'context',
    name: parsed.name,
    storyString: parsed.story_string,
    exampleSeparator: parsed.example_separator,
    chatStart: parsed.chat_start,
    useStopStrings: parsed.use_stop_strings,
    namesAsStopStrings: parsed.names_as_stop_strings,
    storyStringPosition: mapPosition(parsed.story_string_position),
    storyStringDepth: parsed.story_string_depth,
    storyStringRole: mapRole(parsed.story_string_role),
    alwaysForceCharacterName: parsed.always_force_name2,
    trimSentences: parsed.trim_sentences,
    singleLine: parsed.single_line,
    rawSource: input,
  };
}

export function exportContextPreset(preset: ContextPreset) {
  return {
    name: preset.name,
    story_string: preset.storyString,
    example_separator: preset.exampleSeparator,
    chat_start: preset.chatStart,
    use_stop_strings: preset.useStopStrings,
    names_as_stop_strings: preset.namesAsStopStrings,
    story_string_position: preset.storyStringPosition === 'after_history' ? 1 : 0,
    story_string_depth: preset.storyStringDepth,
    story_string_role:
      preset.storyStringRole === 'user' ? 1 : preset.storyStringRole === 'assistant' ? 2 : 0,
    always_force_name2: preset.alwaysForceCharacterName,
    trim_sentences: preset.trimSentences,
    single_line: preset.singleLine,
  };
}
```

Create `apps/engine/src/prompt-runtime/instruct-preset.ts` with:

```ts
import { z } from 'zod';

import type { InstructPreset } from './types';

const InstructPresetSchema = z.object({
  name: z.string().default('Default'),
  input_sequence: z.string().default(''),
  output_sequence: z.string().default(''),
  last_output_sequence: z.string().default(''),
  system_sequence: z.string().default(''),
  stop_sequence: z.string().default(''),
  wrap: z.boolean().default(true),
  macro: z.boolean().default(true),
  names_behavior: z.enum(['always', 'never', 'force']).default('force'),
  activation_regex: z.string().default(''),
  first_output_sequence: z.string().default(''),
  skip_examples: z.boolean().default(false),
  output_suffix: z.string().default(''),
  input_suffix: z.string().default(''),
  system_suffix: z.string().default(''),
  user_alignment_message: z.string().default(''),
  system_same_as_user: z.boolean().default(false),
  last_system_sequence: z.string().default(''),
  first_input_sequence: z.string().default(''),
  last_input_sequence: z.string().default(''),
  sequences_as_stop_strings: z.boolean().default(false),
  story_string_prefix: z.string().default(''),
  story_string_suffix: z.string().default(''),
}).passthrough();

export function normalizeInstructPreset(input: unknown): InstructPreset {
  const parsed = InstructPresetSchema.parse(input);

  return {
    kind: 'instruct',
    name: parsed.name,
    inputSequence: parsed.input_sequence,
    outputSequence: parsed.output_sequence,
    lastOutputSequence: parsed.last_output_sequence,
    systemSequence: parsed.system_sequence,
    stopSequence: parsed.stop_sequence,
    wrap: parsed.wrap,
    macro: parsed.macro,
    namesBehavior: parsed.names_behavior,
    activationRegex: parsed.activation_regex,
    firstOutputSequence: parsed.first_output_sequence,
    skipExamples: parsed.skip_examples,
    outputSuffix: parsed.output_suffix,
    inputSuffix: parsed.input_suffix,
    systemSuffix: parsed.system_suffix,
    userAlignmentMessage: parsed.user_alignment_message,
    systemSameAsUser: parsed.system_same_as_user,
    lastSystemSequence: parsed.last_system_sequence,
    firstInputSequence: parsed.first_input_sequence,
    lastInputSequence: parsed.last_input_sequence,
    sequencesAsStopStrings: parsed.sequences_as_stop_strings,
    storyStringPrefix: parsed.story_string_prefix,
    storyStringSuffix: parsed.story_string_suffix,
    rawSource: input,
  };
}
```

- [ ] **Step 4: Re-run the preset tests**

Run: `npx vitest run apps/engine/src/prompt-runtime/context-preset.test.ts apps/engine/src/prompt-runtime/instruct-preset.test.ts`

Expected: PASS with both preset normalization files green.

- [ ] **Step 5: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

### Task 2: Add Runtime Context And Minimal ST Story-String Rendering

**Files:**
- Create: `apps/engine/src/prompt-runtime/context.ts`
- Create: `apps/engine/src/prompt-runtime/context.test.ts`
- Create: `apps/engine/src/prompt-runtime/story-string.ts`
- Create: `apps/engine/src/prompt-runtime/story-string.test.ts`

- [ ] **Step 1: Write the failing runtime-context and story-string tests**

Create `apps/engine/src/prompt-runtime/context.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { createInitialSession } from '../services/session-service';
import { normalizeContextPreset } from './context-preset';
import { buildPromptRuntimeContext } from './context';

function createTestSession() {
  return createInitialSession({
    providerId: 'openai-compatible',
    credentialProfileId: 'default',
    storyModel: 'story-001',
    logicModel: null,
    useDualModel: false,
    playerProfile: {
      name: '林明霜',
      gender: '女',
      persona: '普通高中生，外冷内热。',
    },
  });
}

describe('buildPromptRuntimeContext', () => {
  it('derives player aliases, character name, and chat history from the session', () => {
    const session = createTestSession();
    session.logState.entries.push({ kind: 'interact', speaker: '你', text: '早上好。' });
    session.logState.entries.push({ kind: 'interact', speaker: '络络', text: '你也早。' });

    const context = buildPromptRuntimeContext({
      session,
      contextPreset: normalizeContextPreset({
        name: 'Default',
        story_string: '{{persona}}',
      }),
      instructPreset: null,
      characterName: '络络',
      sections: {
        system: '',
        description: '',
        personality: '',
        scenario: '',
        persona: '',
        wiBefore: '',
        wiAfter: '',
        anchorBefore: '',
        anchorAfter: '',
      },
    });

    expect(context.playerName).toBe('林明霜');
    expect(context.characterName).toBe('络络');
    expect(context.sections.persona).toContain('姓名：林明霜');
    expect(context.sections.persona).toContain('性别：女');
    expect(context.chatHistory).toEqual([
      { role: 'user', content: '早上好。' },
      { role: 'assistant', content: '你也早。' },
    ]);
  });
});
```

Create `apps/engine/src/prompt-runtime/story-string.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { renderStoryString } from './story-string';

describe('renderStoryString', () => {
  it('renders plain placeholders and removes missing values', () => {
    expect(
      renderStoryString('你好，{{user}}。{{missing}}', {
        user: '林明霜',
      }),
    ).toBe('你好，林明霜。');
  });

  it('keeps #if blocks only when the referenced section is non-empty and trims the final string', () => {
    const rendered = renderStoryString(
      '{{#if system}}{{system}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}',
      {
        system: '系统设定',
        persona: '玩家设定',
      },
    );

    expect(rendered).toBe('系统设定\n玩家设定');
  });

  it('drops #if blocks when the referenced section is empty', () => {
    const rendered = renderStoryString('{{#if scenario}}{{scenario}}\n{{/if}}{{trim}}', {
      scenario: '',
    });

    expect(rendered).toBe('');
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run apps/engine/src/prompt-runtime/context.test.ts apps/engine/src/prompt-runtime/story-string.test.ts`

Expected: FAIL because `buildPromptRuntimeContext(...)` and `renderStoryString(...)` do not exist yet.

- [ ] **Step 3: Write the runtime-context and story-string implementation**

Create `apps/engine/src/prompt-runtime/context.ts` with:

```ts
import type { Session } from '@lologames/shared';

import type { ContextPreset, InstructPreset, PromptRuntimeContext, PromptSections } from './types';

type BuildPromptRuntimeContextInput = {
  session: Session;
  contextPreset: ContextPreset;
  instructPreset: InstructPreset | null;
  characterName: string;
  sections: Partial<PromptSections>;
};

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function buildPersonaSection(statData: Record<string, unknown>) {
  const player = (statData.玩家 as Record<string, unknown> | undefined) ?? {};
  const lines = [
    `姓名：${readString(player.姓名)}`,
    `性别：${readString(player.性别)}`,
    `人设：${readString(player.人设)}`,
  ].filter((line) => !line.endsWith('：'));

  return lines.join('\n');
}

function mapLogEntryRole(speaker: string): 'user' | 'assistant' {
  return speaker === '你' ? 'user' : 'assistant';
}

export function buildPromptRuntimeContext(input: BuildPromptRuntimeContextInput): PromptRuntimeContext {
  const statData = input.session.variableState.stat_data as Record<string, unknown>;
  const player = (statData.玩家 as Record<string, unknown> | undefined) ?? {};

  return {
    session: input.session,
    contextPreset: input.contextPreset,
    instructPreset: input.instructPreset,
    statData,
    playerName: readString(player.姓名),
    characterName: input.characterName,
    sections: {
      system: input.sections.system ?? '',
      description: input.sections.description ?? '',
      personality: input.sections.personality ?? '',
      scenario: input.sections.scenario ?? '',
      persona: input.sections.persona && input.sections.persona.length > 0
        ? input.sections.persona
        : buildPersonaSection(statData),
      wiBefore: input.sections.wiBefore ?? '',
      wiAfter: input.sections.wiAfter ?? '',
      anchorBefore: input.sections.anchorBefore ?? '',
      anchorAfter: input.sections.anchorAfter ?? '',
    },
    chatHistory: input.session.logState.entries.map((entry) => ({
      role: mapLogEntryRole(entry.speaker),
      content: entry.text,
    })),
  };
}
```

Create `apps/engine/src/prompt-runtime/story-string.ts` with:

```ts
function replaceConditionals(template: string, values: Record<string, string>) {
  return template.replace(/\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, key, content) => {
    return values[key] && values[key].length > 0 ? content : '';
  });
}

function replaceTokens(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => values[key] ?? '');
}

export function renderStoryString(template: string, values: Record<string, string>) {
  const withoutTrimToken = template.replace(/\{\{trim\}\}/g, '');
  const rendered = replaceTokens(replaceConditionals(withoutTrimToken, values), values);

  return rendered.trim();
}
```

- [ ] **Step 4: Re-run the runtime-context and story-string tests**

Run: `npx vitest run apps/engine/src/prompt-runtime/context.test.ts apps/engine/src/prompt-runtime/story-string.test.ts`

Expected: PASS with session-derived context and minimal ST story-string behavior verified.

- [ ] **Step 5: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

### Task 3: Assemble Chat And Instruct Prompts From Runtime Context

**Files:**
- Create: `apps/engine/src/prompt-runtime/assembly.ts`
- Create: `apps/engine/src/prompt-runtime/assembly.test.ts`

- [ ] **Step 1: Write the failing assembly tests**

Create `apps/engine/src/prompt-runtime/assembly.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { createInitialSession } from '../services/session-service';
import { assemblePrompt } from './assembly';
import { normalizeContextPreset } from './context-preset';
import { buildPromptRuntimeContext } from './context';
import { normalizeInstructPreset } from './instruct-preset';

function createBaseSession() {
  const session = createInitialSession({
    providerId: 'openai-compatible',
    credentialProfileId: 'default',
    storyModel: 'story-001',
    logicModel: null,
    useDualModel: false,
    playerProfile: {
      name: '林明霜',
      gender: '女',
      persona: '普通高中生，外冷内热。',
    },
  });

  session.logState.entries.push({ kind: 'interact', speaker: '你', text: '早上好。' });
  session.logState.entries.push({ kind: 'interact', speaker: '络络', text: '你也早。' });
  session.logState.entries.push({ kind: 'move', speaker: '系统', text: '你前往走廊。' });

  return session;
}

describe('assemblePrompt', () => {
  it('assembles a chat-mode prompt with a rendered system message and clipped history', () => {
    const context = buildPromptRuntimeContext({
      session: createBaseSession(),
      contextPreset: normalizeContextPreset({
        name: 'Default',
        story_string: '{{#if system}}{{system}}\n{{/if}}{{#if persona}}{{persona}}{{/if}}{{trim}}',
        story_string_depth: 2,
        story_string_position: 0,
        story_string_role: 0,
      }),
      instructPreset: null,
      characterName: '络络',
      sections: {
        system: '你正在扮演络络。',
      },
    });

    expect(assemblePrompt(context)).toEqual({
      mode: 'chat',
      systemText: '你正在扮演络络。\n姓名：林明霜\n性别：女\n人设：普通高中生，外冷内热。',
      promptText: null,
      messages: [
        {
          role: 'system',
          content: '你正在扮演络络。\n姓名：林明霜\n性别：女\n人设：普通高中生，外冷内热。',
        },
        { role: 'assistant', content: '你也早。' },
        { role: 'assistant', content: '你前往走廊。' },
      ],
      debug: {
        historyCount: 2,
        usedInstructPreset: false,
      },
    });
  });

  it('assembles an instruct-mode prompt string when an instruct preset is present', () => {
    const context = buildPromptRuntimeContext({
      session: createBaseSession(),
      contextPreset: normalizeContextPreset({
        name: 'Default',
        story_string: '{{#if persona}}{{persona}}{{/if}}{{trim}}',
        story_string_depth: 1,
      }),
      instructPreset: normalizeInstructPreset({
        name: 'Alpaca',
        system_sequence: '### Input:',
        input_sequence: '### Instruction:',
        output_sequence: '### Response:',
        system_suffix: '\n\n',
        input_suffix: '\n\n',
        output_suffix: '\n\n',
      }),
      characterName: '络络',
      sections: {},
    });

    const assembled = assemblePrompt(context);

    expect(assembled.mode).toBe('instruct');
    expect(assembled.systemText).toBe('姓名：林明霜\n性别：女\n人设：普通高中生，外冷内热。');
    expect(assembled.promptText).toContain('### Input:姓名：林明霜');
    expect(assembled.promptText).toContain('### Instruction:你前往走廊。');
    expect(assembled.messages).toEqual([]);
    expect(assembled.debug).toEqual({
      historyCount: 1,
      usedInstructPreset: true,
    });
  });
});
```

- [ ] **Step 2: Run the assembly tests to verify they fail**

Run: `npx vitest run apps/engine/src/prompt-runtime/assembly.test.ts`

Expected: FAIL because `assemblePrompt(...)` does not exist yet.

- [ ] **Step 3: Write the assembly implementation**

Create `apps/engine/src/prompt-runtime/assembly.ts` with:

```ts
import { renderStoryString } from './story-string';
import type { AssembledPrompt, PromptMessage, PromptRuntimeContext } from './types';

function createStoryStringValues(context: PromptRuntimeContext): Record<string, string> {
  return {
    system: context.sections.system,
    description: context.sections.description,
    personality: context.sections.personality,
    scenario: context.sections.scenario,
    persona: context.sections.persona,
    wiBefore: context.sections.wiBefore,
    wiAfter: context.sections.wiAfter,
    anchorBefore: context.sections.anchorBefore,
    anchorAfter: context.sections.anchorAfter,
    user: context.playerName,
    char: context.characterName,
  };
}

function clipHistory(context: PromptRuntimeContext): PromptMessage[] {
  const depth = context.contextPreset.storyStringDepth;
  return depth > 0 ? context.chatHistory.slice(-depth) : [];
}

function assembleInstructPrompt(context: PromptRuntimeContext, systemText: string, history: PromptMessage[]): AssembledPrompt {
  const instruct = context.instructPreset;

  if (!instruct) {
    throw new Error('Expected instruct preset');
  }

  const promptText = [
    instruct.storyStringPrefix,
    instruct.systemSequence,
    systemText,
    instruct.systemSuffix,
    ...history.map((message) => {
      const sequence = message.role === 'assistant' ? instruct.outputSequence : instruct.inputSequence;
      const suffix = message.role === 'assistant' ? instruct.outputSuffix : instruct.inputSuffix;
      return `${sequence}${message.content}${suffix}`;
    }),
    instruct.storyStringSuffix,
  ].join('');

  return {
    mode: 'instruct',
    systemText,
    promptText,
    messages: [],
    debug: {
      historyCount: history.length,
      usedInstructPreset: true,
    },
  };
}

export function assemblePrompt(context: PromptRuntimeContext): AssembledPrompt {
  const systemText = renderStoryString(context.contextPreset.storyString, createStoryStringValues(context));
  const history = clipHistory(context);

  if (context.instructPreset) {
    return assembleInstructPrompt(context, systemText, history);
  }

  return {
    mode: 'chat',
    systemText,
    promptText: null,
    messages: [
      ...(systemText ? [{ role: context.contextPreset.storyStringRole, content: systemText } satisfies PromptMessage] : []),
      ...history,
    ],
    debug: {
      historyCount: history.length,
      usedInstructPreset: false,
    },
  };
}
```

- [ ] **Step 4: Re-run the assembly tests**

Run: `npx vitest run apps/engine/src/prompt-runtime/assembly.test.ts`

Expected: PASS with both chat-mode and instruct-mode assembly covered.

- [ ] **Step 5: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

### Task 4: Normalize Provider Requests From Assembled Prompts

**Files:**
- Create: `apps/engine/src/prompt-runtime/provider-request.ts`
- Create: `apps/engine/src/prompt-runtime/provider-request.test.ts`
- Create: `apps/engine/src/prompt-runtime/index.ts`

- [ ] **Step 1: Write the failing provider-request tests**

Create `apps/engine/src/prompt-runtime/provider-request.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import type { Session } from '@lologames/shared';

import { createNormalizedProviderRequest } from './provider-request';

function createTestSession(overrides: Partial<Session['modelConfig']> = {}): Session {
  return {
    sessionMeta: {
      id: 'sess_prompt',
      workId: 'riji-luoluo',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    },
    modelConfig: {
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: null,
      useDualModel: false,
      ...overrides,
    },
    gameState: {
      playerLocation: '教室',
      luoluoLocation: '教室',
      currentLocation: '教室',
      availableActions: ['interact', 'move', 'investigate'],
    },
    variableState: { stat_data: {} },
    timelineState: { nodes: [] },
    logState: { entries: [] },
    sceneState: { mode: 'dialog', speaker: '络络', text: '第一条消息' },
    investigationState: { entries: [] },
    saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
  };
}

describe('createNormalizedProviderRequest', () => {
  it('maps chat-mode assembled prompts to a chat-completions payload', () => {
    const request = createNormalizedProviderRequest(createTestSession(), {
      mode: 'chat',
      systemText: '系统设定',
      promptText: null,
      messages: [
        { role: 'system', content: '系统设定' },
        { role: 'user', content: '你好' },
      ],
      debug: {
        historyCount: 1,
        usedInstructPreset: false,
      },
    });

    expect(request).toEqual({
      providerId: 'openai-compatible',
      endpoint: 'chat/completions',
      body: {
        model: 'story-001',
        messages: [
          { role: 'system', content: '系统设定' },
          { role: 'user', content: '你好' },
        ],
      },
    });
  });

  it('maps instruct-mode assembled prompts to a completions payload', () => {
    const request = createNormalizedProviderRequest(createTestSession(), {
      mode: 'instruct',
      systemText: '系统设定',
      promptText: '### Input:系统设定\n\n### Instruction:你好\n\n',
      messages: [],
      debug: {
        historyCount: 1,
        usedInstructPreset: true,
      },
    });

    expect(request).toEqual({
      providerId: 'openai-compatible',
      endpoint: 'completions',
      body: {
        model: 'story-001',
        prompt: '### Input:系统设定\n\n### Instruction:你好\n\n',
      },
    });
  });
});
```

- [ ] **Step 2: Run the provider-request tests to verify they fail**

Run: `npx vitest run apps/engine/src/prompt-runtime/provider-request.test.ts`

Expected: FAIL because `createNormalizedProviderRequest(...)` does not exist yet.

- [ ] **Step 3: Write the provider-request implementation and barrel exports**

Create `apps/engine/src/prompt-runtime/provider-request.ts` with:

```ts
import type { Session } from '@lologames/shared';

import type { AssembledPrompt, NormalizedProviderRequest } from './types';

export function createNormalizedProviderRequest(
  session: Session,
  assembledPrompt: AssembledPrompt,
): NormalizedProviderRequest {
  if (assembledPrompt.mode === 'instruct') {
    return {
      providerId: session.modelConfig.providerId,
      endpoint: 'completions',
      body: {
        model: session.modelConfig.storyModel,
        prompt: assembledPrompt.promptText ?? '',
      },
    };
  }

  return {
    providerId: session.modelConfig.providerId,
    endpoint: 'chat/completions',
    body: {
      model: session.modelConfig.storyModel,
      messages: assembledPrompt.messages,
    },
  };
}
```

Create `apps/engine/src/prompt-runtime/index.ts` with:

```ts
export * from './types';
export * from './context-preset';
export * from './instruct-preset';
export * from './context';
export * from './story-string';
export * from './assembly';
export * from './provider-request';
```

- [ ] **Step 4: Re-run the provider-request tests**

Run: `npx vitest run apps/engine/src/prompt-runtime/provider-request.test.ts`

Expected: PASS with chat/instruct provider payload mapping green.

- [ ] **Step 5: Run the full prompt-runtime suite**

Run: `npx vitest run apps/engine/src/prompt-runtime/context-preset.test.ts apps/engine/src/prompt-runtime/instruct-preset.test.ts apps/engine/src/prompt-runtime/context.test.ts apps/engine/src/prompt-runtime/story-string.test.ts apps/engine/src/prompt-runtime/assembly.test.ts apps/engine/src/prompt-runtime/provider-request.test.ts`

Expected: PASS with all Phase A runtime tests green together.

- [ ] **Step 6: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

### Task 5: Repository Verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Run the engine-focused verification**

Run: `npx vitest run apps/engine/src/services/session-service.test.ts apps/engine/src/routes/session.test.ts apps/engine/src/server.test.ts apps/engine/src/prompt-runtime/context-preset.test.ts apps/engine/src/prompt-runtime/instruct-preset.test.ts apps/engine/src/prompt-runtime/context.test.ts apps/engine/src/prompt-runtime/story-string.test.ts apps/engine/src/prompt-runtime/assembly.test.ts apps/engine/src/prompt-runtime/provider-request.test.ts`

Expected: PASS with both legacy engine tests and the new prompt-runtime tests green.

- [ ] **Step 2: Run the full repository test suite**

Run: `npm test`

Expected: PASS with `vitest run` and `npm run typecheck:test-contracts` both succeeding.

- [ ] **Step 3: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

## Plan Notes

- The supported ST story-string feature set in this phase is intentionally narrow: plain placeholders, `#if` conditionals, and `{{trim}}`. Full macro compatibility stays out of scope.
- Character cards and lorebooks are intentionally deferred so the first runtime slice can be verified in isolation.
- `createNormalizedProviderRequest(...)` stops at payload shaping. Actual HTTP execution belongs in a later orchestrator/provider-runtime follow-up plan.

## Self-Review

- Spec coverage:
  - ST context/instruct asset normalization: covered by Task 1.
  - Runtime context from `session.variableState.stat_data`: covered by Task 2.
  - Minimal ST story-string behavior: covered by Task 2.
  - Chat/instruct dual output assembly and history depth: covered by Task 3.
  - Provider request normalization: covered by Task 4.
  - End-to-end verification against existing engine tests: covered by Task 5.
- Placeholder scan:
  - No `TBD`, `TODO`, or “similar to” placeholders remain.
  - Every code-changing step includes concrete code snippets and exact test commands.
- Type consistency:
  - `ContextPreset`, `InstructPreset`, `PromptRuntimeContext`, `AssembledPrompt`, and `NormalizedProviderRequest` are introduced in Task 1 and used consistently in later tasks.
  - `buildPromptRuntimeContext(...)`, `renderStoryString(...)`, `assemblePrompt(...)`, and `createNormalizedProviderRequest(...)` keep the same signatures across tasks.
