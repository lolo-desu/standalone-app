# ST-Compatible Backend Design

## Goal

把当前仓库的 `apps/engine` 演进为一个面向单机叙事游戏的 SillyTavern-style backend subset。

目标不是把整个项目重写成 SillyTavern，而是让“模型请求前的运行时链路”在核心行为上尽量贴近 SillyTavern：

- 兼容高价值 prompt/template 资产格式
- 兼容核心 prompt assembly 行为
- 兼容角色卡和 lorebook/world info 的基础注入方式
- 兼容主流 chat/instruct provider request 归一化方式

同时保留当前仓库已经存在且已经验证可用的边界：

- `session` 继续作为游戏运行时真源
- `save/load` 继续走现有快照系统
- desktop bootstrap 和 renderer 启动流保持不变

## Non-Goals

本设计不追求：

- 100% 一字不差复刻 SillyTavern 全部后端实现
- 完整兼容 SillyTavern 所有宏、扩展插件、第三方 provider 特例
- 第一阶段就完成所有角色编辑器、世界书编辑器、模板编辑器 UI
- 把当前 session/save 系统替换成 SillyTavern 的聊天存档模型
- 在运行时代码里直接长期依赖 SillyTavern 原始 JSON 结构

## Current Context

当前仓库的 engine 还是一个很薄的本地服务层，主要提供：

- `/session/new`
- `/session/action`
- `/session/save`
- `/session/load`

当前已经具备：

- `session.variableState.stat_data` 作为游戏态变量真源
- 可运行的 desktop -> engine -> renderer 首帧链路
- 现有 session 快照持久化能力
- 模型配置的最小输入边界

当前尚未具备：

- prompt template asset runtime
- character card runtime
- lorebook/world info runtime
- prompt interpolation / assembly pipeline
- provider request normalization runtime
- generation orchestrator

因此这次设计不应该把现有 engine 全盘推翻，而应该在现有 session/save 外壳旁边新增一条 ST-compatible prompt runtime 线。

## Core Decision

采用“保留现有 engine 外壳 + 新增 ST-compatible runtime core”的路线。

不选两种路线：

1. 不直接整体移植 SillyTavern 后端结构
原因：当前仓库已经有自己的 session/save/bootstrap 边界，整体移植会造成过度耦合和大量无关重构。

2. 不只做文件格式兼容
原因：如果只兼容导入导出，不兼容 runtime assembly 行为，就无法满足“后端照搬 ST”的目标。

最终选择：

- 保留 `apps/engine` 的路由和 session 边界
- 在 engine 内新增一层 ST-compatible runtime core
- 让兼容性集中落在 prompt asset、interpolation、assembly、provider runtime 上

## System Boundary

新的后端边界定义如下：

- `session-service` 负责游戏状态如何创建、如何推进、如何保存
- `prompt runtime` 负责如何把游戏状态、角色资产、世界资产和历史记录拼成模型输入
- `provider runtime` 负责如何把 prompt runtime 的中间结果转成具体 provider 请求
- `generation orchestrator` 负责把 prompt runtime 和 session runtime 串起来

换句话说：

- 不是让存档系统模仿 SillyTavern
- 而是让“喂给模型之前的整条 pipeline”模仿 SillyTavern

## ST-Compatible Scope

这里的 `Phase A / B / C` 指的是 ST-compatible backend runtime 自身的实施阶段，不是对 `player-profile-and-prompt-template-design.md` 中玩家设定开局 Phase 1 的重命名。

### Phase A: Required Compatibility

第一阶段必须覆盖高价值核心子集。

#### 1. Prompt Template Asset Format

支持 ST 风格 prompt/template JSON 的核心字段导入、导出和运行时加载：

- block 列表
- enabled / disabled
- block 顺序
- 基础注入位置
- 运行模式相关配置

#### 2. Variable Interpolation

支持变量插值，至少覆盖：

- `{{变量路径}}`
- `stat_data` 下各命名空间访问
- 常用玩家 / 角色 / 世界 alias

未命中变量时默认返回空字符串，不因单个变量缺失导致整轮生成失败。

#### 3. Prompt Assembly

支持 ST 风格的核心拼装行为：

- block 顺序
- enabled / disabled
- before-history / history / after-history 这类基础位置
- system / persona / scenario / example / post-history instructions 等核心 block 类型
- `chat log depth`

#### 4. Chat History Handling

支持从当前仓库自己的 session/log 中提炼聊天记录，并按 ST 风格的核心思路裁剪：

- 先按最近 N 轮截取
- 再按上下文限制裁剪
- 输出统一 role 语义

#### 5. Dual Output Modes

同一条 runtime pipeline 需要同时支持：

- chat messages 输出
- instruct / completion string prompt 输出

