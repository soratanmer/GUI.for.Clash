# 项目分析报告

## 1. 项目概览

| 项目属性 | 详情 |
|---------|------|
| **项目名称** | GUI.for.Clash |
| **当前版本** | v1.26.1 |
| **项目类型** | 跨平台桌面应用程序 |
| **核心用途** | 为 mihomo（原 Clash.Meta）代理内核提供图形化管理界面，支持配置管理、订阅管理、规则集管理、插件系统、系统代理设置等功能 |
| **支持平台** | Windows / macOS / Linux |
| **项目地址** | https://github.com/GUI-for-Cores |

---

## 2. 技术栈与依赖

### 2.1 后端（Go）

| 技术 | 版本/说明 |
|------|----------|
| **Go** | 1.26 |
| **Wails v2** | v2.13.0 — 桌面应用框架，将 Go 后端与 Web 前端结合 |
| **gopsutil** | v3.24.5 — 跨平台进程信息查询 |
| **geoip2-golang** | v1.13.0 — GeoIP/MMDB 数据库查询 |
| **systray** | energye/systray (fork) — 系统托盘图标管理 |
| **yaml.v3** | gopkg.in/yaml.v3 — YAML 配置解析 |
| **browser** | pkg/browser — 打开系统默认浏览器 |
| **golang.org/x/sys** | v0.47.0 — Windows API 调用 |

### 2.2 前端（TypeScript + Vue 3）

| 技术 | 版本/说明 |
|------|----------|
| **Vue 3** | v3.5.41 — 响应式 UI 框架（Composition API） |
| **Pinia** | v4.0.2 — 状态管理 |
| **Vue Router** | v5.2.0 — 路由管理 |
| **Vue I18n** | v11.4.8 — 国际化（中/英文 + 自定义语言包） |
| **CodeMirror 6** | 代码编辑器（YAML/JSON/JS 语法高亮与编辑） |
| **vue-draggable-plus** | v0.6.1 — 拖拽排序 |
| **Prism.js** | v1.30.0 — 代码语法高亮 |
| **marked** | v18.0.9 — Markdown 渲染 |
| **croner** | v10.0.1 — Cron 表达式解析（定时任务） |
| **yaml** | v2.9.0 — YAML 解析与序列化 |
| **Vite** | v8.2.0 — 构建工具 |
| **TypeScript** | v6.0.3 |
| **Less** | v4.8.1 — CSS 预处理器 |
| **oxlint / oxfmt** | 代码检查与格式化 |

### 2.3 构建工具链

| 工具 | 说明 |
|------|------|
| **Wails CLI** | `wails build` 打包桌面应用 |
| **Vite** | 前端资源构建 |
| **pnpm** | 前端包管理器 |
| **vue-tsc** | TypeScript 类型检查 |

---

## 3. 目录结构总览

