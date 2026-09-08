# GUI.for.Clash 精简改造报告

## 一、改造总览

本次改造目标是将 GUI.for.Clash 精简为一个**纯订阅驱动的代理客户端**，移除配置文件管理、插件系统、规则集管理、计划任务等高级功能，简化用户操作流程，使订阅拉取的配置文件可直接运行。

### 改造需求清单

| 序号 | 需求 | 影响范围 |
|------|------|----------|
| 1 | 删除配置文件管理模块 | 路由、Store、视图、启动引导、内核启动流程、生成器、首页 |
| 2 | 删除插件模块 | 路由、Store、视图、启动引导、生成器、托盘菜单、设置页 |
| 3 | 删除规则集模块 | 路由、Store、视图、启动引导、生成器 |
| 4 | 删除计划任务模块 | 路由、Store、视图、启动引导 |
| 5 | 删除设置里的页面可见性、滚动发行功能 | 设置页、appSettings Store |
| 6 | 删除添加订阅的更多功能 | SubscribeForm 组件 |
| 7 | 删除关于里的 GitHub、TG Group、TG Channel 链接 | AboutView 组件 |
| 8 | 关于里的版本号统一显示 v.x.xx.x，删除点击检测更新 | AboutView、app Store |
| 9 | 订阅配置文件可直接运行 | 内核启动流程、订阅更新流程 |
| 10 | 运行内核后系统代理默认关闭 | 内核启动流程、appSettings 默认值 |
| 11 | 运行内核后 TUN 模式默认关闭 | 内核启动流程 |

---

## 二、逐项改造详细方案

### 改造 1：删除配置文件管理模块

**影响文件清单：**

| 文件 | 操作 | 说明 |
|------|------|------|
| [routes.ts](frontend/src/router/routes.ts) | 修改 | 删除 `/profiles` 路由 |
| [profiles.ts](frontend/src/stores/profiles.ts) | 删除 | 整个 Store |
| [ProfilesView/index.vue](frontend/src/views/ProfilesView/index.vue) | 删除 | 整个视图目录 |
| [useAppBootstrap.ts](frontend/src/hooks/useAppBootstrap.ts) | 修改 | 移除 profilesStore 初始化 |
| [kernelApi.ts](frontend/src/stores/kernelApi.ts) | 大幅修改 | 重写内核启动流程，改为订阅直驱 |
| [generator.ts](frontend/src/utils/generator.ts) | 大幅修改 | 重写配置生成逻辑 |
| [HomeView/index.vue](frontend/src/views/HomeView/index.vue) | 大幅修改 | 移除 Profile 选择卡片 |
| [appSettings.ts](frontend/src/stores/appSettings.ts) | 修改 | 移除 `kernel.profile` 字段 |
| [subscribes.ts](frontend/src/stores/subscribes.ts) | 修改 | 移除对 profilesStore 的依赖 |
| [restorer.ts](frontend/src/utils/restorer.ts) | 删除 | 配置还原工具 |
| [constant/profile.ts](frontend/src/constant/profile.ts) | 删除 | Profile 默认值定义 |
| [types/app.d.ts](frontend/src/types/app.d.ts) | 修改 | 移除 Profile 相关类型 |
| [lang/locale/zh.ts](frontend/src/lang/locale/zh.ts) | 修改 | 移除 profiles 相关翻译 |
| [lang/locale/en.ts](frontend/src/lang/locale/en.ts) | 修改 | 移除 profiles 相关翻译 |

**核心改造逻辑：**

1. **路由层**：从 `routes.ts` 中删除 Profiles 路由项，移除 `ProfilesView` 的 import。

2. **Store 层**：完全删除 `profiles.ts` Store。在 `stores/index.ts` 中移除导出。

3. **启动引导**：`useAppBootstrap.ts` 中移除 `profilesStore.setupProfiles()` 调用。

