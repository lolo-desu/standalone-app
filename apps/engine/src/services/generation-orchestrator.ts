import type { LogEntry, SceneState, Session } from '@lologames/shared';

import {
  assemblePrompt,
  buildPromptRuntimeContext,
  createNormalizedProviderRequest,
  type AssembledPrompt,
  type ContextPreset,
  type InstructPreset,
  type LorebookAsset,
  type NormalizedProviderRequest,
} from '../prompt-runtime';
import { applyAction } from './session-service';

export type FormalSessionAction =
  | {
      kind: 'interact';
      text: string;
    }
  | {
      kind: 'move';
      destination: string;
    };

export type GeneratedContinuation = {
  scene: SceneState;
  logEntry: LogEntry | null;
};

export type GenerationExecutor = (input: {
  session: Session;
  action: FormalSessionAction;
  assembledPrompt: AssembledPrompt;
  providerRequest: NormalizedProviderRequest;
}) => Promise<GeneratedContinuation>;

type OrchestrateFormalActionOptions = {
  lorebook?: LorebookAsset | null;
  contextPreset?: ContextPreset;
  instructPreset?: InstructPreset | null;
  executor?: GenerationExecutor;
};

async function defaultGenerationExecutor(input: {
  session: Session;
}): Promise<GeneratedContinuation> {
  return {
    scene: input.session.sceneState,
    logEntry: null,
  };
}

export async function orchestrateFormalAction(
  session: Session,
  action: FormalSessionAction,
  options: OrchestrateFormalActionOptions = {},
): Promise<Session> {
  const baseSession = await applyAction(session, action);
  const runtimeContext = buildPromptRuntimeContext(baseSession, {
    lorebook: options.lorebook,
    contextPreset: options.contextPreset,
    instructPreset: options.instructPreset,
  });
  const assembledPrompt = assemblePrompt(runtimeContext);
  const providerRequest = createNormalizedProviderRequest(baseSession, assembledPrompt);
  const continuation = await (options.executor ?? defaultGenerationExecutor)({
    session: baseSession,
    action,
    assembledPrompt,
    providerRequest,
  });

  return {
    ...baseSession,
    sceneState: continuation.scene,
    logState: {
      entries:
        continuation.logEntry === null
          ? baseSession.logState.entries
          : [...baseSession.logState.entries, continuation.logEntry],
    },
  };
}
