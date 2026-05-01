# 日记络络只读场景接入真实 Session 设计稿

## 目标

把当前桌面端 renderer 里的游戏中界面从静态原型文案，切换为由真实 `sessionStore.currentSession` 驱动的只读场景显示。

这一轮只解决“显示真实数据”，不解决“推进交互”。

完成后应满足：

- 游戏中界面仍保持当前已确认的 galgame 视觉样式
- 左侧日期/时段、说话人、正文不再硬编码
- 这些文本由 `Session` 中现有数据映射而来
- 当没有 `currentSession` 时，显示同视觉语言的空状态，而不是白屏、裸文本或自动开局

## 范围

本轮包含：

- 给 renderer 增加一个从 `Session | null` 到只读场景 view model 的映射层
- 让根 `App` 使用该 view model 渲染场景文本
- 为无 session 状态提供稳定空状态文案
- 为映射逻辑和渲染逻辑补回归测试

本轮不包含：

- 自动创建新游戏
- 主菜单视觉定稿
- 存档/读档/log 的交互接线
- `互动 / 移动 / 调查` 的动作提交
- 对 engine 或 shared contract 做结构变更

## 方案结论

采用一个很薄的场景映射层，而不是让 `App` 直接揉 `Session` 结构。

推荐原因：

- 这是当前最小且正确的边界
- renderer UI 不需要知道 `Session` 的全部内部结构
- 后续接 log、menu、save/load 时可以继续沿用同样模式
- 映射层是纯函数，最容易单测

## 架构

### 1. 数据来源

数据仍然来自现有 renderer bootstrap：

- `bootstrapRenderer()` 创建 `sessionStore`
- `sessionStore.currentSession` 保持 `Session | null`

本轮不修改 store 对外 API。

### 2. 新增 View Model

新增一个只服务当前游戏中界面的 view model，例如：

```ts
type GameSceneViewModel = {
  state: 'empty' | 'ready';
  dateLabel: string;
  speaker: string | null;
  text: string;
};
```

说明：

- `state` 只区分“无会话”和“可显示场景”
- 第一阶段不把动作按钮、地点列表、调查列表塞进这个 model
- 保持 model 尽可能小，避免提前设计

### 3. 映射函数

新增纯函数，负责把 `Session | null` 转成 `GameSceneViewModel`。

输入：

- `Session | null`

输出规则：

- `null` -> `state: 'empty'`
- 非空 session -> `state: 'ready'`
- `speaker` 来自 `session.sceneState.speaker`
- `text` 来自 `session.sceneState.text`
- `dateLabel` 先走保守映射：
  - 优先尝试从 `session.variableState.stat_data` 中读取能直接表达日期/时段的已存在字段
  - 如果当前 session 没有稳定可用的日期字段，则回退为当前已验收文案 `四月十七日 - 放学后`

这里的关键原则是：

- 不猜测新的 shared contract 字段
- 不为了这轮显示去改 engine/session schema
- 允许日期文本在首轮仍是保守回退值，但说话人和正文必须来自真实 session

## UI 渲染策略

### 1. Ready 状态

保留当前已确认的视觉结构：

- 左侧竖排日期
- 底部对话区域
- 角色名
- 正文
- 右下角控件视觉

但这些文本来源改为 view model。

### 2. Empty 状态

当没有 `currentSession` 时，不自动调用 `startNewGame()`。

原因：

- 自动开局会把 UI 接线和业务流程耦在一起
- 当前还没有完成主菜单和新游戏流程设计
- 空状态更适合作为第一阶段稳定落点

空状态样式原则：

- 继续使用同一套背景、底部框体和排版语言
- 对话区域显示清晰说明，例如“当前还没有进行中的游戏”
- 角色名可为空或显示系统提示标签

## 测试策略

### 1. 映射函数测试

新增 focused tests，覆盖：

- `null` session -> 返回 empty view model
- 有 scene speaker/text 的 session -> 正确映射到 UI 文本
- 日期字段缺失时 -> 回退到默认日期文案

### 2. App 渲染测试

新增或更新 renderer tests，覆盖：

- ready 状态时渲染真实 speaker/text
- empty 状态时渲染空状态文案
- 不再依赖硬编码原型台词作为唯一正确输出

### 3. 回归验证

继续保留已有验证：

- `main-wrapper.test.ts` 确认 `App` 是可渲染组件
- `index-html.test.ts` 确认 HTML 壳加载 `index.css`
- renderer Bun build 成功

## 实现顺序

1. 为场景 view model 映射写失败测试
2. 实现最小映射函数
3. 为 `App` 写或更新失败测试
4. 把 `App` 从硬编码文本切到 view model
5. 跑 focused renderer tests
6. 跑 `npm test`
7. 跑一次 renderer build / `electrobun dev` 验证

## 风险与处理

### 风险 1：日期字段在当前 session 里并不稳定

处理：

- 首轮只把日期作为“尽量读取，否则回退”字段
- 不阻塞 speaker/text 的真实接入

### 风险 2：`App.ts` 继续膨胀

处理：

- 本轮如需拆分，只允许拆一个很薄的 view-model 模块
- 不提前引入新的大 store 或复杂组件树

### 风险 3：用户把“空状态”理解为故障

处理：

- 空状态文案明确说明“当前没有进行中的游戏”
- 视觉保持一致，避免再次像白屏/裸文本那样让状态含义不清

## 成功标准

完成后，以下条件全部成立：

- 打开桌面应用时，游戏中界面不再只显示硬编码台词
- 有 session 时，至少说话人和正文来自真实 `currentSession`
- 无 session 时，显示稳定空状态
- 全部相关测试通过
- renderer build 和 dev 启动验证通过
