# 独立宿主 Adapter 映射

## 目的

这份文档把 `SillyTavern`、`JS-Slash-Runner`、`lolocard` 之间当前真实存在的宿主依赖拆成明确的 adapter 域，方便后续把基于酒馆运行的内容迁移到独立应用，而不是继续直接绑定 `SillyTavern` 页面和全局对象。

相关仓库：

- `/root/lologames/SillyTavern`
- `/root/lologames/JS-Slash-Runner`
- `/root/lologames/lolocard`

## 结论先看

- `lolocard` 并没有直接依赖一个清晰的 npm 包 API，它依赖的是“由 `JS-Slash-Runner` 注入到 iframe 和全局环境里的 Tavern Helper 运行时”。
- 所以后续最重要的工作不是先改 `lolocard`，而是先造一个新的宿主 adapter，让它继续看到近似的全局能力。
- 真正最难迁移的不是变量、世界书这类数据接口，而是聊天消息渲染、流式 UI、slash 按钮和宿主 DOM 挂载点。

## 当前依赖链

### SillyTavern 提供的底层能力

- 事件与聊天状态：`/root/lologames/SillyTavern/public/script.js`
- 事件定义：`/root/lologames/SillyTavern/public/scripts/events.js`
- 世界书：`/root/lologames/SillyTavern/public/scripts/world-info.js`
- slash 系统：`/root/lologames/SillyTavern/public/scripts/slash-commands.js`
- preset / regex / markdown / request headers 等前端能力：散布在 `public/scripts/`
- 后端接口：`/root/lologames/SillyTavern/src/endpoints/`

### JS-Slash-Runner 做的中间层工作

- 在 ST 页面中挂载 Vue 面板：`/root/lologames/JS-Slash-Runner/src/index.ts`
- 读取 ST 模块、状态、DOM、接口并封装成 `TavernHelper`：`/root/lologames/JS-Slash-Runner/src/function/index.ts`
- 直接接入 ST 的主要适配文件：`/root/lologames/JS-Slash-Runner/src/util/tavern.ts`
- 把一批全局对象与 helper 注入 iframe：`/root/lologames/JS-Slash-Runner/src/iframe/predefine.js`

### lolocard 实际依赖的东西

- ambient 全局函数与类型：`/root/lologames/lolocard/@types/function/*.d.ts`
- `TavernHelper` / iframe helper / `SillyTavern` 兼容对象
- 事件总线、变量系统、世界书、聊天消息接口、slash 执行、script button、popup、流式消息 UI 挂载点

## Adapter 域拆分

## 1. Runtime Bridge

### 作用

负责给 iframe 和脚本提供当前酒馆运行时拥有的全局对象与上下文。

### 现有关键文件

- `/root/lologames/JS-Slash-Runner/src/iframe/predefine.js`
- `/root/lologames/JS-Slash-Runner/src/iframe/parent_jquery.js`
- `/root/lologames/JS-Slash-Runner/src/function/util.ts`
- `/root/lologames/JS-Slash-Runner/src/third_party_object.ts`
- `/root/lologames/lolocard/@types/function/index.d.ts`
- `/root/lologames/lolocard/@types/iframe/exported.sillytavern.d.ts`

### 当前形态

- 在 iframe 中暴露 `TavernHelper`
- 暴露 `SillyTavern`
- 暴露 `$`、`_`、`toastr`、`YAML`、`z` 等运行时对象
- 暴露 script id、iframe name、message id 等上下文

### 迁移判断

- `需要薄适配`

### 建议宿主接口

```ts
interface HostRuntimeBridge {
  exposeGlobals(targetWindow: Window, ctx: RuntimeContext): void;
  getIframeName(win: Window): string;
  getScriptId(win: Window): string;
  getCurrentMessageId(win: Window): number;
}
```

## 2. Events 与 Global Registry

### 作用

为脚本提供统一的事件订阅、事件发射和全局对象初始化等待机制。

### 现有关键文件

- `/root/lologames/JS-Slash-Runner/src/function/event.ts`
- `/root/lologames/JS-Slash-Runner/src/function/global.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/index.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/store.ts`
- `/root/lologames/lolocard/util/streaming.ts`

### 现有依赖特征

