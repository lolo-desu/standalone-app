# 日记络络 引用链地图

## 目的

这份文档专门拆 `lolocard` 中 `日记络络` 的 `index.yaml`，把它和第一条消息、世界书、脚本、界面、美化和素材之间的引用关系整理出来，方便后续迁移时知道哪些是内容、哪些是运行时、哪些要单独补 adapter。

核心入口：

- `/root/lologames/lolocard/src/日记络络/index.yaml`

## 总体判断

- `index.yaml` 不是普通角色卡配置，而是整个 `日记络络` 内容系统的总装配文件。
- 它同时控制：
  - 开场消息来源
  - 世界书条目分组
  - 输出格式约束
  - UI 标签约定
  - 展示层正则替换
  - Tavern Helper 脚本入口
- 所以后续迁移时，不能只把它当成一张卡导进去，而要把它视为“内容包 manifest”。

## 一、`index.yaml` 顶层结构

### 1. 元信息

- `头像`
- `版本`
- `作者`
- `备注`

关联资源：

- `/root/lologames/lolocard/src/日记络络/头像.png`

### 2. 第一条消息

直接引用：

- `/root/lologames/lolocard/src/日记络络/第一条消息/0.txt`
- `/root/lologames/lolocard/src/日记络络/第一条消息/1_normal.txt`
- `/root/lologames/lolocard/src/日记络络/第一条消息/2_normal.txt`
- `/root/lologames/lolocard/src/日记络络/第一条消息/3_normal.txt`
- `/root/lologames/lolocard/src/日记络络/第一条消息/4_normal.txt`

间接相关但非常重要：

- `/root/lologames/lolocard/src/日记络络/第一条消息/1_galgame.txt`
- `/root/lologames/lolocard/src/日记络络/第一条消息/2_galgame.txt`
- `/root/lologames/lolocard/src/日记络络/第一条消息/3_galgame.txt`
- `/root/lologames/lolocard/src/日记络络/第一条消息/4_galgame.txt`

切换逻辑：

- `/root/lologames/lolocard/src/日记络络/脚本/misc/强制galgame界面.ts`

这说明：

- `index.yaml` 里登记的是 normal 开场集合。
- 真正是否切到 galgame 开场，是运行时脚本根据配置动态替换 `swipes`。

### 3. 角色描述

- 当前为空。

含义：

- `日记络络` 的核心行为并不依赖角色描述块，而主要靠世界书和脚本驱动。

### 4. 锚点

- 提供一个占位 entry 模板，用于 `===开始===` / `===结束===` 这类结构化分段。

### 5. 世界书名称 与 条目

世界书名称：

- `上锁的日记本`

这部分是核心内容组织区，把世界书分成多个逻辑域。

## 二、世界书分组与职责

## 1. 设置

配置项：

- 主角性别
- 样式主题
- 选择框触发方式
- 始终使用galgame界面

这些条目主要不是给模型看的正文内容，而是作为“可开关配置”存在。

运行时消费文件：

- `/root/lologames/lolocard/src/日记络络/脚本/store.ts`

`store.ts` 的逻辑是：

- 读取当前世界书条目是否启用。
- 转成 config。
- 写入 chat 变量。
- 监听 `WORLDINFO_UPDATED` 和 `CHAT_CHANGED` 自动刷新。

这说明设置组本质上是“用世界书 entry 状态来承载配置”。

## 2. 可选项

引用文件：

- `/root/lologames/lolocard/src/日记络络/世界书/可选项/常见错误修正.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/可选项/对话驱动的轻松文风.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/可选项/角色神态和感官场景要求.yaml`

职责：

- 文风约束
- 表达修正
- 感官与神态表现要求

性质：

- 这部分基本属于纯 prompt 内容，可迁移性高。

## 3. 变量

引用文件：

- `/root/lologames/lolocard/src/日记络络/世界书/变量/initvar.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/变量/变量更新规则.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/变量/变量输出格式.yaml`
- `/root/lologames/lolocard/初始模板/角色卡/新建为src文件夹中的文件夹/世界书/变量/变量列表.txt`

相关 schema：

- `/root/lologames/lolocard/src/日记络络/schema.ts`
- `/root/lologames/lolocard/src/日记络络/schema.json`

职责：

