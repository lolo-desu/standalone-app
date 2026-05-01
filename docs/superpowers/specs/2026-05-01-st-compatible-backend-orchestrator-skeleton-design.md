# ST-Compatible Backend Orchestrator Skeleton Design

## Goal

在现有 Phase A prompt runtime 和 Phase B lorebook runtime 之上，为 `apps/engine` 增加一层最小可测试的 generation orchestrator skeleton。

这一阶段的目标不是接真实 provider HTTP，而是让 `interact` / `move` 这类 formal action 真正走过下面这条链路：

- `buildPromptRuntimeContext()`
- `assemblePrompt()`
- `createNormalizedProviderRequest()`
- 注入式 generator executor

同时保持当前 engine 在没有真实模型依赖时仍然可运行、可测试、可保存快照。

## Non-Goals

本阶段明确不做：

- 真实 provider HTTP 调用
- 凭证读取与远程鉴权
- provider-specific response parsing
- `investigate` 接入模型生成
- 新 UI 或调试页面
- 角色卡兼容

## Current Context

当前 `/session/action` 的 formal action 路径仍然只是本地状态推进：

- `applyAction()` 更新 timeline / log / scene / variable state
- route 为 formal action 写 auto snapshot
- route 返回更新后的 session

当前 prompt runtime 已经可以：

- 基于 `Session` 和 lorebook 生成 runtime context
- 组装 chat / instruct prompt
- 归一化成 provider request payload

但这些能力还没有接到 formal action 主路径上。

## Core Decision

采用“新增 orchestrator service + 注入式 generator executor”的路线。

不采用两种路线：

1. 不直接在 route 里内联 prompt assembly 和 provider request 逻辑
原因：route 应该只做 HTTP 边界，不能变成 prompt runtime 和模型执行的耦合点。

2. 不在这一阶段直接接入真实 provider HTTP
原因：当前最需要的是把 runtime 链路串起来并可测试，而不是立刻引入凭证、超时、provider 差异和远程失败恢复。

最终选择：

- 新增一个 engine service 级 orchestrator
- formal action 通过 orchestrator 调用 prompt runtime
- generator executor 通过依赖注入传入
- 默认 executor 保持本地、无网络、可预测的行为

## System Boundary

这一阶段的模块边界如下：

- `session-service`
  - 继续负责基础 session 推进规则
  - 不直接理解 prompt assembly 或 provider request
- `prompt-runtime`
  - 继续负责 context / assembly / normalized request
- `generation-orchestrator`
  - 串联 formal action、prompt runtime、generator executor 和最终 session patch
- `routes/session.ts`
  - 只负责 HTTP 输入输出和 autosave 语义

## Formal Action Flow

formal action 的新链路建议为：

1. route 解析 `session + action`
2. 若 `action.kind === 'investigate'`，继续走现有本地路径，不接 orchestrator
3. 若 `action.kind === 'interact' | 'move'`：
   - 先调用 `applyAction()` 生成基础更新后的 session
   - 用这个基础 session 构造 `PromptRuntimeContext`
   - 运行 lorebook 匹配和 prompt assembly
   - 生成 normalized provider request
   - 调用注入的 generator executor
   - 把 executor 结果回写到 session 的 scene 和可选 log
4. route 仍然按现有规则写 auto snapshot 并返回最终 session

这样有两个好处：

- 不破坏 `applyAction()` 当前已验证的 timeline / save / investigate 语义
- prompt runtime 总是基于“玩家动作已落盘后的 session”来组装 prompt

## Generator Executor Contract

这一阶段不引入真实 provider client，而是定义一个注入式 executor 接口。

建议 contract：

```ts
type GeneratedContinuation = {
  scene: {
    mode: 'dialog' | 'narration' | 'choice' | 'map';
    text: string;
    speaker: string | null;
  };
  logEntry: {
    kind: 'dialog' | 'interact' | 'move' | 'investigate' | 'system';
    speaker: string | null;
    text: string;
  } | null;
};

type GenerationExecutor = (input: {
  session: Session;
  action: Extract<SessionAction, { kind: 'interact' | 'move' }>;
  assembledPrompt: AssembledPrompt;
  providerRequest: NormalizedProviderRequest;
}) => Promise<GeneratedContinuation>;
```

### Default Executor Behavior

默认 executor 不走网络，而是返回一个可预测的本地 continuation：

- `scene` 直接复用 `applyAction()` 之后的 `session.sceneState`
- `logEntry` 默认为 `null`

这意味着：

- 当前产品在没有 provider 接入时仍能工作
- orchestrator 可以先把 prompt runtime 真正串起来
- 后续接入真实 provider 时，只需要替换 executor

## Lorebook Integration Boundary

这一阶段 orchestrator 需要允许接收可选 lorebook 资产，并把它传给 `buildPromptRuntimeContext()`。

但本阶段不要求：

- 先把 lorebook 接到 desktop config 或 UI
- 先做多套资产管理

测试里通过依赖注入提供 lorebook 即可。

## Session Patch Strategy

orchestrator 对基础 session 的 patch 只做两件事：

1. 用 executor 返回的 `scene` 覆盖 `session.sceneState`
2. 若 `logEntry !== null`，把它追加到 `session.logState.entries`

这一阶段不额外修改：

- `timelineState`
- `investigationState`
- `saveMeta`
- `variableState`

这些仍由 `applyAction()` 和 route 的 autosave 逻辑负责。

## Testing Strategy

这一阶段至少要覆盖：

### 1. Orchestrator Unit Tests

验证：

- formal action 会先经过 `applyAction()` 形成基础 session
- lorebook 会进入 runtime context 并最终反映在 provider request 中
- executor 可以收到 assembled prompt 和 normalized provider request
- executor 返回的 `scene` / `logEntry` 会被回写到最终 session

### 2. Route Integration Tests

验证：

- `investigate` 仍然保持旧语义，不走 orchestrator
- `move` / `interact` 路径可通过依赖注入改走 orchestrator
- formal action 仍然会写 auto snapshot

### 3. Regression Scope

验证：

- 现有 `session-service` 测试继续通过
- 现有 prompt-runtime 测试继续通过
- 全仓 `npm test` 继续通过

## Success Criteria

完成这一阶段后，应当满足：

- formal action 主路径已经真正接通 prompt runtime
- orchestrator 可基于 lorebook 组装 provider request
- engine 在无真实 provider 情况下仍能稳定运行
- 将来接真实 provider 时，只需要替换 executor 实现，而不是重写 route 或 prompt runtime

## Deferred Follow-Ups

后续阶段再考虑：

- 真实 provider client
- 凭证读取与 provider registry
- 生成结果的结构化解析
- 更复杂的 action -> generation policy
- desktop 侧 lorebook / preset 资产输入渠道
