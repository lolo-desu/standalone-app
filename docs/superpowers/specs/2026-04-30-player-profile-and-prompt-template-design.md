# Player Profile And Prompt Template Design

## Goal

在当前已经打通的桌面端首帧开局基础上，引入一套最小但可扩展的“玩家设定 + 变量驱动提示词”边界：

- 无进行中 session 时，先进入玩家设定页，而不是直接自动开局。
- 玩家设定至少包括：`姓名`、`性别`、`自定义人设`。
- 这些设定进入 `session.variableState.stat_data`，成为游戏运行时真源。
- 桌面端只额外记住上次输入的 `姓名`，作为下次预填。
- 后续提示词系统采用类似 SillyTavern 的 JSON 资产与 `{{变量路径}}` 插值规则，但提示词内容本身由用户手动编写和导入导出。

当前阶段不要求完成完整 LLM 路由与提示词执行，只要求把数据边界、模板格式和后续接口设计清楚，并为实现玩家设定开局打好基础。

## Non-Goals

当前阶段不做：

- 对现有对话框文本中的 `<user>` 做运行时替换
- 完整 provider 请求链与 prompt 执行链
- 世界书导入执行
- 角色卡导入执行
- 复杂角色编辑器
- 地图、背包等系统的完整实现

## Current Context

当前仓库已经具备：

- Electrobun 桌面壳与 renderer 启动链
- engine `/session/new` 创建初始 session
- renderer 自动挂载只读首帧场景
- `session.variableState.stat_data` 作为现有变量容器
- app settings 持久化能力

当前仓库尚未具备：

- 完整提示词系统
- prompt builder
- message assembly
- 模型 provider 真正调用链
- ST 风格 prompt JSON 导入导出

因此这次设计必须先把运行时状态边界定稳，避免后续地图、背包、时间、角色状态、事件系统和提示词系统各自长出不同真源。

## Core Principles

### 1. Variable State Is The Runtime Source Of Truth

所有游戏内参与提示词和规则判断的状态，长期都应进入 `session.variableState.stat_data`。

这包括但不限于：

- 世界状态
- 玩家设定
- 角色关系值
- 主线事件状态
- 地图相关状态
- 背包相关状态

桌面配置文件不是游戏真状态，只负责应用级默认值和用户输入记忆。

### 2. Session Owns Player Identity

玩家的 `姓名`、`性别`、`自定义人设` 属于存档内状态，而不是桌面全局状态。

原因：

- 读档时必须恢复与该存档匹配的玩家身份
- 多周目或不同存档可能对应不同玩家设定
- 后续地图、背包、事件系统和提示词都需要稳定引用同一个 session 内状态

### 3. Desktop Config Only Remembers Convenience Defaults

桌面端配置只保存一份“最近输入过的玩家姓名”，用于下次开局页预填。

这一值不是运行时真源：

- 不参与旧存档恢复
- 不覆盖 session 内玩家数据
- 不直接供提示词系统读取

### 4. Prompt Content Is User-Owned

提示词内容本身不由应用内 UI 编辑器强行生成。

产品只负责：

- 定义 prompt template JSON 结构
- 支持导入/导出
- 提供变量插值能力
- 提供固定上下文 block 的插入点

具体 prompt 文字由用户手动编写。

## Player Setup Flow

### Startup Behavior

renderer 启动时分成三类路径：

1. 已有进行中 session
   - 直接进入游戏场景
2. 无 session，且还未提交玩家设定
   - 进入玩家设定页
3. 玩家设定已提交，正在请求 `/session/new`
   - 显示启动中状态

如果创建失败，显示可读错误状态。

### Setup Fields

玩家设定页包含三个字段：

- `姓名`：单行输入，必填
- `性别`：单行自由输入
- `自定义人设`：多行自由文本

第一阶段最小校验：

- `姓名` 不能为空
- `性别` 可为空字符串
- `自定义人设` 可为空字符串

### Submit Behavior

点击“开始游戏”后：

1. renderer 保存 `lastPlayerName`
2. renderer 调用 `startNewGame(...)`
3. engine 创建 session 时把玩家设定写进 `stat_data`
4. renderer 收到 session 后进入首帧