- 初始化状态
- 定义 AI 如何输出变量更新
- 定义变量展示格式

特别注意：

- `变量列表` 目前不是本地 card 目录内文件，而是指向 `初始模板` 里的一个模板文件。
- 迁移时这条外部引用最好改成本地化资源，否则内容包不闭合。

## 4. 选择框

引用文件：

- `/root/lologames/lolocard/src/日记络络/世界书/选择框/选择框.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/选择框/选择框强调.yaml`

职责：

- 规定模型如何输出 `<roleplay_options>`
- 指定选择框在提示词链路中的插入位置

运行时前端承接：

- `/root/lologames/lolocard/src/日记络络/脚本/选择框/index.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/选择框/App.vue`

## 5. 事件系统

引用文件：

- `/root/lologames/lolocard/src/日记络络/世界书/事件系统/主线事件系统.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/事件系统/主线大纲强调.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/事件系统/时间阶段事件系统.yaml`

职责：

- 主线推进
- 主线大纲约束
- 时间阶段控制

这部分是故事系统骨架，内容上可迁移，运行上依赖变量系统和 prompt 解释能力。

## 6. 特殊界面

引用文件：

- `/root/lologames/lolocard/src/日记络络/世界书/特殊界面/随机触发CG.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/特殊界面/下一回合界面选择.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/特殊界面/下一回合界面选择强调.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/特殊界面/文件-背景.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/特殊界面/文件-立绘.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/特殊界面/文件-关键CG.yaml`

职责：

- 定义何时使用日记界面、galgame 界面、普通文本界面
- 定义可用背景、立绘、关键 CG 名称清单
- 驱动 `<sprite>`、`<diary>`、`<galgame>` 相关输出约定

强相关前端：

- `/root/lologames/lolocard/src/日记络络/脚本/galgame/`
- `/root/lologames/lolocard/src/日记络络/美化/背景与立绘/`
- `/root/lologames/lolocard/src/日记络络/美化/日记/`

## 7. 角色

引用文件：

- `/root/lologames/lolocard/src/日记络络/世界书/角色/角色详情.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/角色/角色阶段.yaml`

职责：

- 角色背景
- 角色阶段变化

性质：

- 可基本视为纯内容资源。

## 8. 其它独立条目

引用文件：

- `/root/lologames/lolocard/src/日记络络/世界书/线上聊天气泡.yaml`
- `/root/lologames/lolocard/src/日记络络/世界书/语法规则.yaml`

职责：

- 聊天气泡表现
- 输出语法规则

## 三、脚本链路

## 1. 运行时脚本入口

- `index.yaml` 里的酒馆助手脚本库指向：
  - `https://testingcf.jsdelivr.net/gh/lolo-desu/lolocard/dist/日记络络/脚本/index.js`

源码入口：

- `/root/lologames/lolocard/src/日记络络/脚本/index.ts`

### 启动流程

`脚本/index.ts` 会：

1. 检查最低版本。
2. 等待当前角色主世界书绑定存在。
3. 等待 `Mvu` 初始化完成。
4. 等待配置 store 初始化完成。
5. 初始化以下子系统：
   - `galgame`
   - 强制 galgame 界面
   - 按钮
   - 样式加载
   - 资源预载
   - 选择框

涉及文件：

- `/root/lologames/lolocard/src/日记络络/脚本/index.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/store.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/misc/mvu.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/misc/强制galgame界面.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/misc/按钮.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/misc/样式加载.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/misc/资源预载.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/选择框/index.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/galgame/index.ts`

## 2. 配置同步

关键文件：

- `/root/lologames/lolocard/src/日记络络/脚本/store.ts`

职责：

- 从世界书 entry 启用状态读取配置。
- 生成：
  - 主角性别
  - 样式主题
  - 选择框触发方式
  - 始终使用galgame界面
- 写回 chat 变量。

说明：

- 这意味着 `日记络络` 的很多运行时行为并不直接从本地 config 文件读取，而是从世界书 UI 状态读取。

## 3. 强制 galgame 开场切换

关键文件：

- `/root/lologames/lolocard/src/日记络络/脚本/misc/强制galgame界面.ts`

职责：

- 监听 `Mvu.events.VARIABLE_UPDATE_ENDED`
- 监听 `GENERATION_STARTED`
- 维持 `stat_data.世界.下一回合界面选择 = 'galgame'`
- 在聊天刚开始时把开场 `swipes` 从 normal 替换为 galgame 版本