4. **内核启动流程重写**（`kernelApi.ts` 的 `startCore` 方法）：
   ```
   当前流程：获取 profile → generateConfigFile(profile) → 启动进程
   改造后流程：获取当前订阅 → 直接读取订阅文件作为配置 → 启动进程
   ```
   - `startCore()` 不再需要 profile 参数
   - 改为从 `subscribesStore` 获取第一个启用的订阅（或指定订阅）
   - 直接使用订阅拉取的配置文件路径作为内核配置

5. **首页改造**（`HomeView/index.vue`）：
   - 移除 Profile 选择卡片（第 96-139 行）
   - 改为显示订阅列表或直接显示启动按钮
   - `profilesStore.profiles.length === 0` 的判断改为订阅列表判断

6. **appSettings 改造**：
   - 移除 `kernel.profile` 字段
   - 新增 `kernel.subscription` 字段（指向订阅 ID）

---

### 改造 2：删除插件模块

**影响文件清单：**

| 文件 | 操作 | 说明 |
|------|------|------|
| [routes.ts](frontend/src/router/routes.ts) | 修改 | 删除 `/plugins` 路由 |
| [plugins.ts](frontend/src/stores/plugins.ts) | 删除 | 整个 Store |
| [PluginsView/index.vue](frontend/src/views/PluginsView/index.vue) | 删除 | 整个视图目录 |
| [useAppBootstrap.ts](frontend/src/hooks/useAppBootstrap.ts) | 修改 | 移除 pluginsStore 初始化和触发器 |
| [kernelApi.ts](frontend/src/stores/kernelApi.ts) | 修改 | 移除插件触发器调用 |
| [generator.ts](frontend/src/utils/generator.ts) | 修改 | 移除 `onGenerateTrigger` 调用 |
| [subscribes.ts](frontend/src/stores/subscribes.ts) | 修改 | 移除 `onSubscribeTrigger` 调用 |
| [tray.ts](frontend/src/utils/tray.ts) | 修改 | 移除插件菜单生成 |
| [SettingsView/index.vue](frontend/src/views/SettingsView/index.vue) | 修改 | 移除 Plugins 设置 tab |
| [appSettings.ts](frontend/src/stores/appSettings.ts) | 修改 | 移除插件相关配置字段 |
| [constant/app.ts](frontend/src/constant/app.ts) | 修改 | 移除插件相关常量 |
| [enums/app.ts](frontend/src/enums/app.ts) | 修改 | 移除 PluginTrigger 枚举 |
| [lang/locale/zh.ts](frontend/src/lang/locale/zh.ts) | 修改 | 移除 plugins 相关翻译 |
| [lang/locale/en.ts](frontend/src/lang/locale/en.ts) | 修改 | 移除 plugins 相关翻译 |

**核心改造逻辑：**

1. **路由层**：删除 Plugins 路由。

2. **Store 层**：完全删除 `plugins.ts`。从 `stores/index.ts` 移除导出。

3. **启动引导**：`useAppBootstrap.ts` 中：
   - 移除 `pluginsStore.setupPlugins()` 调用
   - 移除 `pluginsStore.onStartupTrigger()` 调用
   - 移除 `pluginsStore.onReadyTrigger()` 调用

4. **内核启动流程**（`kernelApi.ts`）：
   - 移除 `onCoreStarted` 中的 `pluginsStore.onCoreStartedTrigger()`
   - 移除 `onCoreStopped` 中的 `pluginsStore.onCoreStoppedTrigger()`
   - 移除 `stopCore` 中的 `pluginsStore.onBeforeCoreStopTrigger()`
   - 移除 `startCore` 中的 `pluginsStore.onBeforeCoreStartTrigger()` 调用

5. **配置生成器**（`generator.ts`）：
   - 移除 `onGenerateTrigger` 调用（约第 371 行）
   - 生成流程简化为：生成配置 → Mixin 合并 → 脚本处理 → 写入文件

6. **订阅更新**（`subscribes.ts`）：
   - 移除 `_doUpdateSub` 中的 `pluginStore.onSubscribeTrigger()` 调用

7. **托盘菜单**（`tray.ts`）：
   - 移除插件菜单生成逻辑（第 152-175 行）
   - 移除 `pluginsStore` 导入和使用

8. **设置页**：
   - `SettingsView/index.vue` 中移除 `PluginSettings` tab
   - 删除 `PluginSettings.vue` 文件