- `eventOn(...)`
- `eventEmit(...)`
- `eventMakeFirst(...)`
- `initializeGlobal(...)`
- `waitGlobalInitialized('Mvu')`

### 迁移判断

- `需要薄适配`

### 建议宿主接口

```ts
interface HostEventBus {
  on(event: string, listener: (...args: any[]) => any): () => void;
  once(event: string, listener: (...args: any[]) => any): () => void;
  makeFirst(event: string, listener: (...args: any[]) => any): () => void;
  makeLast(event: string, listener: (...args: any[]) => any): () => void;
  emit(event: string, ...args: any[]): Promise<void>;
}

interface HostGlobalRegistry {
  initializeGlobal(name: string, value: any): void;
  waitGlobalInitialized<T>(name: string): Promise<T>;
}
```

## 3. Variables

### 作用

承载 chat / character / preset / global / message 等多作用域变量，以及 MVU 状态写入。

### 现有关键文件

- `/root/lologames/JS-Slash-Runner/src/function/variables.ts`
- `/root/lologames/JS-Slash-Runner/src/store/settings/global.ts`
- `/root/lologames/JS-Slash-Runner/src/store/settings/chat.ts`
- `/root/lologames/JS-Slash-Runner/src/store/settings/character.ts`
- `/root/lologames/JS-Slash-Runner/src/store/settings/preset.ts`
- `/root/lologames/lolocard/src/变量管理器/store.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/store.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/misc/变量结构.ts`

### 真实调用证据

- `store.ts` 通过 `getWorldbook(...)` 解析设置项，再 `insertOrAssignVariables(..., { type: 'chat' })` 写回 chat 变量：
  - `/root/lologames/lolocard/src/日记络络/脚本/store.ts`
- `强制galgame界面.ts` 通过 `updateVariablesWith(...)` 修改 `stat_data.世界.下一回合界面选择`：
  - `/root/lologames/lolocard/src/日记络络/脚本/misc/强制galgame界面.ts`

### 迁移判断

- `需要薄适配`

### 建议宿主接口

```ts
interface HostVariableStore {
  get(scope: VariableScope): Record<string, any>;
  replace(scope: VariableScope, value: Record<string, any>): void;
  update(scope: VariableScope, updater: (value: Record<string, any>) => any): any;
  registerSchema(scope: SchemaScope, schema: any): void;
}
```

## 4. Worldbook / Lorebook

### 作用

提供世界书的读取、替换、创建、角色绑定和聊天绑定。

### 现有关键文件

- `/root/lologames/JS-Slash-Runner/src/function/worldbook.ts`
- `/root/lologames/JS-Slash-Runner/src/function/lorebook.ts`
- `/root/lologames/JS-Slash-Runner/src/function/lorebook_entry.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/index.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/store.ts`

### 真实调用证据

- `index.ts` 启动时等待当前角色世界书主绑定可用：
  - `/root/lologames/lolocard/src/日记络络/脚本/index.ts`
- `store.ts` 每次 worldbook 更新时重载配置：
  - `/root/lologames/lolocard/src/日记络络/脚本/store.ts`

### 迁移判断

- `需要薄适配`

### 建议宿主接口

```ts
interface HostWorldbookStore {
  listNames(): string[];
  get(name: string): Promise<WorldbookEntry[]>;
  replace(name: string, entries: Partial<WorldbookEntry>[]): Promise<void>;
  create(name: string, entries?: Partial<WorldbookEntry>[]): Promise<boolean>;
  delete(name: string): Promise<boolean>;
  getCharBindings(character: 'current' | string): CharWorldbooks;
  setCharBindings(character: 'current', bindings: CharWorldbooks): Promise<void>;
  getChatBinding(chat: 'current'): string | null;
  setChatBinding(chat: 'current', worldbook: string): Promise<void>;
}
```

## 5. Chat 与 Displayed Message

### 作用

这是最难的一层，既涉及原始消息数据，也涉及 ST 的 `.mes` / `.mes_text` DOM 结构和楼层重渲染。

### 现有关键文件

- `/root/lologames/JS-Slash-Runner/src/function/chat_message.ts`
- `/root/lologames/JS-Slash-Runner/src/function/displayed_message.ts`
- `/root/lologames/lolocard/util/streaming.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/选择框/index.ts`
- `/root/lologames/lolocard/src/日记络络/界面/介绍页/App.vue`