说明：

- 开场模式切换是运行时行为，不是静态内容差异。

## 四、前端界面链路

## 1. 介绍页

源码：

- `/root/lologames/lolocard/src/日记络络/界面/介绍页/index.ts`
- `/root/lologames/lolocard/src/日记络络/界面/介绍页/App.vue`

构建产物：

- `/root/lologames/lolocard/dist/日记络络/界面/介绍页/index.html`

触发方式：

- `index.yaml` 正则规则把 `【【lolodesu】】` 哨兵替换成介绍页 iframe/页面入口。

## 2. galgame 界面

关键源码：

- `/root/lologames/lolocard/src/日记络络/脚本/galgame/index.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/galgame/store.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/galgame/App.vue`
- `/root/lologames/lolocard/src/日记络络/脚本/galgame/components/SceneStage.vue`
- `/root/lologames/lolocard/src/日记络络/脚本/galgame/components/DialogBox.vue`
- `/root/lologames/lolocard/src/日记络络/脚本/galgame/components/ChoiceBox.vue`
- `/root/lologames/lolocard/src/日记络络/脚本/galgame/components/ControlBar.vue`
- `/root/lologames/lolocard/src/日记络络/脚本/galgame/components/HistoryPanel.vue`

职责：

- 在消息楼层里渲染流式 galgame 场景
- 展示背景、立绘、对白、历史、选择项

## 3. 选择框界面

关键源码：

- `/root/lologames/lolocard/src/日记络络/脚本/选择框/index.ts`
- `/root/lologames/lolocard/src/日记络络/脚本/选择框/App.vue`

职责：

- 把 `<roleplay_options>` 输出变成可点击交互

## 4. 流式消息宿主

关键基础设施：

- `/root/lologames/lolocard/util/streaming.ts`

它会：

- 扫描 `#chat > .mes`
- 隐藏 `.mes_text`
- 插入 iframe 或 div 宿主
- 在消息编辑、删除、流式 token 到达、重新渲染时同步更新

这说明独立应用如果想复用现有玩法，必须给出一个“消息楼层可替换渲染”的宿主能力。

## 五、美化链路

## 1. 聊天气泡

源码：

- `/root/lologames/lolocard/src/日记络络/美化/聊天气泡/亮色.html`
- `/root/lologames/lolocard/src/日记络络/美化/聊天气泡/暗色.html`
- `/root/lologames/lolocard/src/日记络络/美化/聊天气泡/代码块化.txt`

## 2. 背景与立绘

源码：

- `/root/lologames/lolocard/src/日记络络/美化/背景与立绘/index.html`
- `/root/lologames/lolocard/src/日记络络/美化/背景与立绘/index.css`

## 3. 日记界面

源码：

- `/root/lologames/lolocard/src/日记络络/美化/日记/index.html`
- `/root/lologames/lolocard/src/日记络络/美化/日记/index.css`

### 说明

- 这些文件和 `index.yaml` 中的正则替换一起构成最终展示效果。
- 源码和 `index.yaml` 中的内联展示逻辑有分散，不是所有显示逻辑都只在一个位置维护。

## 六、素材链路

核心资源：

- `/root/lologames/lolocard/src/日记络络/头像.png`
- `/root/lologames/lolocard/src/日记络络/白化蓝染的日记本.png`
- `/root/lologames/lolocard/src/日记络络/图片/`
- `/root/lologames/lolocard/src/日记络络/image.ts`

重要目录：

- `/root/lologames/lolocard/src/日记络络/图片/背景/`
- `/root/lologames/lolocard/src/日记络络/图片/背景/CG/`
- `/root/lologames/lolocard/src/日记络络/图片/立绘/`
- `/root/lologames/lolocard/src/日记络络/图片/立绘/水手服/`
- `/root/lologames/lolocard/src/日记络络/图片/立绘/格纹衫/`
- `/root/lologames/lolocard/src/日记络络/图片/立绘/睡衣/`
- `/root/lologames/lolocard/src/日记络络/图片/立绘/开衫/`

说明：

- `image.ts` 是迁移时最关键的资源映射入口之一。

## 七、关键标签与模板语法

核心标签：

