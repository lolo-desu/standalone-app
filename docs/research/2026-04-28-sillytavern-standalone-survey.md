# SillyTavern 独立应用化调研

## 目标

本次调研的目标不是直接改造代码，而是先把三个上游仓库的职责、耦合点、可复用边界、素材位置和后续拆装顺序整理清楚，方便后续把基于 SillyTavern 运行的项目逐步改造成可独立运行的应用。

已拉取仓库：

- `/root/lologames/SillyTavern`
- `/root/lologames/JS-Slash-Runner`
- `/root/lologames/lolocard`

## 结论先看

- `SillyTavern` 最适合复用的是后端能力、角色卡解析、提示词与模型请求链路，以及一部分 slash/macro 核心；最不适合整体搬运的是现有前端壳。
- `JS-Slash-Runner` 最适合复用的是 Vue/TypeScript 面板、iframe 渲染执行机制、变量与脚本相关工具函数；它目前高度依赖 SillyTavern 的全局对象、DOM 和事件总线。
- `lolocard` 最适合复用的是 `日记络络` 的角色卡内容、世界书、脚本、galgame 渲染和美术素材；它同样默认运行在 Tavern Helper / SillyTavern 环境中。
- 如果目标是“独立应用”，推荐的方向不是直接把整个 SillyTavern UI 抽出来，而是保留 SillyTavern 后端与一部分运行时能力，自己重建宿主前端与适配层，再挂载 `JS-Slash-Runner` 和 `lolocard` 的可移植部分。

## 仓库角色总览

| 仓库 | 主要职责 | 运行形态 | 最值得复用 | 主要问题 |
| --- | --- | --- | --- | --- |
| `SillyTavern` | 聊天宿主、后端 API、角色卡/模型/文件系统 | Node.js + Express + 浏览器前端 | 后端、角色卡解析、模型接入链路 | 前端是大型 jQuery/静态 DOM 壳，耦合非常深 |
| `JS-Slash-Runner` | 酒馆助手扩展、脚本与渲染能力、Vue 设置面板 | 注入到 ST 页面中的前端扩展 | Vue 面板、iframe 渲染器、工具函数 | 强依赖 ST 全局变量、slash 系统、DOM 结构 |
| `lolocard` | 角色卡内容、世界书、脚本、galgame 素材与界面 | 构建后同步到酒馆角色卡/脚本环境 | 提示词、脚本、前端素材、galgame 界面 | 默认假设 Tavern Helper 已存在 |

## 许可证风险

- `SillyTavern` 使用 `AGPL-3.0`：`/root/lologames/SillyTavern/package.json`
- `JS-Slash-Runner` 使用 `AFPL`：`/root/lologames/JS-Slash-Runner/LICENSE`
- `lolocard` 使用 `AFPL`：`/root/lologames/lolocard/LICENSE`

这意味着后续如果做成独立应用，不能只考虑技术复用，还必须单独梳理许可证兼容性与分发方式。

## SillyTavern

### 技术栈与启动链路

- Node.js ESM，要求 `node >= 20`：`/root/lologames/SillyTavern/package.json`
- 后端入口：`/root/lologames/SillyTavern/server.js`
- 主服务初始化：`/root/lologames/SillyTavern/src/server-main.js`
- 实际路由装配与启动：`/root/lologames/SillyTavern/src/server-startup.js`
- 可选 Electron 包装：`/root/lologames/SillyTavern/src/electron/index.js`

启动过程大致是：

1. `server.js` 解析命令行与数据目录。
2. 设置 `globalThis.DATA_ROOT`。
3. 导入 `src/server-main.js`。
4. `server-main.js` 建立 Express、中间件、静态资源、鉴权、用户目录和 API。
5. 继续进入 `server-startup.js` 注册各类 endpoint。

### 前端形态

- 页面壳：`/root/lologames/SillyTavern/public/index.html`
- 主前端脚本：`/root/lologames/SillyTavern/public/script.js`
- 模板装载：`/root/lologames/SillyTavern/public/scripts/templates.js`
- 扩展上下文：`/root/lologames/SillyTavern/public/scripts/st-context.js`
- 扩展系统：`/root/lologames/SillyTavern/public/scripts/extensions.js`

前端并不是 Vue/React 单页应用，而是超大静态 HTML 壳 + jQuery/原生 ES module 组合。`public/script.js` 是中心调度文件，很多模块直接回引它，因此整体前端不适合“原样抽离后重组”。

### 最适合复用的部分

- 角色卡解析与校验
  - `/root/lologames/SillyTavern/src/character-card-parser.js`
  - `/root/lologames/SillyTavern/src/validator/TavernCardValidator.js`
  - `/root/lologames/SillyTavern/src/charx.js`
  - `/root/lologames/SillyTavern/src/byaf.js`