```
GUI.for.Clash/
├── main.go                          # 应用主入口
├── go.mod / go.sum                  # Go 依赖管理
├── wails.json                       # Wails 框架配置
├── README.md                        # 项目说明
├── LICENSE                          # MIT 许可证
├── GUI.for.Clash.code-workspace     # VSCode 工作区配置
│
├── bridge/                          # Go 后端桥接层（暴露给前端的 API）
│   ├── bridge.go                    #   应用核心：初始化、配置加载、环境变量
│   ├── types.go                     #   类型定义
│   ├── exec.go                      #   进程执行管理（前台/后台执行、进程监控）
│   ├── exec_windows.go              #   Windows 平台特定实现
│   ├── exec_others.go               #   macOS/Linux 平台实现
│   ├── io.go                        #   文件 I/O 操作（读写、复制、解压）
│   ├── net.go                       #   网络操作（HTTP 请求、下载、上传、TCP/UDP）
│   ├── server.go                    #   内嵌 HTTP 服务器
│   ├── mmdb.go                      #   GeoIP MMDB 数据库查询
│   ├── system_proxy.go              #   系统代理设置（Windows/macOS/Linux）
│   ├── tray.go                      #   系统托盘管理
│   └── utils.go                     #   工具函数（路径解析、传输配置、滚动更新）**
│
├── build/                           # 构建配置
│   └── windows/info.json            #   Windows 构建元数据
│
├── docs/                            # 文档目录
│
├── .github/                         # GitHub CI/CD 配置
│
└── frontend/                        # 前端源码
    ├── package.json                 #   前端依赖配置
    ├── vite.config.ts               #   Vite 构建配置
    ├── index.html                   #   入口 HTML
    ├── tsconfig*.json               #   TypeScript 配置
    └── src/
        ├── main.ts                  #   Vue 应用入口
        ├── App.vue                  #   根组件（启动画面 + 主壳体）
        │
        ├── api/                     #   与 mihomo 内核的 API 通信层
        │   ├── kernel.ts            #     内核 RESTful + WebSocket API
        │   ├── request.ts           #     HTTP 请求封装
        │   └── websocket.ts         #     WebSocket 封装
        │
        ├── assets/                  #   静态资源与全局方法
        │   ├── globalMethods.ts     #     全局方法注入
        │   ├── logo.ts              #     Logo 资源
        │   └── polyfills.ts         #     兼容性补丁
        │
        ├── bridge/                  #   Wails 桥接层前端封装
        │   ├── index.ts             #     统一导出
        │   ├── app.ts               #     应用生命周期 API
        │   ├── exec.ts              #     进程执行 API
        │   ├── io.ts                #     文件 I/O API
        │   ├── mmdb.ts              #     GeoIP 查询 API
        │   ├── net.ts               #     网络操作 API
        │   ├── server.ts            #     HTTP 服务器 API
        │   └── wailsjs/             #     Wails 自动生成的 JS 绑定
        │
        ├── components/              #   通用 UI 组件库
        │   ├── index.ts             #     组件注册
        │   ├── _common/             #     应用级公共组件
        │   │   ├── AppShell.vue     #       主壳体（导航栏 + 内容区）
        │   │   ├── NavigationBar.vue #      侧边导航栏
        │   │   ├── TitleBar.vue     #       自定义标题栏
        │   │   ├── SplashView.vue   #       启动画面
        │   │   ├── GlobalOverlays.vue #     全局覆盖层（弹窗、提示等）
        │   │   ├── CommandView.vue  #       命令面板
        │   │   └── AboutView.vue    #       关于页面
        │   ├── Button/              #     按钮
        │   ├── Card/                #     卡片
        │   ├── CodeEditor/          #     代码编辑器（CodeMirror）
        │   ├── CodeViewer/          #     代码查看器
        │   ├── Modal/               #     模态弹窗
        │   ├── Table/               #     表格
        │   ├── Tabs/                #     标签页
        │   ├── TrafficChart/        #     流量图表
        │   └── ...                  #     更多 UI 组件
        │
        ├── constant/                #   常量定义
        │   ├── app.ts               #     应用常量（文件路径、颜色、选项）
        │   ├── kernel.ts            #     内核常量（模式、规则类型、DNS 配置）
        │   └── profile.ts           #     配置文件默认值
        │
        ├── directives/              #   Vue 自定义指令
        │   ├── menu.ts              #     右键菜单指令
        │   ├── platform.ts          #     平台检测指令
        │   └── tips.ts              #     提示指令
        │
        ├── enums/                   #   枚举定义
        │   ├── app.ts               #     应用枚举（OS、主题、颜色等）
        │   └── kernel.ts            #     内核枚举（代理组类型、规则类型等）
        │
        ├── hooks/                   #   Vue 组合式函数
        │   ├── useAppBootstrap.ts   #     应用启动引导
        │   ├── useAppLifecycle.ts   #     应用生命周期管理
        │   ├── useBool.ts           #     布尔状态 Hook
        │   └── useCoreBranch.ts     #     内核分支管理
        │
        ├── lang/                    #   国际化
        │   ├── index.ts             #     i18n 配置
        │   └── locale/              #     语言包
        │       ├── en.ts            #       英文
        │       └── zh.ts            #       中文
        │
        ├── router/                  #   路由配置
        │   ├── index.ts             #     Router 实例
        │   └── routes.ts            #     路由表
        │
        ├── stores/                  #   Pinia 状态管理
        │   ├── index.ts             #     统一导出
        │   ├── app.ts               #     应用全局状态（菜单、弹窗、更新）
        │   ├── appSettings.ts       #     用户设置状态
        │   ├── env.ts               #     环境信息状态
        │   ├── kernelApi.ts         #     内核 API 状态（启停、配置、代理）
        │   ├── logs.ts              #     日志状态
        │   ├── plugins.ts           #     插件系统状态
        │   ├── profiles.ts          #     配置文件状态
        │   ├── rulesets.ts          #     规则集状态
        │   ├── scheduledtasks.ts    #     定时任务状态
        │   └── subscribes.ts        #     订阅状态
        │
        ├── types/                   #   TypeScript 类型定义
        │   ├── app.d.ts             #     应用类型
        │   ├── global.d.ts          #     全局类型
        │   ├── kernel.d.ts          #     内核 API 类型
        │   └── typescript.d.ts      #     工具类型
        │
        ├── utils/                   #   工具函数
        │   ├── index.ts             #     统一导出
        │   ├── appContext.ts         #     应用上下文
        │   ├── command.ts           #     命令相关
        │   ├── completion.ts        #     自动补全
        │   ├── env.ts               #     环境工具
        │   ├── eventBus.ts          #     事件总线
        │   ├── format.ts            #     格式化工具
        │   ├── generator.ts         #     配置文件生成器（核心）
        │   ├── helper.ts            #     辅助函数
        │   ├── interaction.ts       #     交互工具（confirm/message/modal）
        │   ├── is.ts                #     类型判断
        │   ├── migration.ts         #     数据迁移
        │   ├── others.ts            #     杂项工具
        │   ├── restorer.ts          #     配置还原
        │   └── tray.ts              #     托盘菜单生成
        │
        └── views/                   #   页面视图
            ├── HomeView/            #     首页（内核控制面板）
            │   ├── index.vue        #       主视图
            │   └── components/      #       子组件
            │       ├── OverView.vue #         状态概览
            │       ├── QuickStart.vue #       快速开始向导
            │       ├── GroupsController.vue # 代理组控制器
            │       ├── KernelLogs.vue #       内核日志
            │       └── ...
            ├── ProfilesView/        #     配置文件管理
            ├── SubscribesView/      #     订阅管理
            ├── RulesetsView/        #     规则集管理
            ├── PluginsView/         #     插件管理
            ├── ScheduledTasksView/  #     定时任务管理
            ├── SettingsView/        #     设置页面
            └── PlaygroundView/      #     开发者沙盒（仅 DEV 模式）
```

