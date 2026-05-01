# ST-Compatible Backend Phase B Lorebook Design

## Goal

在已经完成的 Phase A prompt runtime core 之上，为 `apps/engine` 增加 SillyTavern-compatible 的世界书运行时子集。

这一阶段的目标是让当前项目可以在不依赖角色卡的前提下，直接消费 ST 风格 lorebook/world info 资产，并把命中的世界书条目稳定注入到现有 prompt runtime。

这和当前内容生产方式保持一致：`日记络络` 的关键提示主要来自世界书和 ST 预设，而不是角色卡描述字段。

## Non-Goals

本阶段明确不做：

- 角色卡兼容和角色卡驱动的世界书绑定
- provider preset / generation preset 的进一步行为化兼容
- `/session/action` 的生成编排接线
- ST 世界书的全量字段兼容
- 递归触发、正则触发、复杂权重图和 token 级完全一致裁剪

## Current Context

Phase A 已经具备：

- context preset / instruct preset normalize
- 从 `Session` 构造 `PromptRuntimeContext`
- 最小 story string 渲染器
- chat / instruct 双模式 prompt assembly
- provider request normalization

当前 `PromptRuntimeContext.sections` 已保留这几个与世界书相关的位置：

- `wiBefore`
- `wiAfter`

因此 Phase B 不需要重做 prompt pipeline，只需要补上世界书资产、匹配逻辑和把命中结果写入这两个 section 的链路。

## Core Decision

采用“世界书作为独立资产 + 运行时基础匹配注入”的路线。

不采用这两种路线：

1. 不把世界书挂到角色卡下面
原因：当前项目内容并不依赖角色卡驱动，强行绑定只会引入无意义耦合。

2. 不追求 ST 世界书全量行为复刻
原因：当前最有价值的是让世界书提示词可靠进入 prompt，而不是先覆盖大量边角字段和复杂触发图。

最终选择：

- 外部兼容 ST 风格 lorebook/world info JSON
- 内部统一 normalize 成独立 `LorebookAsset`
- 运行时只支持一组可测试、可预测的基础命中规则
- 注入位置只支持 `before_history` / `after_history`

## System Boundary

Phase B 新增的模块边界如下：

- `lorebook asset`：导入、导出、规范化 ST 风格世界书 JSON
- `lorebook matching`：从当前运行时上下文抽取文本并计算命中 entry
- `prompt context`：把命中结果整理进 `sections.wiBefore` / `sections.wiAfter`
- `prompt assembly`：消费已准备好的 section 并拼到最终 prompt

职责边界保持清晰：

- asset 层不关心 session 结构
- matching 层不关心 provider payload
- assembly 层不重新解释世界书规则

## Data Model Strategy

### Principle: External Compatibility, Internal Normalization

外部世界书文件保持 ST-compatible；内部运行时一律使用本项目自己的 normalized 结构。

运行时代码不应直接长期消费 ST 原始 JSON，否则后续匹配和测试都会被历史字段包袱拖累。

### Normalized Lorebook Model

内部建议结构：

```ts
type LorebookAsset = {
  kind: 'lorebook';
  name: string;
  entries: LorebookEntry[];
  rawSource?: unknown;
};

type LorebookEntry = {
  id: string;
  text: string;
  enabled: boolean;
  keywords: string[];
  secondaryKeywords: string[];
  matchMode: 'any' | 'all';
  scanDepth: number | null;
  insertionPosition: 'before_history' | 'after_history';
  order: number;
  comment: string;
};
```

Phase B 只保留真正影响注入行为的字段：

- entry 文本
- enabled
- primary / secondary keywords
- 匹配模式
- 扫描深度
- 注入位置
- 稳定排序字段

其他 ST 字段如果暂时不影响当前运行时行为，可以保留在 `rawSource`，但不进入主逻辑。

## Matching Rules

Phase B 采用简单、稳定、可预测的基础匹配规则。

### Search Sources

世界书匹配输入来源包括：

- `session.logState.entries` 的文本
- `sceneState.text`
- `session.variableState.stat_data` 中可字符串化的值
- Phase A 已有的 `playerName`
- Phase A 已有的 `characterName`
- `PromptRuntimeContext.sections` 中现成的文本 section

