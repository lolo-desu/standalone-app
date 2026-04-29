import { z } from 'zod';

const ActionKindSchema = z.enum(['investigate', 'interact', 'move']);
const LogKindSchema = z.enum(['dialog', 'interact', 'move', 'investigate', 'system']);
const SceneModeSchema = z.enum(['dialog', 'narration', 'choice', 'map']);

export const TimelineNodeSchema = z
  .object({
    id: z.string(),
    kind: ActionKindSchema,
    text: z.string(),
    formal: z.boolean(),
  })
  .strict();

export const LogEntrySchema = z
  .object({
    kind: LogKindSchema,
    speaker: z.string().nullable().default(null),
    text: z.string(),
  })
  .strict();

export const SceneStateSchema = z
  .object({
    mode: SceneModeSchema,
    text: z.string(),
    speaker: z.string().nullable().default(null),
  })
  .strict();

export const InvestigationEntrySchema = z
  .object({
    id: z.string(),
    text: z.string(),
    turnsRemaining: z.number().int().nonnegative(),
  })
  .strict();

export const ActionResultSchema = z
  .object({
    statePatch: z.record(z.string(), z.any()),
    scenePatch: SceneStateSchema,
    displayPayload: z
      .object({
        text: z.string(),
      })
      .strict(),
    choices: z.array(z.string()),
    logEntry: LogEntrySchema.nullable().default(null),
    autosaveRequired: z.boolean(),
  })
  .strict();

export const actionResultSchema = ActionResultSchema;

export type ActionResult = z.infer<typeof ActionResultSchema>;
export type TimelineNode = z.infer<typeof TimelineNodeSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type SceneState = z.infer<typeof SceneStateSchema>;
export type InvestigationEntry = z.infer<typeof InvestigationEntrySchema>;

export function parseActionResult(input: unknown): ActionResult {
  return ActionResultSchema.parse(input);
}