9. **appSettings**：移除以下字段：
   - `plugins.sources`
   - `addPluginToMenu`
   - `pluginSettings`

---

### 改造 3：删除规则集模块

**影响文件清单：**

| 文件 | 操作 | 说明 |
|------|------|------|
| [routes.ts](frontend/src/router/routes.ts) | 修改 | 删除 `/rulesets` 路由 |
| [rulesets.ts](frontend/src/stores/rulesets.ts) | 删除 | 整个 Store |
| [RulesetsView/index.vue](frontend/src/views/RulesetsView/index.vue) | 删除 | 整个视图目录 |
| [useAppBootstrap.ts](frontend/src/hooks/useAppBootstrap.ts) | 修改 | 移除 rulesetsStore 初始化 |
| [kernelApi.ts](frontend/src/stores/kernelApi.ts) | 修改 | 移除 rulesets 相关事件监听 |
| [generator.ts](frontend/src/utils/generator.ts) | 修改 | 移除 `generateRuleProviders` 调用 |
| [lang/locale/zh.ts](frontend/src/lang/locale/zh.ts) | 修改 | 移除 rulesets 相关翻译 |
| [lang/locale/en.ts](frontend/src/lang/locale/en.ts) | 修改 | 移除 rulesets 相关翻译 |

**核心改造逻辑：**

1. **路由层**：删除 Rulesets 路由。

2. **Store 层**：完全删除 `rulesets.ts`。

3. **启动引导**：移除 `rulesetsStore.setupRulesets()` 调用。

4. **内核启动流程**（`kernelApi.ts`）：
   - 移除 `rulesetsStore` 导入
   - 移除 `collectRulesetIDs` 函数
   - 移除 `rulesetChange` 和 `rulesetsChange` 事件监听

5. **配置生成器**（`generator.ts`）：
   - 移除 `generateRuleProviders` 函数及其调用
   - 移除 `useRulesetsStore` 导入
   - `generateRule` 函数中移除规则集相关逻辑

---

### 改造 4：删除计划任务模块

**影响文件清单：**

| 文件 | 操作 | 说明 |
|------|------|------|
| [routes.ts](frontend/src/router/routes.ts) | 修改 | 删除 `/scheduledtasks` 路由 |
| [scheduledtasks.ts](frontend/src/stores/scheduledtasks.ts) | 删除 | 整个 Store |
| [ScheduledTasksView/index.vue](frontend/src/views/ScheduledTasksView/index.vue) | 删除 | 整个视图目录 |
| [useAppBootstrap.ts](frontend/src/hooks/useAppBootstrap.ts) | 修改 | 移除 scheduledTasksStore 初始化 |
| [constant/app.ts](frontend/src/constant/app.ts) | 修改 | 移除计划任务相关常量 |
| [enums/app.ts](frontend/src/enums/app.ts) | 修改 | 移除 ScheduledTasksType 枚举 |
| [lang/locale/zh.ts](frontend/src/lang/locale/zh.ts) | 修改 | 移除 scheduledtask 相关翻译 |
| [lang/locale/en.ts](frontend/src/lang/locale/en.ts) | 修改 | 移除 scheduledtask 相关翻译 |

**核心改造逻辑：**

1. **路由层**：删除 ScheduledTasks 路由。

2. **Store 层**：完全删除 `scheduledtasks.ts`。

3. **启动引导**：移除 `scheduledTasksStore.setupScheduledTasks()` 调用。

4. **常量清理**：从 `constant/app.ts` 移除：
   - `ScheduledTasksFilePath`
   - `ScheduledTaskOptions`

5. **枚举清理**：从 `enums/app.ts` 移除 `ScheduledTasksType`。

---

### 改造 5：删除设置里的页面可见性、滚动发行功能

**影响文件清单：**