- 模型请求与提示词转换
  - `/root/lologames/SillyTavern/src/prompt-converters.js`
  - `/root/lologames/SillyTavern/src/endpoints/backends/chat-completions.js`
  - `/root/lologames/SillyTavern/src/endpoints/backends/text-completions.js`
- 图片元数据、分词、向量相关能力
  - `/root/lologames/SillyTavern/src/endpoints/image-metadata.js`
  - `/root/lologames/SillyTavern/src/endpoints/tokenizers.js`
  - `/root/lologames/SillyTavern/src/vectors/`
- slash / macro 的核心模型值得拆读，但不建议整套直接搬前端
  - `/root/lologames/SillyTavern/public/scripts/slash-commands.js`
  - `/root/lologames/SillyTavern/public/scripts/slash-commands/`
  - `/root/lologames/SillyTavern/public/scripts/macros/macro-system.js`

### 耦合最深、后续应避免直接搬运的部分

- 巨型页面壳：`/root/lologames/SillyTavern/public/index.html`
- 主前端总控：`/root/lologames/SillyTavern/public/script.js`
- 角色与聊天相关 endpoint 虽有参考价值，但大量绑定了 ST 用户目录结构和现有 API 约定
  - `/root/lologames/SillyTavern/src/endpoints/characters.js`
  - `/root/lologames/SillyTavern/src/users.js`

### 资源与数据位置

- 前端静态资源：
  - `/root/lologames/SillyTavern/public/css`
  - `/root/lologames/SillyTavern/public/img`
  - `/root/lologames/SillyTavern/public/sounds`
  - `/root/lologames/SillyTavern/public/webfonts`
- 默认内容：
  - `/root/lologames/SillyTavern/default/content`
  - `/root/lologames/SillyTavern/default/scaffold`
- 运行期用户内容主要依赖 `DATA_ROOT/<user>/...`，不是单纯放在 `public` 下。

### 对独立应用化的判断

- 保留 SillyTavern 后端是有价值的。
- 保留 SillyTavern 原前端壳的价值有限。
- 更合理的做法是把它当成“能力型后端”和“兼容层参考实现”，不是最终 UI。

## JS-Slash-Runner

### 技术栈与入口

- Vue 3 + TypeScript + Pinia + Vite：`/root/lologames/JS-Slash-Runner/package.json`
- 扩展清单：`/root/lologames/JS-Slash-Runner/manifest.json`
- 启动入口：`/root/lologames/JS-Slash-Runner/src/index.ts`
- 主面板：`/root/lologames/JS-Slash-Runner/src/Panel.vue`

入口逻辑很清晰：`src/index.ts` 在页面 ready 后注册 macros、swipe、全局 `TavernHelper` 对象、slash commands，然后把 Vue 面板挂到 SillyTavern 的 `#extensions_settings`。

### 最值得复用的部分

- Vue 面板与组件系统
  - `/root/lologames/JS-Slash-Runner/src/Panel.vue`
  - `/root/lologames/JS-Slash-Runner/src/panel/`
  - `/root/lologames/JS-Slash-Runner/src/panel/component/`
- iframe 渲染和脚本执行机制
  - `/root/lologames/JS-Slash-Runner/src/iframe/predefine.js`
  - `/root/lologames/JS-Slash-Runner/src/panel/render/iframe.ts`
  - `/root/lologames/JS-Slash-Runner/src/panel/script/iframe.ts`
  - `/root/lologames/JS-Slash-Runner/src/store/iframe_runtimes/`
- 工具函数与脚本运行入口
  - `/root/lologames/JS-Slash-Runner/src/function/`
  - `/root/lologames/JS-Slash-Runner/src/function/index.ts`
  - `/root/lologames/JS-Slash-Runner/src/function/slash.ts`
- ST 适配工具集中在一个位置，后续很适合被切成“兼容层”
  - `/root/lologames/JS-Slash-Runner/src/util/tavern.ts`

### 与 SillyTavern 的主要耦合点

- 直接依赖 `@sillytavern/...` 模块
- 直接挂载到现有 ST DOM：`#extensions_settings`
- 依赖 ST 事件总线与 settings 存储
- 依赖 slash parser、macro parser、character/chat/preset/worldbook API
- 大量使用 ST CSS 变量和类名

典型高耦合文件：

- `/root/lologames/JS-Slash-Runner/src/util/tavern.ts`
- `/root/lologames/JS-Slash-Runner/src/function/generate/index.ts`
- `/root/lologames/JS-Slash-Runner/src/function/character.ts`
- `/root/lologames/JS-Slash-Runner/src/function/preset.ts`
- `/root/lologames/JS-Slash-Runner/src/function/worldbook.ts`