---

## 4. 各文件详细说明

### 4.1 Go 后端（bridge/）

#### `main.go` — 应用主入口
- 创建 `App` 实例和系统托盘
- 配置 Wails 应用选项（窗口大小、平台特定设置、单实例锁定）
- 嵌入前端构建产物（`frontend/dist`）
- 定义生命周期回调（`OnStartup`、`OnBeforeClose`）

#### `bridge/bridge.go` — 应用核心初始化
- **`CreateApp()`**：应用初始化入口，按顺序执行：
  1. 解析可执行文件路径，确定 `BasePath`
  2. 检测是否从任务计划启动（`tasksch` 参数）
  3. 检测管理员/root 权限
  4. macOS：创建 `data` 符号链接至 `~/Library/Application Support/`
  5. macOS：创建原生菜单（Show/Hide/Quit）
  6. Windows：处理 WebView2 运行时（从 `.cab` 文件解压）
  7. 解嵌入式资源文件（icons、imgs）
  8. 加载用户配置（`data/user.yaml`）
- **`ExitApp()` / `RestartApp()`**：应用退出与重启
- **`GetEnv()`**：返回环境信息（操作系统、架构、权限等）
- **`loadConfig()`**：从 `data/user.yaml` 加载窗口配置

#### `bridge/types.go` — 类型定义
- `App`：应用结构体（Context + Menu）
- `EnvResult`：环境信息
- `RequestOptions`：HTTP 请求选项（代理、超时、证书验证等）
- `ExecOptions`：进程执行选项（PID 文件、日志文件、工作目录）
- `IOOptions`：文件 I/O 选项（Binary/Text 模式、字节范围）
- `ServerOptions`：HTTP 服务器选项（TLS、静态文件、上传）
- `AppConfig`：用户配置（窗口状态、GPU 策略、内容保护等）
- `TrayContent` / `MenuItem`：托盘内容与菜单项
- `WriteTracker`：下载进度跟踪器

#### `bridge/exec.go` — 进程执行管理
- **`Exec()`**：同步执行命令，返回输出结果
- **`ExecBackground()`**：后台执行进程，支持：
  - PID 文件写入
  - 日志文件输出
  - 实时输出事件（通过 Wails Events 发送到前端）
  - 进程结束事件
  - `StopOutputKeyword`：检测到特定关键字后停止输出