| 文件 | 操作 | 说明 |
|------|------|------|
| [appSettings.ts](frontend/src/stores/appSettings.ts) | 修改 | 移除相关字段 |
| [BehaviorSettings.vue](frontend/src/views/SettingsView/components/components/BehaviorSettings.vue) | 修改 | 移除 addPluginToMenu、addGroupToMenu 开关 |
| [AdvancedSettings.vue](frontend/src/views/SettingsView/components/components/AdvancedSettings.vue) | 修改 | 移除 rollingRelease 开关 |
| [NavigationBar.vue](frontend/src/components/_common/NavigationBar.vue) | 修改 | 移除 pages 过滤逻辑 |
| [constant/app.ts](frontend/src/constant/app.ts) | 修改 | 移除 RollingReleaseDirectory |
| [bridge/utils.go](bridge/utils.go) | 修改 | 移除 RollingRelease 函数 |

**核心改造逻辑：**

1. **appSettings 移除字段**：
   - `pages`（页面可见性控制）
   - `rollingRelease`（滚动发行开关）
   - `addPluginToMenu`（已在改造 2 中处理）
   - `addGroupToMenu`（可选保留，视需求而定）

2. **BehaviorSettings.vue**：移除以下开关：
   - `addPluginToMenu`（第 157-159 行）
   - `addGroupToMenu`（第 161-163 行）

3. **AdvancedSettings.vue**：移除 `rollingRelease` 相关开关。

4. **NavigationBar.vue**：简化路由过滤逻辑，移除 `pages` 判断，直接显示所有路由。

5. **Go 后端**：`bridge/utils.go` 中移除 `RollingRelease()` 函数。`main.go` 中移除 AssetServer 的 RollingRelease 中间件配置。

---

### 改造 6：删除添加订阅的更多功能

**影响文件清单：**

| 文件 | 操作 | 说明 |
|------|------|------|
| [SubscribeForm.vue](frontend/src/views/SubscribesView/components/SubscribeForm.vue) | 修改 | 移除"更多"折叠区域 |

**核心改造逻辑：**

在 `SubscribeForm.vue` 中，移除 `<Divider>` 和 `<div v-if="showMore">` 整个区域（第 164-268 行），包括：
- `include` / `exclude` 过滤
- `includeProtocol` / `excludeProtocol` 协议过滤
- `proxyPrefix` 代理前缀
- `website` 网站
- `inSecure` 跳过证书验证
- `requestTimeout` 请求超时
- `requestMethod` 请求方式
- `requestProxyMode` 请求代理
- `customProxy` 自定义代理
- `header.request` / `header.response` 自定义请求头

同时移除相关的 `useBool` hook 导入和 `showMore` 状态。

**保留的字段**：订阅类型、名称、URL/路径、存储路径、useInternal 开关。

---

### 改造 7：删除关于里的 GitHub、TG Group、TG Channel 链接

**影响文件清单：**

| 文件 | 操作 | 说明 |
|------|------|------|
| [AboutView.vue](frontend/src/components/_common/AboutView.vue) | 修改 | 移除 toolbar 中的链接按钮 |

**核心改造逻辑：**

在 `AboutView.vue` 中，删除 `defineExpose` 的 `modalSlots.toolbar` 部分（第 42-77 行），即移除：
- GitHub 按钮
- TG Group 按钮
- TG Channel 按钮

同时移除不再需要的导入：
- `BrowserOpenURL`
- `PROJECT_URL`, `TG_GROUP`, `TG_CHANNEL`

---

### 改造 8：版本号统一显示 v.x.xx.x，删除点击检测更新

**影响文件清单：**

| 文件 | 操作 | 说明 |
|------|------|------|
| [AboutView.vue](frontend/src/components/_common/AboutView.vue) | 修改 | 版本号显示改造 |
| [app.ts](frontend/src/stores/app.ts) | 修改 | 移除更新检测相关逻辑 |
| [env.ts](frontend/src/utils/env.ts) | 可选 | 移除 APP_VERSION_API 常量 |

**核心改造逻辑：**

1. **AboutView.vue 改造**：
   - 移除自动检测更新逻辑（第 38-40 行 `checkForUpdates` 调用）
   - 版本号显示改为静态文本：`v{{ APP_VERSION }}`，格式统一为 `v.x.xx.x`
   - 移除可点击的 `<Button>` 包装，改为普通 `<div>` 显示
   - 移除更新下载按钮（第 103-109 行）
   - 移除重启应用按钮（第 86-93 行）