### 对独立应用化的判断

- 这个仓库不适合“直接脱离 ST 后独立运行”。
- 但它很适合作为独立应用的前端运行时雏形：
  - Vue 设置/工具面板可以保留。
  - iframe 渲染器可以保留。
  - 泛用工具函数可以保留。
  - 与 ST 相关的调用改造成一层 adapter 即可。

### 对后续拆分的直接启发

建议把这里的代码先按三层理解：

1. 可移植核心：Vue 组件、iframe runtime、日志与状态模型。
2. ST 适配层：`util/tavern.ts` 与 `function/*` 中直接读取 ST 环境的代码。
3. 需要改写的宿主绑定：DOM 挂载点、slash 注册、settings 同步方式。

## lolocard

### 与本项目目标最相关的范围

核心目标是复用 `日记络络` 这套内容：

- 角色卡定义：`/root/lologames/lolocard/src/日记络络/index.yaml`
- 变量 schema：`/root/lologames/lolocard/src/日记络络/schema.ts`
- 脚本入口：`/root/lologames/lolocard/src/日记络络/脚本/index.ts`
- 世界书：`/root/lologames/lolocard/src/日记络络/世界书/`
- 第一条消息：`/root/lologames/lolocard/src/日记络络/第一条消息/`
- 界面：`/root/lologames/lolocard/src/日记络络/界面/`
- 美化：`/root/lologames/lolocard/src/日记络络/美化/`
- 图片与素材：`/root/lologames/lolocard/src/日记络络/图片/`
- 资源映射：`/root/lologames/lolocard/src/日记络络/image.ts`

### 内容结构

`index.yaml` 不是单纯的角色文本，而是这套内容系统的总装配文件：

- 定义第一条消息来源。
- 定义世界书条目组。
- 组织变量、事件系统、选择框、特殊界面、文风和角色状态。
- 通过文件引用把内容散布到 `世界书/` 下的多个子目录。

这说明 `日记络络` 本质上不是“单张角色卡”，而是一套完整的内容包和运行规则集。

### 最值得复用的部分

- 世界书与提示词内容
  - `/root/lologames/lolocard/src/日记络络/世界书/角色/`
  - `/root/lologames/lolocard/src/日记络络/世界书/变量/`
  - `/root/lologames/lolocard/src/日记络络/世界书/选择框/`
  - `/root/lologames/lolocard/src/日记络络/世界书/事件系统/`
  - `/root/lologames/lolocard/src/日记络络/世界书/特殊界面/`
  - `/root/lologames/lolocard/src/日记络络/世界书/可选项/`
- 变量结构定义
  - `/root/lologames/lolocard/src/日记络络/schema.ts`
- galgame 渲染相关脚本
  - `/root/lologames/lolocard/src/日记络络/脚本/galgame/`
  - `/root/lologames/lolocard/src/日记络络/脚本/选择框/`
- 美术资源与资源映射
  - `/root/lologames/lolocard/src/日记络络/图片/`
  - `/root/lologames/lolocard/src/日记络络/image.ts`
- 已构建产物可帮助理解运行结果
  - `/root/lologames/lolocard/dist/日记络络/`

### 与酒馆环境的主要耦合点

- 依赖 Tavern Helper / SillyTavern 提供的全局函数和变量体系。
- 第一条消息和世界书中存在大量酒馆模板语法、变量语法和自定义标签。
- 脚本入口 `src/日记络络/脚本/index.ts` 会等待 `Mvu`、世界书、配置等酒馆环境初始化完成后再工作。
- 构建后的内容通过 `tavern_sync.yaml` 和 `tavern_sync.mjs` 组织并同步为酒馆可识别格式。

关键文件：

- `/root/lologames/lolocard/tavern_sync.yaml`
- `/root/lologames/lolocard/tavern_sync.mjs`
- `/root/lologames/lolocard/util/streaming.ts`

### 对独立应用化的判断

- 美术素材、世界书内容、角色流程脚本都值得保留。
- 但现有内容格式默认运行在酒馆环境，所以需要提供兼容层：
  - 变量读写接口
  - slash 执行接口
  - 世界书装载接口
  - 消息流式更新接口
  - 前端渲染挂载点

换句话说，`lolocard` 更像“内容包 + 前端玩法模块”，不是独立宿主本身。

## 面向独立应用的建议拆层

### 1. 宿主后端层

优先保留 SillyTavern 后端能力，至少包括：

- 模型 provider 接入
- 提示词转换
- 角色卡导入导出
- 图片元数据与素材处理
- 用户数据与文件目录管理

这部分的主参考路径：

