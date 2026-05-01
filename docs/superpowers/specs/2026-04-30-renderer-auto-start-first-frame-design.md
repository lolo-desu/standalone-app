# Renderer 自动开局首帧设计稿

## 目标

让桌面端 renderer 在存在完整默认配置时，自动调用 `startNewGame()` 并进入真实首帧场景，而不是停在“当前还没有进行中的游戏”空状态。

这一轮目标是打通“配置默认值 -> 新 session -> 首帧场景 UI”这条最短路径。

## 范围

本轮包含：

- 从 `configStore.appSettings` 推导新游戏启动 payload
- 在 renderer 启动后、且当前没有 session 时自动尝试开局
- 为启动中和启动失败提供明确状态
- 成功后复用当前已完成的只读场景绑定显示真实首帧

本轮不包含：

- 主菜单
- 新游戏向导
- 手动“开始游戏”按钮
- save/load/log 交互接线
- engine 或 shared contract 结构调整

## 方案结论

采用“配置完整则自动开局，否则保留空状态”的最小闭环方案。

原因：

- 这是当前最短的真实可玩链路
- 不需要先引入临时主菜单或按钮
- 能最大化复用现有 `configStore`、`sessionStore.startNewGame()`、只读场景 UI

## 启动条件

只有在以下条件全部满足时，renderer 才自动尝试开局：

- `sessionStore.currentSession === null`
- `configStore.appSettings.defaultProviderId` 为非空字符串
- `configStore.appSettings.defaultCredentialProfileId` 为非空字符串
- `configStore.appSettings.defaultStoryModel` 为非空字符串
- 如果 `useDualModel === true`，则 `defaultLogicModel` 也必须为非空字符串

如果条件不满足，不报错，不调用 engine，继续显示空状态。

## 架构

### 1. 纯 payload 解析层

新增一个纯函数，从 `AppSettings` 解析出自动开局所需 payload。

输出两种结果之一：

- 可启动：返回 `NewGameInput`
- 不可启动：返回 `null`

这个函数不直接访问 store，也不做网络调用，只负责把默认配置转成稳定、可测试的输入。

### 2. 启动状态放在 sessionStore

给 `sessionStore` 增加最小启动状态：

- `bootstrapState: 'idle' | 'starting' | 'error'`
- `bootstrapError: string | null`

以及一个很薄的方法，例如 `startNewGameFromDefaults(appSettings)`，内部流程：

1. 用纯解析函数判断默认配置是否可启动
2. 不可启动则直接返回，不改 session
3. 可启动则写入 `starting`
4. 调用现有 `startNewGame(payload)`
5. 成功后清回 `idle`
6. 失败后写入 `error` 和错误文案

这里不新增第二套 session 启动 API，不改现有 `startNewGame()` 语义。

### 3. 启动触发位置

自动开局触发放在 renderer 启动边界，而不是 `App` 渲染函数里。

推荐位置：`index.ts` 在 `bootstrapElectrobunRenderer()` resolve 后、`createApp()` 之前或紧接之后调用一次。

原因：

- `App` 应保持偏渲染职责
- 自动开局属于启动编排，不属于视图模板逻辑
- 这样可以避免在组件 render 周期里引入副作用

## UI 行为

### 1. 启动中

当 `bootstrapState === 'starting'` 且 `currentSession === null` 时：

- 继续复用当前游戏内视觉壳
- 文本显示“正在进入新的游戏...”之类的系统提示
- 不显示角色名

### 2. 启动失败

当 `bootstrapState === 'error'` 且 `currentSession === null` 时：

- 保持当前视觉壳
- 显示清晰错误文案，例如“自动开始新游戏失败”
- 同时展示来自 store 的错误消息

### 3. 配置缺失

当默认配置不完整且没有 session 时：

- 保持当前空状态
- 文案从泛化“没有进行中的游戏”升级成更明确提示，例如“当前还没有进行中的游戏，也没有可用于自动开局的默认配置。”

### 4. 启动成功

成功后不需要额外 UI 分支：

- `currentSession` 更新
- 现有只读场景绑定自然切到真实首帧

## 测试策略

### 1. 纯函数测试

新增 focused tests 覆盖：

- 单模型默认配置完整时返回正确 payload
- 双模型开启但缺少 logic model 时返回 `null`
- 缺少 provider/profile/story 任一关键字段时返回 `null`

### 2. sessionStore 测试

覆盖：

- 可启动配置会调用现有 `startNewGame()` 并写入启动状态
- engine 成功时状态从 `starting` 回到 `idle`
- engine 失败时写入 `error` 和错误消息
- 配置不完整时不会调用 `createNewSession`

### 3. renderer 启动边界测试

覆盖：

- `index.ts` 在无 session 且配置完整时触发自动开局
- 已有 session 时不重复开局
- 配置不完整时不触发开局

### 4. App 渲染测试

覆盖：

- `starting` 状态时显示启动中文案
- `error` 状态时显示失败文案
- `idle + null session` 时显示配置缺失空状态

## 风险与处理

### 风险 1：renderer 每次重渲染都重复开局

处理：

- 自动开局只放在启动边界执行一次
- 加上 `currentSession` 与 `bootstrapState` 双重条件保护

### 风险 2：配置缺失与网络失败被混为一谈

处理：

- 配置缺失走静态空状态
- 只有真实请求失败才进入 `error`

### 风险 3：App 逻辑继续膨胀

处理：

- 启动副作用不放进 `App`
- `App` 只根据 `sessionStore` 当前状态渲染文本

## 成功标准

完成后，以下条件全部成立：

- 默认配置完整时，打开应用可自动进入真实首帧
- 默认配置不完整时，不会错误发请求，保留可理解空状态
- 自动开局失败时，界面显示明确错误而不是白屏或静默失败
- 全部相关测试通过
- renderer build 和 dev 启动验证通过