- **`ProcessInfo()` / `ProcessMemory()`**：进程信息查询
- **`KillProcess()`**：优雅终止进程（先发信号，超时后强制 kill）
- **`tailAndEmitLogFile()`**：轮询日志文件并实时推送到前端

#### `bridge/exec_windows.go` — Windows 平台实现
- **`DecodeCommandOutput()`**：处理 Windows OEM 编码（非 UTF-8 输出）
- **`SetCmdWindowHidden()`**：隐藏子进程窗口
- **`SendExitSignal()`**：通过 `GenerateConsoleCtrlEvent` 发送 CTRL_BREAK 信号
- **`IsProcessAlive()`**：通过 `WaitForSingleObject` 检测进程状态
- **`IsPrivileged()`**：通过 `CheckTokenMembership` 检测管理员权限

#### `bridge/exec_others.go` — macOS/Linux 平台实现
- `SendExitSignal()`：发送 SIGINT 信号
- `IsProcessAlive()`：通过 `Signal(0)` 探测进程
- `IsPrivileged()`：检测 `euid == 0`

#### `bridge/io.go` — 文件 I/O 操作
- **`WriteFile()`**：写入文件，支持 Text/Binary 模式和字节范围写入
- **`ReadFile()`**：读取文件，支持字节范围读取（用于日志尾部读取）
- **`MoveFile()` / `CopyFile()` / `RemoveFile()`**：文件操作
- **`MakeDir()` / `ReadDir()`**：目录操作
- **`OpenDir()` / `OpenURI()`**：打开文件夹/URL
- **`UnzipZIPFile()` / `UnzipTarGZFile()` / `UnzipGZFile()`**：解压操作（带路径遍历防护）
- **`FileExists()` / `FileSHA256()`**：文件校验
- **`archiveEntryPath()`**：防止 Zip Slip 路径遍历攻击

#### `bridge/net.go` — 网络操作
- **`Requests()`**：通用 HTTP 请求，支持：
  - 代理配置
  - TLS 跳过验证
  - 请求取消（通过事件 ID）
  - **SSE 流式响应**（Server-Sent Events 解析与转发）
- **`Download()`**：文件下载，支持进度回调和 SHA256 校验
- **`Upload()`**：文件上传（multipart/form-data）
- **`TcpPing()`**：TCP 延迟测试
- **`TcpRequest()` / `UdpRequest()`**：原始 TCP/UDP 请求

#### `bridge/server.go` — 内嵌 HTTP 服务器
- **`StartServer()`**：启动 HTTP 服务器，支持：
  - 静态文件服务
  - 文件上传端点（multipart + raw）
  - TLS 加密
  - 请求转发到前端（通过事件机制）
- **`StopServer()` / `ListServer()`**：服务器管理
- 请求通过事件机制桥接到前端处理，实现前后端协作

#### `bridge/system_proxy.go` — 系统代理管理
- **跨平台系统代理设置**：
  - Windows：通过注册表操作
  - macOS：通过 `networksetup` 命令
  - Linux：支持 KDE（`kwriteconfig`）和 GNOME（`gsettings`）桌面环境
- **系统 DNS 设置**：
  - macOS：通过 `networksetup`
  - Linux：通过 `nmcli`
- 自动检测 Linux 桌面环境类型

#### `bridge/mmdb.go` — GeoIP 数据库
- 使用 `geoip2-golang` 库查询 MMDB 文件
- 支持引用计数的数据库实例管理
- 查询类型：ASN、City、Country、ConnectionType 等

#### `bridge/tray.go` — 系统托盘
- 创建系统托盘图标（Show/Restart/Exit）
- **`UpdateTray()`**：更新托盘图标、标题、提示
- **`UpdateTrayMenus()`**：动态更新托盘菜单
- 支持子菜单、复选框菜单项

#### `bridge/utils.go` — 工具函数
- **`resolvePath()`**：将相对路径解析为基于 `BasePath` 的绝对路径
- **`requestTransport()`**：HTTP 传输层缓存（按代理+TLS 配置缓存）
- **`parseByteRange()`**：解析 HTTP Range 头
- **`RollingRelease()`**：滚动更新中间件（从 `data/rolling-release` 目录提供覆盖文件）