### 真实调用证据

- `mountStreamingMessages(...)` 会：
  - 遍历 `#chat > .mes`
  - 隐藏 `.mes_text`
  - 在下方插入 iframe 或 div
  - 监听 `CHARACTER_MESSAGE_RENDERED`、`STREAM_TOKEN_RECEIVED`、`MESSAGE_EDITED`
  - 文件：`/root/lologames/lolocard/util/streaming.ts`

这意味着现在的前端玩法不是只要“拿到消息文本”就够了，它是在重写楼层渲染。

### 迁移判断

- `需要重写量较大的适配`

### 建议宿主接口

```ts
interface HostChatStore {
  getMessages(range: string | number, opts?: GetChatMessagesOption): ChatMessageLike[];
  setMessages(messages: PartialChatMessagePatch[], opts?: { refresh?: 'none' | 'affected' | 'all' }): Promise<void>;
  createMessages(messages: ChatMessageCreate[], opts?: CreateChatMessagesOption): Promise<void>;
  deleteMessages(ids: number[], opts?: { refresh?: 'none' | 'affected' | 'all' }): Promise<void>;
  rotateMessages(begin: number, middle: number, end: number): Promise<void>;
  retrieveDisplayedMessage(messageId: number): JQuery;
  formatDisplayedMessage(text: string, opts?: { message_id?: 'last' | 'last_user' | 'last_char' | number }): string;
  refreshDisplayedMessage(messageId: number, node?: JQuery): Promise<void>;
  getLastMessageId(): number;
}
```

## 6. Slash Commands 与 Script Buttons

### 作用

承接 slash 执行、扩展命令注册、按钮触发和脚本按钮列表维护。

### 现有关键文件

- `/root/lologames/JS-Slash-Runner/src/function/slash.ts`
- `/root/lologames/JS-Slash-Runner/src/function/script.ts`
- `/root/lologames/JS-Slash-Runner/src/slash_command/index.ts`
- `/root/lologames/JS-Slash-Runner/src/slash_command/audio.ts`
- `/root/lologames/JS-Slash-Runner/src/slash_command/event.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/misc/按钮.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/选择框/App.vue`
- `/root/lologames/lolocard/src/日记络络/脚本/galgame/components/ChoiceBox.vue`

### 迁移判断

- `需要重写量较大的适配`

### 建议宿主接口

```ts
interface HostSlashService {
  execute(command: string): Promise<string>;
  registerCommand?(command: HostSlashCommand): void;
}

interface HostScriptRuntime {
  getButtons(scriptId: string): ScriptButton[];
  replaceButtons(scriptId: string, buttons: ScriptButton[]): void;
  getButtonEvent(scriptId: string, buttonName: string): string;
  getScriptInfo(scriptId: string): { name: string; info: string };
  replaceScriptInfo(scriptId: string, info: string): void;
}
```

## 7. Generation

### 作用

承接模型生成、原始生成、模型列表查询、停止生成等功能。

### 现有关键文件

- `/root/lologames/JS-Slash-Runner/src/function/generate/index.ts`
- `/root/lologames/JS-Slash-Runner/src/function/generate/responseGenerator.ts`
- `/root/lologames/JS-Slash-Runner/src/function/inject.ts`
- `/root/lologames/SillyTavern/src/endpoints/backends/`

### 迁移判断

- `需要重写量较大的适配`

### 说明

这层最终仍然建议复用 SillyTavern 后端，但前端调用方式不必继续沿用 ST 当前页面逻辑。

### 建议宿主接口

```ts
interface HostGenerationService {
  generate(config: GenerateConfig): Promise<any>;
  generateRaw(config: GenerateRawConfig): Promise<any>;
  getModelList(customApi: { apiurl: string; key?: string }): Promise<string[]>;
  stopById(id: string): boolean;
  stopAll(): boolean;
}
```

## 8. Persistence 与 Backend I/O

### 作用

统一处理版本读取、扩展配置、角色扩展字段、preset 持久化、导入导出和部分本地存储。

### 现有关键文件