## Variable Shape

本次新增后，推荐变量结构如下：

```json
{
  "世界": {
    "当前时间": "09:00",
    "当前日期": "2025/04/04",
    "当前星期": "星期三",
    "是否需要上学": true,
    "下一回合界面选择": "galgame",
    "_当前时间阶段": "上午"
  },
  "玩家": {
    "姓名": "林明霜",
    "性别": "女",
    "人设": "普通高中生，外冷内热，不擅长主动表达，但观察力强。"
  },
  "络络": {
    "亲密度": 10,
    "阅读日记数量": 0,
    "拥有联系方式": false
  },
  "主线事件": {
    "当前状态": "无法触发"
  }
}
```

约定：

- 玩家相关运行时信息统一放在 `stat_data.玩家`
- 第一阶段只要求稳定写入 `姓名`、`性别`、`人设`
- 后续可继续增加玩家命名空间下的更多字段，不需要改动 renderer 读取总边界

## Contract Changes

### New Game Input

`/session/new` 的输入需要从原本的模型配置扩展为：

- provider / credential / model 配置
- 玩家设定输入

新增结构建议为：

```ts
type PlayerProfileInput = {
  name: string;
  gender: string;
  persona: string;
};
```

然后在 new-game payload 中增加：

```ts
playerProfile: PlayerProfileInput;
```

### Session Contract

第一阶段不新增专门的顶层 `playerProfile` schema 字段。

原因：

- 当前仓库已经把可扩展变量统一放在 `variableState.stat_data`
- 地图、背包、事件系统以后也会沿用这套结构
- 先不把“玩家资料”从变量系统中抽出去，避免出现重复真源

因此 session 合同保持现状，玩家设定通过 `variableState.stat_data` 进入 session。

## Renderer Design

### App States

当前 `App` 的空态需要扩展为四种：

1. `ready`
   - 渲染已有场景
2. `setup`
   - 渲染玩家设定页
3. `starting`
   - 玩家设定已提交，正在新建 session
4. `error`
   - 新建失败，显示错误消息

### Setup UI

玩家设定页保持轻量，不做复杂新手引导。

包含：

- 标题文案
- `姓名` 输入框
- `性别` 输入框
- `自定义人设` 多行输入框
- `开始游戏` 按钮

`姓名` 默认值来自本地配置中的 `lastPlayerName`。

### Store Changes

renderer session store 需要新增：

- setup view state
- 当前待提交的 player profile input
- `startNewGameWithProfile(...)`

当前已有的 bootstrap state 继续保留，用于 `starting/error` 状态。

## Config Design

### App Settings

app settings 新增字段：

```ts
lastPlayerName: string | null;
```

用途仅限：

- 玩家设定页预填

不承担：

- 当前 session 真源
- 读档恢复
- prompt builder 变量来源

## Prompt Template System Direction

### Ownership Model

提示词模板由用户手动编写，以 JSON 形式导入导出。

应用负责：

- 存储结构
- 校验结构
- 导入导出
- 渲染插值
- 提供固定上下文 block

应用不负责：

- 自动生成完整 prompt 内容
- 用 UI 替用户编辑复杂 prompt 正文

### Template Variable Interpolation

提示词模板支持 `{{ }}` 形式的路径插值。

例如：

- `{{玩家.姓名}}` -> `林明霜`
- `{{世界.当前时间}}` -> `09:00`
- `{{络络.亲密度}}` -> `10`

规则：

- 以 `stat_data` 为根上下文
- `{{路径.字段}}` 使用点路径读取嵌套对象
- 未命中路径时，第一阶段可以渲染为空字符串
- 不在第一阶段引入复杂表达式、条件语法或函数调用

### Reserved Built-In Prompt Blocks

除了变量插值，还要支持一组固定 block，供模板引用或插入。

这些 block 的内容源分别如下：

- `user name`
  - 来自 `stat_data.玩家.姓名`
- `user description`
  - 来自玩家设定聚合文本，至少覆盖 `性别` 与 `人设`
- `char name`
  - 当前阶段固定为 `络络`