### Keyword Semantics

- 默认使用 `any` 语义：任一关键词命中即可
- 如原始 ST 数据表达“全部关键词都要命中”，normalize 成 `all`
- `secondaryKeywords` 作为附加约束字段保留并支持，但不扩展成复杂布尔表达式系统
- 缺失或空关键词的 entry 不参与命中

### Scan Depth

- `scanDepth` 解释为“最多扫描最近 N 条历史文本”
- 为 `null` 时表示不限制历史深度
- `sceneState.text` 与非历史来源仍可参与匹配，不受历史深度截断影响

### Dedupe And Ordering

- 同一条 entry 即使被多个来源重复命中，也只注入一次
- 命中结果按 `order` 升序稳定排序
- `order` 相同则回退到 entry 在资产中的原始顺序

### Explicitly Deferred Matching Behavior

本阶段明确暂缓：

- 递归触发
- 正则匹配
- 概率触发
- token 级窗口控制
- 多轮优先级传播图

## Injection Strategy

Phase B 只支持两类注入位置：

- `before_history`
- `after_history`

它们分别映射到现有 `PromptRuntimeContext.sections`：

- `wiBefore`
- `wiAfter`

命中的 entry 文本会先在 context 阶段被拼成纯文本块，再交给 assembly。

这样做的原因是：

- matching 规则只存在一处
- assembly 继续专注在“按位置拼 prompt”
- chat / instruct 模式都能自然复用同一份 section 数据

## Runtime Flow

建议新增这几个文件：

- `apps/engine/src/prompt-runtime/lorebook.ts`
  - ST 风格 lorebook normalize / export
- `apps/engine/src/prompt-runtime/lorebook-match.ts`
  - 计算命中 entry
- `apps/engine/src/prompt-runtime/lorebook.test.ts`
  - 资产 normalize/export 测试
- `apps/engine/src/prompt-runtime/lorebook-match.test.ts`
  - 匹配规则测试

并扩展已有文件：

- `apps/engine/src/prompt-runtime/types.ts`
  - 增加 lorebook 相关类型
- `apps/engine/src/prompt-runtime/context.ts`
  - 接收可选 lorebook 并写入 `wiBefore` / `wiAfter`
- `apps/engine/src/prompt-runtime/context.test.ts`
  - 增加 lorebook 命中 section 测试
- `apps/engine/src/prompt-runtime/assembly.ts`
  - 让 world info section 进入最终 prompt
- `apps/engine/src/prompt-runtime/assembly.test.ts`
  - 增加 chat / instruct 下的 world info 注入测试
- `apps/engine/src/prompt-runtime/index.ts`
  - re-export lorebook public surface

## Testing Strategy

Phase B 需要最少覆盖以下测试面：

### 1. Lorebook Asset Tests

验证：

- ST 风格 JSON 能正确 normalize
- disabled entry 不参与运行时命中
- insertion position / order / keywords 映射正确

### 2. Lorebook Matching Tests

验证：

- 最近历史文本可触发关键词命中
- `scanDepth` 生效
- `any` / `all` 匹配语义正确
- 同一 entry 重复命中只输出一次
- 命中结果排序稳定

### 3. Context Tests

验证：

- 传入 lorebook 时，`sections.wiBefore` / `sections.wiAfter` 被正确填充
- 没命中时保持空字符串，不产生噪音段落

### 4. Assembly Tests

验证：

- chat 模式最终消息中包含 world info section
- instruct 模式最终 prompt string 中包含 world info section
- world info 与现有 story string / history depth 语义能稳定共存

## Success Criteria

完成 Phase B 后，应当满足：

- 可以导入 ST 风格世界书核心子集
- 世界书条目可根据 session/runtime 文本稳定命中
- 命中条目可按 `before_history` / `after_history` 注入 prompt
- chat / instruct 两种模式都能消费这些注入内容
- 不引入角色卡依赖

## Deferred Follow-Ups

Phase B 之后再考虑：

- 角色卡兼容
- 更复杂的 lorebook 触发规则
- provider / generation preset 的行为扩展
- orchestrator 接入 `/session/action`