- `/root/lologames/SillyTavern/src/server-main.js`
- `/root/lologames/SillyTavern/src/server-startup.js`
- `/root/lologames/SillyTavern/src/endpoints/backends/`
- `/root/lologames/SillyTavern/src/endpoints/characters.js`

### 2. 兼容适配层

这是后续最关键的一层，目标是用最薄的一层接口模拟当前 ST/酒馆助手提供给内容包的能力：

- 变量接口
- slash 接口
- 世界书接口
- 聊天消息接口
- 事件总线
- 资源 URL 解析

最重要的参考实现：

- `/root/lologames/JS-Slash-Runner/src/util/tavern.ts`
- `/root/lologames/JS-Slash-Runner/src/function/index.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/index.ts`

### 3. 独立宿主前端层

这里不建议沿用 SillyTavern 的 `public/index.html + public/script.js` 巨型壳，而应以 `JS-Slash-Runner` 的 Vue 结构为基础搭新壳。

建议保留的基础：

- `/root/lologames/JS-Slash-Runner/src/Panel.vue`
- `/root/lologames/JS-Slash-Runner/src/panel/`
- `/root/lologames/JS-Slash-Runner/src/store/`
- `/root/lologames/JS-Slash-Runner/src/panel/render/`
- `/root/lologames/JS-Slash-Runner/src/panel/script/`

### 4. 内容与玩法层

把 `lolocard` 中的 `日记络络` 视为首个可移植内容包：

- 角色卡定义与世界书
- 第一条消息流程
- galgame 渲染
- 选择框与事件系统
- 美术资源与场景切换

### 5. 资源层

需要单独梳理并重建资源托管方式：

- `lolocard` 美术图包路径现在在 `src/日记络络/图片/`
- 部分脚本和界面依赖远程 URL 或酒馆扩展目录结构
- 独立应用需要稳定的本地资源基址和打包方案

## 建议的拆解顺序

### 第一阶段：先抽象接口，不动玩法

目标是把将来一定会用到的宿主能力定义出来。

建议先锁定以下接口：

- chat session
- variable store
- worldbook store
- slash executor
- event bus
- asset resolver
- streaming renderer hooks

### 第二阶段：让 JS-Slash-Runner 脱离 ST DOM 生存

优先处理：

- 自定义挂载点替代 `#extensions_settings`
- 把 `@sillytavern/...` 依赖集中封装
- 把 `util/tavern.ts` 切成独立 adapter

### 第三阶段：让 `日记络络` 跑在新 adapter 上

优先处理：

- `schema.ts` 对应的变量初始化
- `脚本/index.ts` 所依赖的全局函数补齐
- `galgame` 和 `选择框` 这两个最核心玩法模块
- `image.ts` 资源映射改成本地可控路径

### 第四阶段：再考虑是否继续借用 ST 原生前端能力

只有当某些能力在独立宿主内重写成本明显过高时，才继续回收 ST 前端里的某个局部子系统。默认不要反过来用 ST 原壳承载新应用。

## 当前建议的重点阅读顺序

### 第一批

- `/root/lologames/SillyTavern/server.js`
- `/root/lologames/SillyTavern/src/server-main.js`
- `/root/lologames/SillyTavern/src/endpoints/characters.js`
- `/root/lologames/JS-Slash-Runner/src/index.ts`
- `/root/lologames/JS-Slash-Runner/src/util/tavern.ts`
- `/root/lologames/lolocard/src/日记络络/index.yaml`
- `/root/lologames/lolocard/src/日记络络/脚本/index.ts`

### 第二批

- `/root/lologames/SillyTavern/public/scripts/slash-commands/`
- `/root/lologames/SillyTavern/public/scripts/macros/macro-system.js`
- `/root/lologames/JS-Slash-Runner/src/function/`
- `/root/lologames/JS-Slash-Runner/src/store/iframe_runtimes/`
- `/root/lologames/lolocard/src/日记络络/脚本/galgame/`
- `/root/lologames/lolocard/src/日记络络/脚本/选择框/`
- `/root/lologames/lolocard/src/日记络络/世界书/`

## 现阶段结论

如果目标是“完全复用美术素材，尽可能复用代码，并从 SillyTavern 运行态迁移到独立应用”，最现实的路线是：

- 复用 `SillyTavern` 后端和内容处理能力。
- 复用 `JS-Slash-Runner` 的前端 runtime 与工具函数框架。
- 复用 `lolocard` 的内容、脚本、素材和 galgame 表现层。
- 在三者之间新增一层独立宿主 adapter，而不是强行把原有 ST 页面整体搬出来。

这条路线改动量仍然很大，但边界是清楚的，也更适合逐步验证。