- `<UpdateVariable>...</UpdateVariable>`
- `<initvar>...</initvar>`
- `<message>...</message>`
- `<roleplay_options>...</roleplay_options>`
- `<sprite>...</sprite>`
- `<diary>...</diary>`
- `<galgame>...</galgame>`
- `<plot_hint>...</plot_hint>`
- `<interface_analysis>...</interface_analysis>`

核心模板语法：

- `getvar('...')`
- `<%= ... %>`
- `<%_ ... _%>`
- `# :@@if ...`
- `{{format_message_variable::...}}`
- `{{format_message_variable:...}}`
- `${...}`
- `$(...)`

这些语法分别对应：

- 变量分支
- EJS 风格模板逻辑
- 消息变量格式化
- 选项生成与内容拼接

说明：

- 后续迁移如果不保留或重做这套模板解释能力，单独迁 prompt 内容会失效。

## 八、哪些是内容，哪些是运行时

## 基本可视为内容资源

- `世界书/角色/*.yaml`
- `世界书/事件系统/*.yaml`
- `世界书/可选项/*.yaml`
- `世界书/选择框/*.yaml`
- `世界书/特殊界面/*.yaml`
- `第一条消息/*.txt`
- `图片/**`

## 明显需要 adapter 支撑的部分

- 世界书 entry 状态转 config：`脚本/store.ts`
- MVU 变量更新协议：`schema.ts`、`变量更新规则.yaml`
- 正则展示链路：`index.yaml` 的正则块
- 标签到 UI 的映射：`<roleplay_options>`、`<sprite>`、`<diary>`、`<galgame>`
- 资源路径解析：`image.ts`

## 大概率要重实现宿主承载方式的部分

- 流式 galgame 楼层渲染：`脚本/galgame/`
- 流式选择框楼层渲染：`脚本/选择框/`
- script button 体系：`脚本/misc/按钮.ts`
- 介绍页嵌入与 popup 行为

## 九、当前发现的迁移风险

### 1. 变量列表引用不闭合

- `index.yaml` 的 `变量列表` 指向模板目录：
  - `/root/lologames/lolocard/初始模板/角色卡/新建为src文件夹中的文件夹/世界书/变量/变量列表.txt`

这意味着当前 `日记络络` 内容包并非完全自洽。

### 2. source of truth 分散

- 一部分展示逻辑在 `index.yaml` 正则里
- 一部分展示逻辑在 `美化/` 下
- 介绍页依赖 `dist/` 产物
- 玩法 UI 依赖 `脚本/` 下的 Vue 运行时

迁移时需要先统一“展示层来源”。

### 3. 特定值可能与 schema 不一致

- 已发现第一条消息中存在 `下一回合界面选择: galgameSFW` 的痕迹，而 `schema.ts` 的 enum 是：
  - `纯文字尾附立绘`
  - `展示日记`
  - `galgame`

这类值漂移需要后续专门核对。

## 十、后续最值得优先精读的文件

1. `/root/lologames/lolocard/src/日记络络/脚本/index.ts`
2. `/root/lologames/lolocard/src/日记络络/脚本/store.ts`
3. `/root/lologames/lolocard/src/日记络络/脚本/misc/强制galgame界面.ts`
4. `/root/lologames/lolocard/src/日记络络/脚本/galgame/store.ts`
5. `/root/lologames/lolocard/src/日记络络/脚本/galgame/App.vue`
6. `/root/lologames/lolocard/src/日记络络/脚本/选择框/index.ts`
7. `/root/lologames/lolocard/src/日记络络/schema.ts`
8. `/root/lologames/lolocard/src/日记络络/世界书/特殊界面/下一回合界面选择.yaml`
9. `/root/lologames/lolocard/src/日记络络/世界书/变量/变量输出格式.yaml`
10. `/root/lologames/lolocard/src/日记络络/image.ts`

## 当前判断

`日记络络` 迁移时最合适的看法是：

- `index.yaml` 是内容包 manifest。
- `世界书 + 第一条消息 + 图片` 是内容层。
- `脚本/` 是玩法 runtime。
- `美化/` 和 `界面/` 是展示层。
- 真正的迁移难点不在故事文本本身，而在宿主是否能提供酒馆式变量、消息楼层和标签到 UI 的转换能力。