### 4.2 前端核心文件

#### `frontend/src/main.ts` — Vue 应用入口
- 创建 Vue 应用，注册 Pinia、Router、I18n、组件库、指令

#### `frontend/src/App.vue` — 根组件
- 启动时显示 `SplashView`（带进度条）
- 加载完成后切换到 `AppShell`（主界面）
- 使用 `useAppBootstrap` Hook 管理启动流程

#### `frontend/src/hooks/useAppBootstrap.ts` — 启动引导
启动流程按顺序执行：
1. 初始化环境信息
2. 并行加载所有数据（设置、配置文件、订阅、规则集、插件、定时任务）
3. 触发 `onStartup` 插件事件
4. 触发 `onReady` 插件事件
5. 等待最少 1 秒启动画面展示
6. 初始化内核状态（检测已有进程或自动启动）

#### `frontend/src/router/routes.ts` — 路由表
| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | HomeView | 首页/内核控制面板 |
| `/profiles` | ProfilesView | 配置文件管理 |
| `/subscriptions` | SubscribesView | 订阅管理 |
| `/rulesets` | RulesetsView | 规则集管理 |
| `/plugins` | PluginsView | 插件管理 |
| `/scheduledtasks` | ScheduledTasksView | 定时任务管理 |
| `/settings` | SettingsView | 设置页面 |
| `/playground` | PlaygroundView | 开发者沙盒（仅 DEV） |

### 4.3 状态管理（stores/）

#### `stores/kernelApi.ts` — 内核 API 状态（核心 Store）
- **内核生命周期管理**：`startCore()` → `runCoreProcess()` → `onCoreStarted()` / `onCoreStopped()`
- **配置文件生成**：调用 `generateConfigFile()` 生成 mihomo 配置
- **RESTful API 封装**：`getConfigs()`、`setConfigs()`、`getProxies()` 等
- **WebSocket 管理**：日志、流量、内存、连接的实时数据
- **系统代理联动**：启动时自动设置系统代理，停止时自动清除
- **变更监听**：通过 `eventBus` 监听配置/订阅/规则集变更，标记 `needRestart`

#### `stores/plugins.ts` — 插件系统（复杂 Store）
- **插件生命周期**：加载 → 初始化 → 运行 → 卸载
- **动态代码加载**：将插件代码通过 Blob URL 动态 import
- **触发器系统**：12 种触发器（OnStartup、OnSubscribe、OnGenerate 等）
- **插件上下文**：通过 Proxy 对象提供只读配置访问和状态管理
- **Source Map 支持**：为插件代码生成 Source Map 便于调试

#### `stores/profiles.ts` — 配置文件管理
- YAML 格式存储在 `data/profiles.yaml`
- CRUD 操作带乐观更新和回滚机制

#### `stores/subscribes.ts` — 订阅管理
- 支持三种类型：HTTP（远程）、File（本地）、Manual（手动）
- 订阅更新流程：请求 → 解析 → 插件处理 → 过滤 → 保存
- 支持 Base64 编码的订阅源
- 并发更新（最多 5 个并发）

#### `stores/appSettings.ts` — 用户设置
- 存储在 `data/user.yaml`
- 主题、颜色、语言、内核配置等

### 4.4 配置生成器（`utils/generator.ts`）

这是项目的核心业务逻辑之一，负责将 GUI 的配置对象转换为 mihomo 可识别的 YAML 配置文件：

1. **合并基础配置**：generalConfig + advancedConfig + tunConfig + dnsConfig
2. **DNS 配置处理**：清理空数组、转换 hosts 格式
3. **生成 proxy-providers**：从订阅生成代理提供者
4. **生成 rule-providers**：从规则集生成规则提供者
5. **生成 proxies**：从订阅文件中提取代理节点
6. **生成 proxy-groups**：根据代理组配置生成
7. **生成 rules**：过滤并生成规则列表
8. **插件处理**：调用 `onGenerate` 触发器
9. **Mixin 合并**：根据优先级合并 Mixin 配置
10. **脚本处理**：执行用户自定义脚本

### 4.5 托盘菜单生成（`utils/tray.ts`）

动态生成系统托盘菜单，包含：
- 显示主窗口
- 内核模式切换（全局/规则/直连）
- 代理组快速切换（含延迟排序）
- 内核启停控制
- 系统代理设置/清除
- TUN 模式开关
- 主题/颜色/语言切换
- 插件菜单
- 重启/退出