- `/root/lologames/JS-Slash-Runner/src/util/tavern.ts`
- `/root/lologames/JS-Slash-Runner/src/function/extension.ts`
- `/root/lologames/JS-Slash-Runner/src/function/import_raw.ts`
- `/root/lologames/JS-Slash-Runner/src/function/version.ts`
- `/root/lologames/JS-Slash-Runner/src/store/settings/*.ts`
- `/root/lologames/lolocard/src/变量管理器/store.ts`

### 真实调用证据

- `util/tavern.ts` 直接读取 `/version`：`/root/lologames/JS-Slash-Runner/src/util/tavern.ts:22`
- 同文件还直接 POST `/api/characters/edit` 保存 extension field：`/root/lologames/JS-Slash-Runner/src/util/tavern.ts:187`

### 迁移判断

- `需要薄适配`

## 9. UI Shell 与 Host DOM Slots

### 作用

负责挂载扩展面板、消息 iframe、脚本 iframe、样式 teleport 和 popup。

### 现有关键文件

- `/root/lologames/JS-Slash-Runner/src/index.ts`
- `/root/lologames/JS-Slash-Runner/src/panel/render/Iframe.vue`
- `/root/lologames/JS-Slash-Runner/src/panel/script/Iframe.vue`
- `/root/lologames/JS-Slash-Runner/src/panel/render/iframe.ts`
- `/root/lologames/lolocard/util/script.ts`
- `/root/lologames/lolocard/util/streaming.ts`
- `/root/lologames/lolocard/src/变量管理器/panel.ts`

### 真实调用证据

- `JS-Slash-Runner` 启动时直接把面板挂到 `#extensions_settings`：
  - `/root/lologames/JS-Slash-Runner/src/index.ts`
- `lolocard` 的流式楼层系统要求宿主可在每条消息下方插入 iframe 或 div：
  - `/root/lologames/lolocard/util/streaming.ts`

### 迁移判断

- `需要重写量较大的适配`

### 建议宿主接口

```ts
interface HostUiShell {
  mountExtensionPanel(slot: string, el: HTMLElement): void;
  createScriptIframe(attrs: { id: string; name: string; srcdoc: string }): HTMLIFrameElement;
  createMessageIframe(attrs: { id: string; name: string; srcdoc: string }): HTMLIFrameElement;
  createHostDiv(scriptId: string): HTMLDivElement;
  teleportStyles(fromDoc: Document, toHead: HTMLElement): () => void;
  popup(content: Element | string, opts: PopupOptions): Promise<any>;
}
```

## 10. Assets

### 作用

管理背景、立绘、CG、卡面、头像等资源的路径解析与预载。

### 现有关键文件

- `/root/lologames/lolocard/src/日记络络/image.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/misc/资源预载.ts`

### 迁移判断

- `可基本直接复用`

### 注意点

- 需要把现有远程或仓库相对路径改成独立应用自己的资源基址。

## 迁移优先级

### 第一优先级

- Runtime Bridge
- Events / Global Registry
- Variables
- Worldbook

原因：这些接口一旦成立，`lolocard` 的大部分脚本至少能启动，不必先动所有内容文件。

### 第二优先级

- Chat / Displayed Message
- UI Shell

原因：这是 `galgame`、流式楼层渲染、选择框等玩法真正落地的关键。

### 第三优先级

- Slash Commands
- Script Buttons
- Generation

原因：这些对完整体验很重要，但不一定是让 `日记络络` 第一阶段跑起来的最早阻塞点。

## 推荐的第一轮落地策略

1. 在新宿主里先保留 `window.TavernHelper`、`window.SillyTavern` 和若干 iframe helper 名字不变。
2. 先让这些名字背后接的是新 adapter，而不是 ST 原环境。
3. 第一轮不要大改 `lolocard` 调用点，先以兼容为主。
4. 等 `日记络络` 最小链路跑通后，再考虑把全局 helper 逐步收口成显式模块依赖。

## 当前判断

如果后续目标是“尽可能复用现有代码并独立运行”，最务实的做法是：

- 把 `SillyTavern` 当后端与参考实现。
- 把 `JS-Slash-Runner` 当宿主前端 runtime 的基础。
- 把 `lolocard` 当内容包与玩法包。
- 在三者之间先补齐 adapter，而不是先重写内容本身。