- `world description`
  - 来自作品世界描述内容源
- `character description`
  - 来自角色描述内容源
- `character personality`
  - 来自角色细节/性格描述内容源
- `character scenario/background`
  - 来自角色背景或当前作品开场背景内容源
- `chat log`
  - 来自 session 的 formal log / narration history 组合

这些 block 在 JSON 模板中需要有稳定的引用方式，但第一阶段可以先只完成结构设计与校验，不要求全部接上真实内容。

### Chat Log Depth

prompt template 需要支持类似 SillyTavern 的聊天 log 插入深度配置。

最小语义：

- 可以指定插入最近多少条 log
- 可以决定是否包含全部历史或只包含裁剪后的窗口
- 这一行为属于模板/运行参数的一部分，而不是 renderer UI 逻辑

第一阶段不要求做完整 token 预算裁剪器，但需要在 JSON 结构中给出容器位置。

### JSON Asset Compatibility Direction

本项目的 prompt JSON 目标是“风格和使用方式接近 SillyTavern”，而不是承诺第一阶段做到 byte-for-byte 完整兼容。

兼容重点放在：

- 用户手写 JSON
- 导入导出
- 支持变量插值
- 支持固定 block
- 支持 chat log depth

不在第一阶段承诺：

- 全量复刻 ST 所有预设字段
- 完整复刻所有宏语法
- 与 ST 原始预设文件完全无损双向互转

## Prompt Runtime Boundaries

未来真正接 LLM 时，应新增 engine 侧 prompt runtime，职责拆成：

1. `prompt template repository`
   - 保存/读取用户 JSON 模板
2. `prompt variable resolver`
   - 从 session `stat_data` 解析 `{{变量路径}}`
3. `prompt block resolver`
   - 提供 `user/char/world/log` 等固定 block
4. `prompt builder`
   - 组装最终消息
5. `provider adapter`
   - 把组装好的 prompt 发给具体模型

renderer 不直接拼提示词。

## Error Handling

### Player Setup Errors

- `姓名` 为空：阻止提交并显示最小错误提示
- engine 创建失败：显示可读错误状态，并允许重新提交
- config 保存 `lastPlayerName` 失败：不阻止开局，但应记录错误并继续使用本次输入完成 session 创建

### Prompt Template Errors

后续 prompt system 第一阶段需要定义以下错误类别：

- JSON 非法
- 模板字段缺失
- `{{变量路径}}` 不存在
- block 引用名非法
- chat log depth 非法

其中变量未命中第一阶段建议降级为空字符串，而不是直接中止整个生成流程。

## Testing Strategy

### Player Setup

至少覆盖：

- renderer 在无 session 时显示玩家设定页
- `lastPlayerName` 被正确预填
- 提交后 `startNewGame` 收到玩家设定 payload
- engine 创建 session 时把 `玩家.姓名/性别/人设` 写入 `stat_data`
- 错误状态能重新显示

### Config

至少覆盖：

- `lastPlayerName` 的读写与默认值
- 旧 settings 文件缺少该字段时能正确回落

### Prompt Template Foundation

至少覆盖：

- `{{玩家.姓名}}` 形式的路径插值
- 缺失路径回落为空字符串
- block 引用结构校验
- chat log depth 字段校验

## Implementation Phasing

### Phase 1

- 玩家设定开局页
- `lastPlayerName` 本地预填
- `/session/new` 接收玩家设定
- session `stat_data.玩家` 初始化

### Phase 2

- prompt template JSON 结构定义
- JSON 导入导出
- `{{变量路径}}` 插值器
- 内置 block resolver 基础版

### Phase 3

- 真正接入 engine prompt builder
- chat log depth 行为落地
- provider adapter 与模型调用

## Rationale

选择这套方案的原因是：

- 它把玩家身份纳入统一变量系统，而不是造新的真源
- 它允许未来地图、背包、时间、关系、事件和 prompt system 共用一条数据链
- 它把 prompt 内容的主导权留给用户，而不是强行做成黑盒 UI
- 它先做最小开局闭环，再逐步接上完整提示词运行时，范围清晰且可验证