---

## 5. 项目运行流程

### 5.1 应用启动流程

```
main.go
  ├── CreateApp(assets)
  │   ├── 解析可执行文件路径 → BasePath
  │   ├── 检测任务计划启动标记
  │   ├── 检测管理员权限
  │   ├── [macOS] 创建 data 符号链接 + 原生菜单
  │   ├── [Windows] 处理 WebView2 运行时
  │   ├── 解嵌入式资源（icons/imgs → data/.cache/）
  │   └── 加载 data/user.yaml → Config
  │
  ├── CreateTray(app, icon)
  │   └── 创建系统托盘（Show/Restart/Exit）
  │
  └── wails.Run()
      ├── 配置窗口参数（大小、无边框、透明等）
      ├── 配置平台特定选项
      ├── 配置 AssetServer（RollingRelease 中间件）
      ├── 配置单实例锁定
      └── OnStartup → app.Ctx = ctx → trayStart()
```

### 5.2 前端初始化流程

```
main.ts → createApp(App)
  ├── 注册 Pinia（状态管理）
  ├── 注册 Router（路由）
  ├── 注册 I18n（国际化）
  ├── 注册 Components（UI 组件库）
  └── 注册 Directives（自定义指令）

App.vue
  └── useAppBootstrap()
      ├── envStore.setupEnv()              → 获取环境信息
      ├── Promise.all([
      │   appSettings.setupAppSettings()   → 加载用户设置
      │   profilesStore.setupProfiles()    → 加载配置文件列表
      │   subscribesStore.setupSubscribes() → 加载订阅列表
      │   rulesetsStore.setupRulesets()    → 加载规则集列表
      │   pluginsStore.setupPlugins()      → 加载插件列表
      │   scheduledTasksStore.setupScheduledTasks() → 加载定时任务
      │ ])
      ├── [首次启动] pluginsStore.onStartupTrigger()
      ├── pluginsStore.onReadyTrigger()
      └── kernelApiStore.initCoreState()   → 检测内核状态或自动启动
```

### 5.3 内核启动流程

```
kernelApiStore.startCore()
  ├── 获取当前 Profile
  ├── generateConfigFile(profile, onBeforeCoreStart)
  │   ├── generateConfig()           → 生成完整配置对象
  │   ├── pluginsStore.onGenerate()  → 插件处理配置
  │   ├── Mixin 合并
  │   ├── 脚本处理
  │   └── WriteFile(config.yaml)     → 写入配置文件
  │
  ├── runCoreProcess(isAlpha, tunEnabled)
  │   ├── ExecBackground(mihomo, args, ...)
  │   │   ├── 启动 mihomo 子进程
  │   │   ├── 写入 PID 文件
  │   │   └── 开始日志文件轮询
  │   ├── probeApiAvailability()     → 等待 API 可用
  │   └── [TUN] 检测 TUN 启动状态
  │
  └── onCoreStarted(pid)
      ├── initWebsocket()            → 建立 WebSocket 连接
      ├── refreshConfig()            → 获取内核配置
      ├── refreshProviderProxies()   → 获取代理信息
      ├── [自动] setSystemProxy()    → 设置系统代理
      ├── [自动] setSystemDNS()      → 设置系统 DNS
      └── pluginsStore.onCoreStarted() → 触发插件事件
```

### 5.4 数据流转关系

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (Vue 3)                            │
│                                                              │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Profiles │  │Subscribes│  │ Rulesets │  │   Plugins   │ │
│  │  Store   │  │  Store   │  │  Store   │  │    Store    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│       │              │              │               │        │
│       └──────────────┴──────────────┴───────────────┘        │
│                          │                                    │
│                   generator.ts                                │
│                   (配置文件生成)                               │
│                          │                                    │
│                   kernelApiStore                              │
│                   (内核生命周期)                               │
│                          │                                    │
│  ┌───────────────────────┴───────────────────────────┐       │
│  │              Bridge Layer (bridge/)                 │       │
│  │  ExecBackground / ReadFile / WriteFile / Requests  │       │
│  └───────────────────────┬───────────────────────────┘       │
└──────────────────────────┼──────────────────────────────────┘
                           │ Wails JS ↔ Go 绑定