2. **app Store 改造**：移除以下字段和方法：
   - `lastCheckTime`
   - `checkForUpdatesLoading`
   - `restartable`
   - `downloading`
   - `downloadUrl`
   - `downloadDigest`
   - `remoteVersion`
   - `updatable`
   - `checkForUpdates()` 方法
   - `downloadApp()` 方法

3. **版本号格式**：确保 `APP_VERSION` 显示为 `v.x.xx.x` 格式。检查 `vite.config.ts` 或环境变量中的版本号定义。

---

### 改造 9：订阅配置文件可直接运行

**影响文件清单：**

| 文件 | 操作 | 说明 |
|------|------|------|
| [kernelApi.ts](frontend/src/stores/kernelApi.ts) | 大幅修改 | 重写 startCore 流程 |
| [subscribes.ts](frontend/src/stores/subscribes.ts) | 修改 | 订阅更新后自动设为当前配置 |
| [appSettings.ts](frontend/src/stores/appSettings.ts) | 修改 | 新增 subscription 字段 |
| [generator.ts](frontend/src/utils/generator.ts) | 大幅简化 | 移除 Profile 相关生成逻辑 |
| [HomeView/index.vue](frontend/src/views/HomeView/index.vue) | 修改 | 简化启动 UI |

**核心改造逻辑：**

这是本次改造的核心需求，需要重新设计内核启动流程。

**改造前流程：**
```
用户选择 Profile → 点击启动 → generateConfigFile(profile) → 启动内核
```

**改造后流程：**
```
用户添加订阅 → 更新订阅 → 点击启动 → 直接使用订阅配置文件启动内核
```

**具体实现方案：**

1. **appSettings 新增字段**：
   ```typescript
   kernel: {
     subscription: '', // 当前使用的订阅 ID（替代 profile）
     // ... 其他字段保持不变
   }
   ```

2. **kernelApi.ts 的 startCore 重写**：
   ```typescript
   const startCore = async () => {
     if (running.value) throw 'The core is already running'
     logsStore.clearKernelLog()

     const { subscription: subID, branch } = appSettingsStore.app.kernel
     const sub = subscribesStore.getSubscribeById(subID)
     if (!sub) throw 'Choose a subscription first'

     starting.value = true
     try {
       // 直接使用订阅的配置文件路径，无需 generateConfigFile
       // 如果需要额外处理（如 Mixin/脚本），可在此简化处理
       const isAlpha = branch === Branch.Alpha
       const pid = await runCoreProcess(isAlpha, false) // TUN 默认关闭
       pid && (await onCoreStarted(pid))
     } finally {
       starting.value = false
     }
   }
   ```

3. **runCoreProcess 简化**：
   - 移除 `tunEnabled` 参数
   - 移除 TUN 启动检测逻辑（第 169-178 行）
   - 内核直接以订阅配置文件启动

4. **generator.ts 简化**：
   - 移除 `generateConfig` 函数（或大幅简化）
   - 移除 `generateProxies`、`generateProxyGroup`、`generateProxyProviders`、`generateRuleProviders` 等函数
   - 保留 Mixin 合并和脚本处理能力（可选）

5. **HomeView 改造**：
   - 移除 Profile 选择卡片
   - 改为订阅选择或直接启动
   - 当无订阅时显示"请先添加订阅"提示

---

### 改造 10：运行内核后系统代理默认关闭

**影响文件清单：**

| 文件 | 操作 | 说明 |
|------|------|------|
| [appSettings.ts](frontend/src/stores/appSettings.ts) | 修改 | 修改默认值 |
| [kernelApi.ts](frontend/src/stores/kernelApi.ts) | 修改 | 移除自动设置系统代理逻辑 |

**核心改造逻辑：**

1. **修改默认值**（`appSettings.ts` 第 65 行）：
   ```typescript
   // 改造前
   autoSetSystemProxy: true,
   // 改造后
   autoSetSystemProxy: false,
   ```