### Phase B: Secondary Compatibility

在 Phase A 稳定后补齐：

- character card 核心字段兼容
- lorebook/world info 基础匹配和注入
- provider preset / generation preset 核心字段兼容

### Phase C: Explicitly Deferred

明确暂缓：

- SillyTavern 全量宏系统
- 全部扩展插件行为
- 所有 provider 的边角特例
- token 级完全一致的历史裁剪
- 全资产类型 100% 无损 round-trip

## Engine Module Design

建议在 `apps/engine/src` 中新增独立的 prompt runtime 模块树，与现有 `services/session-service.ts` 并列。

### 1. `prompt-assets`

职责：定义、导入、导出、规范化外部资产。

输入：

- prompt template JSON
- character card
- lorebook / world info
- provider preset / generation preset

输出：内部 normalized model。

### 2. `prompt-context`

职责：把 session 和外部资产整理成统一运行时上下文。

输入来源：

- `session.variableState.stat_data`
- 当前角色资产
- lorebook 资产
- session/log 中的历史记录
- app / session 级模型配置

输出：`PromptRuntimeContext`。

### 3. `prompt-interpolation`

职责：执行变量路径解析和文本插值。

这一层只负责把 token 替换为字符串，不负责 block 顺序。

### 4. `prompt-assembly`

职责：按 ST 风格规则把 block、角色字段、世界书命中项和聊天历史拼成最终中间结果。

负责：

- block order
- history placement
- lore placement
- mode-sensitive output

### 5. `provider-runtime`

职责：把 assembly 的中间结果转换为具体 provider 请求体。

只关心：

- provider 类型
- request payload 结构
- response 归一化

不关心角色卡、lorebook、变量来源。

### 6. `generation-orchestrator`

职责：把 session runtime 和 prompt runtime 串起来，为未来的 scene generation / action continuation 提供稳定入口。

## Data Model Strategy

### Principle: External Compatibility, Internal Normalization

外部文件尽量兼容 ST；内部运行时必须统一成自己的 normalized model。

运行时代码不应长期直接消费 ST 原始 JSON。

原因：

- ST 字段历史包袱重
- 同一语义可能存在多种写法
- 直接运行 ST 原始结构会让运行时代码充满兼容分支
- 测试和后续扩展会明显变差

### Prompt Template Asset

内部建议结构：

```ts
type PromptTemplateAsset = {
  id: string;
  name: string;
  mode: 'chat' | 'instruct';
  blocks: PromptBlock[];
  settings: {
    chatHistoryDepth: number | null;
    maxContextTokens: number | null;
  };
  rawSource?: unknown;
};

type PromptBlock = {
  id: string;
  kind:
    | 'system'
    | 'developer'
    | 'persona'
    | 'scenario'
    | 'world'
    | 'example_dialogue'
    | 'chat_history'
    | 'post_history_instructions'
    | 'jailbreak'
    | 'custom';
  enabled: boolean;
  position:
    | 'before_main'
    | 'before_history'
    | 'history'
    | 'after_history';
  role: 'system' | 'user' | 'assistant' | 'developer' | null;
  depth: number | null;
  content: string;
  metadata?: Record<string, unknown>;
};
```

### Character Asset

内部建议结构：

```ts
type CharacterAsset = {
  id: string;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  exampleDialogues: string[];
  alternateGreetings: string[];
  creatorNotes: string | null;
  systemPrompt: string | null;
  postHistoryInstructions: string | null;
  tags: string[];
  extensions: Record<string, unknown>;
  rawSource?: unknown;
};
```

### Lorebook Asset

内部建议结构：

```ts
type LorebookAsset = {
  id: string;
  name: string;
  entries: LorebookEntry[];
  rawSource?: unknown;
};

type LorebookEntry = {
  id: string;
  enabled: boolean;
  keys: string[];
  secondaryKeys: string[];
  content: string;
  insertionOrder: number;
  position: 'before_history' | 'after_history' | 'at_depth';
  depth: number | null;
  priority: number;
  scanDepth: number | null;
  matchWholeWords: boolean;
  caseSensitive: boolean;
  metadata?: Record<string, unknown>;
};
```

### Runtime Context

内部建议结构：

```ts
type PromptRuntimeContext = {
  session: Session;
  statData: Record<string, unknown>;
  playerName: string;
  characterName: string;
  template: PromptTemplateAsset;
  character: CharacterAsset | null;
  lorebooks: LorebookAsset[];
  chatHistory: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
};
```

## Runtime Pipeline

一轮生成的标准 pipeline 固定为 7 步。

### 1. Load Assets

读取 template、character、lorebook、preset，并全部 normalize 成内部结构。

### 2. Build Runtime Context