┌──────────────────────────┼──────────────────────────────────┐
│                   Go 后端 (bridge/)                           │
│                          │                                    │
│  ┌───────────┐  ┌────────┴──────┐  ┌──────────────────┐    │
│  │ 进程管理   │  │  文件 I/O     │  │  网络操作         │    │
│  │ exec.go   │  │  io.go        │  │  net.go           │    │
│  └─────┬─────┘  └───────────────┘  └──────────────────┘    │
│        │                                                      │
│        ▼                                                      │
│  ┌───────────┐         ┌──────────────────┐                  │
│  │  mihomo   │ ◄─────► │  系统代理设置     │                  │
│  │  内核进程  │         │  system_proxy.go │                  │
│  └───────────┘         └──────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. 核心设计与注意事项

### 6.1 架构设计特点

1. **Wails 桥接模式**：Go 后端通过 `//go:embed` 嵌入前端资源，Wails 自动生成 JS/TS 绑定，前端通过 `bridge/` 目录的封装层调用 Go 方法。

2. **事件驱动通信**：
   - 前端 → 后端：直接调用绑定方法
   - 后端 → 前端：通过 `runtime.EventsEmit()` 推送事件（日志、进度、进程状态等）

3. **插件系统设计**：
   - 插件代码通过 Blob URL 动态 import
   - 使用 Proxy 对象提供安全的插件上下文
   - 支持 12 种生命周期触发器
   - 插件代码通过正则替换自动添加 `export` 关键字

4. **滚动更新（Rolling Release）**：
   - 通过 `data/rolling-release/` 目录覆盖内嵌资源
   - AssetServer 中间件优先提供本地覆盖文件
   - 支持不重新安装即可更新前端资源

5. **配置文件生成管线**：
   Profile 对象 → 基础配置 → 插件处理 → Mixin 合并 → 脚本处理 → YAML 输出

### 6.2 跨平台兼容性注意点

1. **Windows**：
   - 子进程窗口隐藏（`CREATE_NEW_PROCESS_GROUP` + `HideWindow`）
   - 进程终止使用 `CTRL_BREAK_EVENT` 而非 `TerminateProcess`
   - OEM 编码处理（非 UTF-8 命令输出）
   - WebView2 运行时可从 `.cab` 文件自解压
   - 系统代理通过注册表操作

2. **macOS**：
   - `data` 目录符号链接至 `~/Library/Application Support/`
   - 原生菜单栏（Show/Hide/Quit + Edit 菜单）
   - `xattr` 处理（更新后移除隔离属性）
   - 系统代理通过 `networksetup` 操作每个网络服务

3. **Linux**：
   - 系统代理支持 KDE 和 GNOME 桌面环境自动检测
   - 托盘图标使用 `.png` 格式（非 `.ico`）
   - DNS 设置通过 `nmcli` 操作 NetworkManager

### 6.3 潜在注意点与限制

1. **安全相关**：
   - `archiveEntryPath()` 实现了 Zip Slip 防护
   - HTTP 请求体限制 20MB（`MaxBytesReader`）
   - 插件代码在浏览器沙箱中执行（Blob URL import）
   - 下载文件支持 SHA256 校验

2. **单实例锁定**：
   - 默认单实例，第二次启动会激活已有窗口
   - 可通过 `MultipleInstance` 配置允许多实例

3. **进程管理**：
   - 内核进程通过 PID 文件跟踪
   - 优雅终止：先发信号，超时后强制 kill
   - macOS 进程内存查询有 `ps` 命令 fallback

4. **数据存储**：
   - 所有用户数据存储在 `data/` 目录
   - 配置文件使用 YAML 格式
   - 插件列表和规则集 Hub 缓存在 `data/.cache/`

5. **网络请求**：
   - SSE（Server-Sent Events）流式响应支持
   - HTTP Transport 按代理+TLS 配置缓存复用
   - 请求取消通过事件 ID 机制实现

6. **国际化**：
   - 内置中英文语言包
   - 支持从 `data/locales/` 目录加载自定义语言包（JSON 格式）

7. **构建注意**：
   - 前端使用 `pnpm` 作为包管理器
   - Vite 配置了代码分割（vue/codemirror/prettier/vendor/index）
   - CSS 不做代码分割（`cssCodeSplit: false`）
   - chunk 大小警告阈值 4MB