2. **移除自动设置逻辑**（`kernelApi.ts` 的 `onCoreStarted` 方法）：
   ```typescript
   // 改造前（第 191-193 行）
   if (appSettingsStore.app.autoSetSystemProxy) {
     await envStore.setSystemProxy().catch((err) => message.error(err))
   }
   // 改造后：直接移除，不自动设置系统代理
   ```

3. **OverView.vue 保持不变**：系统代理开关仍然存在于概览页面，用户可手动开启。

---

### 改造 11：运行内核后 TUN 模式默认关闭

**影响文件清单：**

| 文件 | 操作 | 说明 |
|------|------|------|
| [kernelApi.ts](frontend/src/stores/kernelApi.ts) | 修改 | 启动后强制关闭 TUN |
| [generator.ts](frontend/src/utils/generator.ts) | 可选 | 生成配置时强制 enable: false |

**核心改造逻辑：**

1. **内核启动后关闭 TUN**（`kernelApi.ts` 的 `onCoreStarted` 方法）：
   ```typescript
   // 在 onCoreStarted 中，refreshConfig 之后添加
   if (config.value.tun.enable) {
     await updateConfig({ tun: { enable: false } })
   }
   ```

2. **或在配置生成阶段强制关闭**（`generator.ts`）：
   ```typescript
   // 在 generateConfig 中，设置 tun 时
   tun: {
     ...profile.tunConfig,
     enable: false, // 强制关闭
     // ...
   }
   ```

3. **推荐方案**：在 `onCoreStarted` 中关闭，因为订阅配置文件可能包含 `tun: enable: true`，我们不修改订阅文件本身，而是在启动后通过 API 强制关闭。

---

## 三、改造执行顺序建议

建议按以下顺序执行改造，以减少依赖冲突：

```
阶段一（独立模块删除，无依赖冲突）：
  ① 删除计划任务模块（改造 4）
  ② 删除规则集模块（改造 3）
  ③ 删除插件模块（改造 2）

阶段二（核心流程改造）：
  ④ 删除配置文件管理模块（改造 1）—— 这是最复杂的改造
  ⑤ 订阅配置直接运行（改造 9）—— 依赖改造 1

阶段三（UI 和行为调整）：
  ⑥ 设置页清理（改造 5）
  ⑦ 订阅表单简化（改造 6）
  ⑧ 关于页面改造（改造 7 + 改造 8）
  ⑨ 系统代理默认关闭（改造 10）
  ⑩ TUN 模式默认关闭（改造 11）
```

---

## 四、Go 后端改动

大部分改造集中在前端，Go 后端改动较少：

| 文件 | 改动 |
|------|------|
| [bridge/utils.go](bridge/utils.go) | 移除 `RollingRelease()` 函数 |
| [main.go](main.go) | 移除 AssetServer 的 RollingRelease 中间件（如果改造 5 执行） |

其余 Go 后端代码（进程管理、文件 I/O、网络操作、系统代理设置）保持不变。

---

## 五、数据兼容性考虑

1. **已有配置文件迁移**：用户已有的 `data/profiles.yaml` 文件在改造后不再被读取，无需特殊处理。
2. **订阅数据兼容**：`data/subscribes.yaml` 格式不变，已有的订阅数据完全兼容。
3. **设置数据兼容**：`data/user.yaml` 中新增的 `kernel.subscription` 字段会使用默认空值，用户需手动选择订阅。
4. **插件数据**：`data/plugins.yaml` 和 `data/.cache/plugin-list.json` 改造后不再被读取。

---

## 六、改造后保留的模块

| 模块 | 说明 |
|------|------|
| 首页 (HomeView) | 保留，但简化为订阅选择 + 启动 |
| 订阅管理 (SubscribesView) | 保留，简化表单 |
| 设置 (SettingsView) | 保留，移除插件 tab 和部分功能 |
| 关于 (AboutView) | 保留，简化显示 |
| 系统托盘 | 保留，移除插件菜单 |
| 内核 API 通信 | 保留 |
| 日志系统 | 保留 |
| 连接管理 | 保留 |