从 session、`stat_data` 和 log 中提取运行时真源，构造 `PromptRuntimeContext`。

### 3. Resolve Lorebook Entries

基于最近聊天记录、当前场景文本和必要变量文本做关键词扫描，得到本轮命中的 lore entries。

### 4. Interpolate Blocks

对 template block、character 字段、lore entry 内容执行变量插值。

### 5. Assemble Prompt

按 block 顺序和位置拼装 system/persona/scenario/lore/history/post-history instructions 等内容，输出统一中间结果。

建议中间结构：

```ts
type AssembledPrompt = {
  mode: 'chat' | 'instruct';
  systemText: string | null;
  promptText: string | null;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'developer';
    content: string;
  }>;
  debug: {
    usedBlocks: string[];
    matchedLoreEntryIds: string[];
  };
};
```

### 6. Normalize Provider Request

根据 provider 类型，把 `AssembledPrompt` 转成具体请求体。

### 7. Execute And Parse Response

执行 provider 请求，解析响应，并把结果交还给上层 orchestrator 处理。

## Error Handling Strategy

### Asset Parse Errors

模板、角色卡、世界书等资产的结构错误应尽量在导入阶段暴露；运行时遇到非法资产时返回结构化错误，而不是无上下文地返回 500。

### Interpolation Errors

缺失变量、非字符串变量等问题默认降为空字符串，并允许在 debug 输出中记录未命中项。

### Lorebook Resolution Errors

单条世界书条目非法时跳过该条，不中断整轮 assembly。

### Provider Errors

provider-runtime 需要把底层错误统一归类为稳定的错误类型，例如：

- `configuration_error`
- `network_error`
- `provider_error`
- `response_parse_error`

### Session Consumption Errors

模型生成成功但上层游戏逻辑消费失败时，不丢原始模型输出，避免把“生成失败”和“解析失败”混为一类。

## Integration With Existing Session Runtime

现有 `session-service` 和 `routes/session.ts` 不直接承载 prompt runtime 的细节。

集成方式建议如下：

- `createInitialSession(...)` 继续只做 session 初始化
- `applyAction(...)` 继续只做状态推进和结果回填的最小逻辑
- 新增 orchestrator，在需要模型生成的路径中调用 prompt runtime
- prompt runtime 只读 `session.variableState.stat_data` 和必要 log，不直接改写 session schema

这保证：

- session 仍然是游戏状态真源
- ST 兼容性被限制在 runtime core 中
- 以后增加日记游戏专有规则时，不会破坏兼容核心

## Testing Strategy

### 1. Asset Normalization Tests

覆盖：

- ST 风格模板 JSON -> `PromptTemplateAsset`
- ST 风格角色卡 -> `CharacterAsset`
- ST 风格 lorebook -> `LorebookAsset`

### 2. Interpolation Tests

覆盖：

- `{{玩家.姓名}}`
- `{{世界.当前时间}}`
- 缺失变量
- 嵌套路径
- alias 映射

### 3. Assembly Tests

覆盖：

- block 顺序
- enabled / disabled
- history depth
- lore 注入位置
- chat mode 和 instruct mode 的输出差异

### 4. Provider Adapter Tests

覆盖：

- `AssembledPrompt` 到 OpenAI / OpenAI-compatible 请求体的映射
- generation preset 字段映射
- provider 错误归一化

### 5. Golden Tests

为固定输入建立 golden outputs：

- session
- template
- character
- lorebook

断言最终 assembled result 的内容和顺序，便于后续逐步逼近 ST 行为时识别回归。

### 6. Integration Tests

从 orchestrator 或 engine route 入口进入，mock provider 返回，覆盖完整 pipeline，并断言 session / log / scene 更新结果。

## Implementation Order

建议实施顺序：

1. prompt template normalized model 和 import/export
2. interpolation runtime
3. prompt assembly runtime
4. chat / instruct dual-mode output
5. character asset normalize
6. lorebook resolution and injection
7. provider request normalization
8. orchestrator integration

这个顺序先把“prompt/template 资产格式 + 运行时拼装行为”做实，再继续逼近更完整的 ST 风格后端能力。

## Relationship To Existing Specs

本设计补充并细化了 `2026-04-30-player-profile-and-prompt-template-design.md` 中关于 prompt template system 的后续方向。

两份 spec 的关系是：

- `player-profile-and-prompt-template-design.md` 定义玩家设定和变量真源边界
- `st-compatible-backend-design.md` 定义模型请求前的 ST-compatible backend runtime

后续实现时，两者都应成立：

- 玩家状态继续存在 `session.variableState.stat_data`
- prompt runtime 从该真源读取变量，并按 ST 风格 pipeline 组装请求
