# GUI.for.Clash 简化改造方案

> 基于 GUI.for.SingBox 改造前后的完整代码对比，精确到每一处变更。
>
> - **Reference（改造后）** = `/home/coder/Reference/GUI.for.SingBox/`（简化版）
> - **Project（改造前）** = `/home/coder/Project/GUI.for.SingBox/`（完整版）

---

## 一、改造总览

### 改造前后对比

| 维度 | 改造前 | 改造后 |
|------|--------|--------|
| 路由数量 | 7 个 | 3 个（Overview, Subscriptions, Settings） |
| Store 导出 | 10 个 | 6 个（appSettings, subscribes, logs, kernelApi, app, env） |
| 启动内核方式 | Profile + generateConfigFile + 插件触发 | 直接读取订阅配置文件 |
| 配置区分 | 无 | `configMode: 'full' \| 'proxy'` |
| TUN 处理 | Profile 中的 inbound enable | runtimeConfig 缓存 + splice 移除/恢复 |
| 设置字段 | `kernel.profile` | `kernel.activeSubscription` |
| 系统代理默认值 | `true` | `false` |
| About 页面 | 114 行（链接、更新检测、重启） | 12 行（logo + 标题 + 版本号） |

### 删除的文件

| 文件 | 说明 |
|------|------|
| `frontend/src/stores/profiles.ts` | Profile Store |
| `frontend/src/stores/plugins.ts` | 插件 Store |
| `frontend/src/stores/rulesets.ts` | 规则集 Store |
| `frontend/src/stores/scheduledtasks.ts` | 计划任务 Store |
| `frontend/src/views/ProfilesView/` | 整个目录 |
| `frontend/src/views/PluginsView/` | 整个目录 |
| `frontend/src/views/RulesetsView/` | 整个目录 |
| `frontend/src/views/ScheduledTasksView/` | 整个目录 |
| `frontend/src/views/SettingsView/components/PluginSettings.vue` | 插件设置组件 |
| `frontend/src/constant/profile.ts` | Profile 默认值 |
| `frontend/src/utils/restorer.ts` | 配置还原工具 |
| `frontend/src/utils/generator.ts` | 配置生成器 |

---

## 二、逐文件精确变更

### 1. `frontend/src/stores/index.ts`

**变更**：从 10 个导出减为 6 个

```diff
  export * from './appSettings'
- export * from './profiles'
  export * from './subscribes'
- export * from './rulesets'
- export * from './plugins'
- export * from './scheduledtasks'
  export * from './logs'
  export * from './kernelApi'
  export * from './app'
  export * from './env'
```

---

### 2. `frontend/src/stores/kernelApi.ts`（15 处变更）

#### 2.1 导入变更

```diff
- import { DefaultInboundMixed } from '@/constant/profile'
- import { Inbound, RulesetType, TunStack } from '@/enums/kernel'
+ import { Inbound } from '@/enums/kernel'
  import {
    useAppSettingsStore,
-   useProfilesStore,
    useLogsStore,
    useEnvStore,
-   usePluginsStore,
    useSubscribesStore,
-   useRulesetsStore,
  } from '@/stores'
  import {
-   generateConfigFile,
    updateTrayAndMenus,
    getKernelFileName,
    normalizeProxyHost,
-   restoreProfile,
    deepClone,
    message,
    getKernelRuntimeArgs,
    getKernelRuntimeEnv,
    eventBus,
    sleep,
  } from '@/utils'
+ import { ProcessInfo, KillProcess, ExecBackground, ReadFile, WriteFile, RemoveFile } from '@/bridge'
```

#### 2.2 Store 实例变更

```diff
  const envStore = useEnvStore()
  const logsStore = useLogsStore()
- const pluginsStore = usePluginsStore()
- const profilesStore = useProfilesStore()
  const subscribesStore = useSubscribesStore()
- const rulesetsStore = useRulesetsStore()
  const appSettingsStore = useAppSettingsStore()
```

#### 2.3 状态变量变更

```diff
- let runtimeProfile: App.Profile | undefined
+ let runtimeConfig: Recordable | undefined
+ let cachedTunInbound: Recordable | undefined
```

#### 2.4 `refreshConfig()` 重写

```diff
  const refreshConfig = async () => {
    const _config = await getConfigs()
    config.value = { ..._config, tun: config.value.tun }

-   if (!runtimeProfile) {
+   if (!runtimeConfig) {
      const txt = await ReadFile(CoreConfigFilePath)
-     runtimeProfile = restoreProfile(JSON.parse(txt))
-     // ... 合并 profile 到 runtimeProfile 的复杂逻辑全部删除
+     runtimeConfig = JSON.parse(txt)
    }

-   // Profile 包裹格式的属性访问
-   const mixed = runtimeProfile.inbounds.find((v) => v.enable && v.mixed)
-   const http = runtimeProfile.inbounds.find((v) => v.enable && v.http)
-   const socks = runtimeProfile.inbounds.find((v) => v.enable && v.socks)
-   const tun = runtimeProfile.inbounds.find((v) => v.tun)
-   config.value['mixed-port'] = mixed?.mixed?.listen.listen_port || 0
-   config.value['port'] = http?.http?.listen.listen_port || 0
-   config.value['socks-port'] = socks?.socks?.listen.listen_port || 0
-   config.value['allow-lan'] = [mixed?.mixed?.listen.listen, ...].some(...)
-   config.value.tun.enable = !!tun?.enable
-   config.value.tun.device = tun?.tun?.interface_name || ''
-   config.value.tun.stack = tun?.tun?.stack || ''
-   config.value['interface-name'] = runtimeProfile.route.default_interface

+   // 扁平 sing-box 配置格式的属性访问
+   const config_ = runtimeConfig!
+   const inbounds: Recordable[] = config_.inbounds || []
+   const mixed = inbounds.find((v) => v.type === 'mixed')
+   const http = inbounds.find((v) => v.type === 'http')
+   const socks = inbounds.find((v) => v.type === 'socks')
+   const tun = inbounds.find((v) => v.type === 'tun')
+   config.value['mixed-port'] = mixed?.listen_port || 0
+   config.value['port'] = http?.listen_port || 0
+   config.value['socks-port'] = socks?.listen_port || 0
+   config.value['allow-lan'] = [mixed?.listen, http?.listen, socks?.listen].some(...)
+   config.value.tun.enable = !!tun
+   config.value.tun.device = tun?.interface_name || ''
+   config.value.tun.stack = tun?.stack || ''
+   config.value['interface-name'] = config_.route?.default_interface || ''
  }
```

#### 2.5 `updateConfig()` 中所有 `patchInbound*` 函数重写

**patchInbound()**：
```diff
  const patchInbound = () => {
-   if (!runtimeProfile) return
-   const inbound = runtimeProfile.inbounds.find(
-     (v) => (v.type === Inbound.Mixed && v.mixed?.listen.listen_port) || ...
-   )
-   if (!inbound) throw 'home.overview.needPort'
-   inbound.enable = true
+   if (!runtimeConfig) return
+   const inbounds: Recordable[] = runtimeConfig.inbounds || []
+   const inbound = inbounds.find(
+     (v) => (v.type === 'mixed' && v.listen_port) || ...
+   )
+   if (!inbound) throw 'home.overview.needPort'
  }
```

**patchInboundPort()**：
```diff
  const patchInboundPort = (type, port) => {
-   if (!runtimeProfile) return
-   let inbound = runtimeProfile.inbounds.find((v) => v.type === type)
+   if (!runtimeConfig) return
+   const inbounds: Recordable[] = runtimeConfig.inbounds || []
+   let inbound = inbounds.find((v) => v.type === type)
    if (inbound) {
-     inbound[type]!.listen.listen_port = port
+     inbound.listen_port = port
    } else {
-     const _type = DefaultInboundMixed()!
-     _type.listen.listen_port = port
-     inbound = { id: type+'-in', tag: type+'-in', type, enable: true, [type]: _type }
-     runtimeProfile.inbounds.push(inbound)
+     inbound = { type, tag: type+'-in', listen: '127.0.0.1', listen_port: port }
+     inbounds.push(inbound)
+     runtimeConfig.inbounds = inbounds
    }
-   inbound.enable = port !== 0
  }
```

**patchInboundAddress()**：
```diff
  const patchInboundAddress = (allowLan) => {
-   if (!runtimeProfile) return
-   runtimeProfile.inbounds.forEach((inbound) => {
-     if (inbound.type === Inbound.Tun) return
-     inbound[inbound.type]!.listen.listen = allowLan ? '0.0.0.0' : '127.0.0.1'
+   if (!runtimeConfig) return
+   const inbounds: Recordable[] = runtimeConfig.inbounds || []
+   inbounds.forEach((inbound) => {
+     if (inbound.type === 'tun') return
+     inbound.listen = allowLan ? '0.0.0.0' : '127.0.0.1'
    })
  }
```

**patchInboundTun() — 核心变更**：
```diff
  const patchInboundTun = (options) => {
-   if (!runtimeProfile) return
-   const inbound = runtimeProfile.inbounds.find((v) => v.type === Inbound.Tun)
-   if (!inbound) throw 'home.overview.needTun'
-   options = { ...config.value.tun, ...options }
-   inbound.enable = options.enable
-   inbound.tun!.stack = (options.stack || TunStack.Mixed) as App.TunStack
-   inbound.tun!.interface_name = options.device || ''
-   if (options.interface_name) {
-     runtimeProfile.route.default_interface = options.interface_name
+   if (!runtimeConfig) return
+   const inbounds: Recordable[] = runtimeConfig.inbounds || []
+   const tunIndex = inbounds.findIndex((v) => v.type === 'tun')
+   options = { ...config.value.tun, ...options }
+   // 关闭 TUN 时移除入站
+   if (!options.enable) {
+     if (tunIndex !== -1) {
+       inbounds.splice(tunIndex, 1)
+     }
+     return
    }
-   runtimeProfile.route.auto_detect_interface = !options.interface_name
+   // 开启 TUN 时，从缓存恢复原始配置
+   if (tunIndex === -1 && cachedTunInbound) {
+     inbounds.push({ ...cachedTunInbound })
+     runtimeConfig.inbounds = inbounds
+   }
+   const inbound = inbounds.find((v) => v.type === 'tun')
+   if (!inbound) return
+   inbound.stack = options.stack || 'mixed'
+   inbound.interface_name = options.device || ''
+   if (options.interface_name) {
+     runtimeConfig.route = runtimeConfig.route || {}
+     runtimeConfig.route.default_interface = options.interface_name
+   }
+   if (runtimeConfig.route) {
+     runtimeConfig.route.auto_detect_interface = !options.interface_name
+   }
  }
```

#### 2.6 `startCore()` 重写

```diff
- const startCore = async (_profile?: App.Profile) => {
+ const startCore = async () => {
    if (running.value) throw 'The core is already running'
    logsStore.clearKernelLog()

-   const { profile: profileID, branch } = appSettingsStore.app.kernel
-   const profile = _profile || profilesStore.getProfileById(profileID)
-   if (!profile) throw 'Choose a profile first'
-   if (!_profile) { runtimeProfile = undefined }
+   const { activeSubscription, branch } = appSettingsStore.app.kernel
+   const sub = subscribesStore.getSubscribeById(activeSubscription)
+   if (!sub) throw 'Please select a subscription first'
+   if (sub.configMode !== 'full') throw 'Selected subscription is not a full config'

    starting.value = true
    try {
-     await generateConfigFile(profile, (config) =>
-       pluginsStore.onBeforeCoreStartTrigger(config, profile),
-     )
+     // 如果 runtimeConfig 已存在（重启场景），保留已有配置
+     if (!runtimeConfig) {
+       const configJson = await ReadFile(sub.path)
+       runtimeConfig = JSON.parse(configJson)
+       runtimeConfig.experimental = runtimeConfig.experimental || {}
+       runtimeConfig.experimental.cache_file = runtimeConfig.experimental.cache_file || {}
+       runtimeConfig.experimental.cache_file.path = 'cache.db'
+
+       // 缓存 TUN 配置并移除，避免非管理员权限下启动失败
+       const inbounds: Recordable[] = runtimeConfig.inbounds || []
+       const tunIndex = inbounds.findIndex((v) => v.type === 'tun')
+       if (tunIndex !== -1) {
+         cachedTunInbound = inbounds.splice(tunIndex, 1)[0]
+       }
+     }
+
+     await WriteFile(CoreConfigFilePath, JSON.stringify(runtimeConfig, null, 2))

      const isAlpha = branch === Branch.Alpha
      const pid = await runCoreProcess(isAlpha)
      pid && (await onCoreStarted(pid))
    } finally {
      starting.value = false
    }
  }
```

#### 2.7 `onCoreStarted()` — 删除插件触发

```diff
    await envStore.updateSystemProxyStatus()
-   await pluginsStore.onCoreStartedTrigger()
  }
```

#### 2.8 `onCoreStopped()` — 删除插件触发

```diff
    resetConfig()
-   await pluginsStore.onCoreStoppedTrigger()
    coreStoppedResolver(null)
  }
```

#### 2.9 `stopCore()` — 删除插件触发

```diff
    stopping.value = true
    try {
-     await pluginsStore.onBeforeCoreStopTrigger()
      await KillProcess(corePid.value)
```

#### 2.10 `restartCore()` — 参数和逻辑变更

```diff
- const restartCore = async (cleanupTask?, keepRuntimeProfile = false) => {
+ const restartCore = async (cleanupTask?, keepRuntime = false) => {
    restarting.value = true
    try {
      await stopCore()
      await cleanupTask?.()
-     await startCore(keepRuntimeProfile ? runtimeProfile : undefined)
+     if (!keepRuntime) {
+       runtimeConfig = undefined
+     }
+     await startCore()
    } finally {
      needRestart.value = false
      restarting.value = false
    }
  }
```

#### 2.11 `getProxyProfileOptions()` 简化

```diff
  const getProxyProfileOptions = (proxyType) => {
-   const inboundTypeMap = { mixed: Inbound.Mixed, http: Inbound.Http, socks: Inbound.Socks }
-   const inbound = runtimeProfile?.inbounds.find(
-     (item) => item.enable && item.type === inboundTypeMap[proxyType]
-   )
-   const inboundOptions = proxyType === Inbound.Mixed ? inbound?.mixed : ...
-   const listen = inboundOptions?.listen.listen || ''
-   const auth = inboundOptions?.users[0]?.trim()
+   const inbounds: Recordable[] = runtimeConfig?.inbounds || []
+   const inbound = inbounds.find((item) => item.type === proxyType)
+   const listen = inbound?.listen || ''
+   const users = inbound?.users || []
+   const auth = users[0]?.trim()
    // ... 后续相同
  }
```

#### 2.12 事件监听器变更

```diff
  // profileChange: profile → activeSubscription
  eventBus.on('profileChange', ({ id }) => {
-   if (running.value && id === appSettingsStore.app.kernel.profile) {
+   if (running.value && id === appSettingsStore.app.kernel.activeSubscription) {
      needRestart.value = true
    }
  })

  // subscriptionChange: 简化
  eventBus.on('subscriptionChange', ({ id }) => {
-   if (running.value && profilesStore.currentProfile) {
-     const inUse = profilesStore.currentProfile.outbounds.some(({ outbounds }) =>
-       outbounds.some((outbound) => outbound.type === 'Subscription' && outbound.id === id),
-     )
-     if (inUse) { needRestart.value = true }
+   if (running.value) {
+     const activeId = appSettingsStore.app.kernel.activeSubscription
+     if (activeId === id) { needRestart.value = true }
    }
  })

  // subscriptionsChange: 简化
  eventBus.on('subscriptionsChange', () => {
-   if (running.value && profilesStore.currentProfile) {
-     const enabledSubs = subscribesStore.subscribes.flatMap((v) => (v.disabled ? [] : v.id))
-     const inUse = profilesStore.currentProfile.outbounds.some(({ outbounds }) =>
-       outbounds.some((outbound) => outbound.type === 'Subscription' && enabledSubs.includes(outbound.id)),
-     )
-     if (inUse) { needRestart.value = true }
+   if (running.value) {
+     needRestart.value = true
    }
  })
```

#### 2.13 删除事件监听器

```diff
- // 删除 collectRulesetIDs 函数
- // 删除 rulesetChange 事件监听
- // 删除 rulesetsChange 事件监听
```

#### 2.14 返回对象添加字段

```diff
    getProxyEndpoint,
+   getRuntimeConfig: () => runtimeConfig,
    onLogs,
```

---

### 3. `frontend/src/stores/subscribes.ts`（5 处变更）

#### 3.1 导入变更

```diff
- import { PluginTriggerEvent, RequestMethod, RequestProxyMode } from '@/enums/app'
+ import { RequestMethod, RequestProxyMode } from '@/enums/app'
- import { usePluginsStore } from '@/stores'
  import {
    sampleID,
    isValidSubJson,
    isValidSubYAML,
    isValidBase64,
+   isFullSingboxConfig,
    stringifyNoFolding,
    // ...
  } from '@/utils'
```

#### 3.2 `_doUpdateSub()` 中添加完整配置检测

在 body 获取之后、代理解析逻辑之前插入：

```typescript
// ===== 完整配置检测 =====
if (s.type !== 'Manual' && isFullSingboxConfig(body)) {
  const rawConfig = JSON.parse(body)

  // 1. 提取代理节点信息
  const outbounds = rawConfig.outbounds || []
  const proxiesList = outbounds
    .filter((o) => !['selector', 'urltest'].includes(o.type))
    .map((o) => ({ tag: o.tag, type: o.type }))
  s.proxies = proxiesList.map(({ tag, type }) => {
    const id = s.proxies.find((v) => v.tag === tag)?.id || sampleID()
    return { id, tag, type }
  })

  // 2. 保存完整配置到订阅文件
  await WriteFile(s.path, body)

  // 3. 标记为完整配置模式
  s.configMode = 'full'

  // 4. 更新用户信息
  s.upload = userInfo.upload ?? 0
  s.download = userInfo.download ?? 0
  s.total = userInfo.total ?? 0
  s.expire = userInfo.expire * 1000
  s.updateTime = Date.now()

  return
}
// ===== 完整配置检测结束 =====

// 标记为代理列表模式
s.configMode = 'proxy'
```

#### 3.3 删除插件触发和遗留检查

```diff
- const pluginStore = usePluginsStore()
- proxies = await pluginStore.onSubscribeTrigger(proxies, s)
- if (proxies.some((proxy) => proxy.name && !proxy.tag) || proxies[0]?.base64) {
-   throw 'You need to install the [节点转换] plugin first'
- }
```

#### 3.4 脚本执行函数名变更

```diff
- `${s.script}; return await ${PluginTriggerEvent.OnSubscribe}(proxies, subscription)`
+ `${s.script}; return await onSubscribe(proxies, subscription)`
```

#### 3.5 模板添加 configMode 字段

```diff
    proxies: [],
    script: DefaultSubscribeScript,
+   configMode: 'proxy',
  }
```

---

### 4. `frontend/src/stores/appSettings.ts`（11 处变更）

#### 4.1 导入变更

```diff
- DefaultPluginHubSources,
```

#### 4.2 删除视图字段默认值

```diff
    profilesView: View.Grid,      // 删除
    subscribesView: View.Grid,    // 保留
    rulesetsView: View.Grid,      // 删除
    pluginsView: View.Grid,       // 删除
    scheduledtasksView: View.Grid,// 删除
```

#### 4.3 系统代理默认值变更

```diff
- autoSetSystemProxy: true,
+ autoSetSystemProxy: false,
```

#### 4.4 内核字段重命名

```diff
    kernel: {
-     profile: '',
+     activeSubscription: '',
```

#### 4.5 删除插件相关默认值

```diff
- plugins: {
-   sources: DefaultPluginHubSources(),
- },
- pluginSettings: {},
```

#### 4.6 删除其他字段

```diff
- addPluginToMenu: false,
- rollingRelease: true,
- pages: ['Overview', 'Profiles', 'Subscriptions', 'Plugins'],
```

#### 4.7 删除旧迁移逻辑

```diff
- if (!settings.plugins) {
-   settings.plugins = { sources: DefaultPluginHubSources() }
- }
```

#### 4.8 添加新迁移逻辑

```typescript
// 向后兼容：kernel.profile → kernel.activeSubscription
if ('profile' in settings.kernel && !('activeSubscription' in settings.kernel)) {
  ;(settings.kernel as any).activeSubscription = (settings.kernel as any).profile
}
delete (settings.kernel as any).profile

// 移除已废弃的 profilesView 设置
if ('profilesView' in settings) {
  delete (settings as any).profilesView
}
```

#### 4.9 watcher 简化

```diff
  watch(
    [
      themeMode,
      appStore.locales,
      () => app.value.color,
      () => app.value.lang,
-     () => app.value.addPluginToMenu,
    ],
    updateTrayAndMenus,
  )
```

---

### 5. `frontend/src/hooks/useAppBootstrap.ts`（4 处变更）

#### 5.1 删除导入

```diff
- import { IsStartup } from '@/bridge'
```

#### 5.2 删除 Store 实例

```diff
- const profilesStore = Stores.useProfilesStore()
  const subscribesStore = Stores.useSubscribesStore()
- const rulesetsStore = Stores.useRulesetsStore()
- const pluginsStore = Stores.usePluginsStore()
- const scheduledTasksStore = Stores.useScheduledTasksStore()
```

#### 5.3 简化 Promise.all

```diff
  await Promise.all([
    appSettings.setupAppSettings(),
-   profilesStore.setupProfiles(),
    subscribesStore.setupSubscribes(),
-   rulesetsStore.setupRulesets(),
-   pluginsStore.setupPlugins(),
-   scheduledTasksStore.setupScheduledTasks(),
  ])
```

#### 5.4 删除插件触发器

```diff
  percent.value = 40
- if (await IsStartup()) {
-   await pluginsStore.onStartupTrigger().catch(showError)
- }
- percent.value = 40
- await pluginsStore.onReadyTrigger().catch(showError)
```

---

### 6. `frontend/src/router/routes.ts`

删除4个路由及其 import：Profiles、Rulesets、Plugins、ScheduledTasks。只保留 Overview、Subscriptions、Settings。

---

### 7. `frontend/src/views/HomeView/index.vue`

#### 7.1 导入变更

```diff
- import { ref, computed, watch, useTemplateRef } from 'vue'
+ import { ref, watch, useTemplateRef } from 'vue'
- import { useAppSettingsStore, useProfilesStore, useKernelApiStore } from '@/stores'
+ import { useAppSettingsStore, useSubscribesStore, useKernelApiStore } from '@/stores'
```

#### 7.2 Store 实例变更

```diff
- const profilesStore = useProfilesStore()
+ const subscribesStore = useSubscribesStore()
```

#### 7.3 添加 fullConfigSubs 计算属性

```typescript
const fullConfigSubs = computed(() =>
  subscribesStore.subscribes.filter((s) => s.configMode === 'full' && !s.disabled),
)
```

#### 7.4 模板变更

```diff
- v-if="profilesStore.profiles.length === 0"
+ v-if="fullConfigSubs.length === 0"

- v-for="p in profilesStore.profiles.slice(0, ...)"
+ v-for="s in fullConfigSubs.slice(0, fullConfigSubs.length > 4 ? 3 : 4)"

- :selected="appSettingsStore.app.kernel.profile === p.id"
- @click="appSettingsStore.app.kernel.profile = p.id"
+ :selected="appSettingsStore.app.kernel.activeSubscription === s.id"
+ @click="appSettingsStore.app.kernel.activeSubscription = s.id"

- {{ p.name }}
+ {{ s.name }}
```

---

### 8. `frontend/src/views/HomeView/components/QuickStart.vue`

#### 8.1 删除 Profile 创建逻辑

```diff
- import { useProfilesStore, useAppSettingsStore, useSubscribesStore } from '@/stores'
+ import { useAppSettingsStore, useSubscribesStore } from '@/stores'
- const profilesStore = useProfilesStore()
```

#### 8.2 handleSave 简化

```diff
    await subscribeStore.updateSubscribe(sub.id)
-   const profile = profilesStore.getProfileTemplate(name.value)
-   if (profile.outbounds[0] && profile.outbounds[1]) {
-     profile.outbounds[0].outbounds.push({ id: sub.id, tag: sub.id, type: 'Subscription' })
-     profile.outbounds[1].outbounds.push({ id: sub.id, tag: sub.id, type: 'Subscription' })
-   }
-   await profilesStore.addProfile(profile)
-   appSettingsStore.app.kernel.profile = profile.id
+   if (sub.configMode === 'full') {
+     appSettingsStore.app.kernel.activeSubscription = sub.id
+   }
```

#### 8.3 模板 placeholder 变更

```diff
- :placeholder="$t('profile.name')"
+ :placeholder="$t('subscribe.name')"
```

---

### 9. `frontend/src/components/_common/AboutView.vue`

从 114 行简化为 12 行：

```vue
<script setup lang="ts">
import logo from '@/assets/logo'
import { APP_TITLE, APP_VERSION } from '@/utils'
</script>

<template>
  <div class="flex flex-col items-center py-12">
    <img :src="logo" class="w-64" draggable="false" />
    <div class="py-8 font-bold">{{ APP_TITLE }}</div>
    <div class="text-14 opacity-60">{{ APP_VERSION }}</div>
  </div>
</template>
```

删除内容：
- GitHub / TG Group / TG Channel 链接按钮
- 自动检测更新逻辑
- 版本号点击检测更新
- 更新下载和重启功能
- macOS OSA 脚本重启逻辑

---

### 10. `frontend/src/views/SubscribesView/components/SubscribeForm.vue`

删除整个"更多选项"区域（约 100 行），包括：
- `showMore` / `toggleShowMore` 状态
- `handleTestProxy` 函数
- `proxyTesting`、`isRemote`、`isCustomProxy`、`showProxyTest` 计算属性
- 表单字段：include、exclude、includeProtocol、excludeProtocol、proxyPrefix、website、inSecure、requestTimeout、requestMethod、requestProxyMode、customProxy、header.request、header.response
- 代理测试按钮

---

### 11. `frontend/src/views/SettingsView/index.vue`

删除 PluginSettings 标签页：
```diff
- import PluginSettings from './components/PluginSettings.vue'
  // settings 数组中删除 plugins 项
```

---

### 12. `frontend/src/views/SettingsView/components/components/AdvancedSettings.vue`

删除滚动发行（Rolling Release）部分。

---

### 13. `frontend/src/views/SettingsView/components/components/PersonalizationSettings.vue`

删除页面可见性设置（`pages` 相关）。

---

### 14. `frontend/src/views/SettingsView/components/components/BehaviorSettings.vue`

删除 `addPluginToMenu` 开关。

---

### 15. `frontend/src/components/_common/NavigationBar.vue`

简化路由过滤，移除 `pages` 判断逻辑。

---

### 16. `frontend/src/types/app.d.ts`

#### 删除的接口
- `Profile`（约 15 行）
- `Plugin`（约 60 行）
- `RuleSet`（约 15 行）
- `RulesetHub`（约 5 行）
- `ScheduledTask`（约 20 行）
- `Outbound`、`Route`、`DnsServerConfig`、`DnsRule`、`Dns`（约 70 行）

#### 删除的类型别名
- `LogLevel`、`ClashMode`、`OutboundType`、`DnsServer`、`DnsRuleAction`、`RuleActionReject`、`Sniffer`

#### AppSettings 变更

```diff
  interface AppSettings {
-   profilesView: View
    subscribesView: View
-   rulesetsView: View
-   pluginsView: View
-   scheduledtasksView: View
    // ...
    kernel: {
-     profile: string
+     activeSubscription: string
    }
-   plugins: { sources: ... }
-   addPluginToMenu: boolean
-   pluginSettings: Record<string, Record<string, any>>
-   rollingRelease: boolean
-   pages: string[]
  }
```

#### Subscription 接口添加字段

```diff
  interface Subscription {
    // ...
+   configMode: 'proxy' | 'full'
  }
```

---

### 17. `frontend/src/enums/app.ts`

删除整个枚举：
- `ScheduledTasksType`
- `PluginTrigger`
- `PluginTriggerEvent`

---

### 18. `frontend/src/constant/app.ts`

删除：
- 导入：`PluginTrigger`、`ScheduledTasksType`、`APP_TITLE`
- 常量：`ProfilesFilePath`、`RulesetsFilePath`、`PluginsFilePath`、`ScheduledTasksFilePath`、`PluginHubFilePath`、`RulesetHubFilePath`、`RollingReleaseDirectory`
- 函数：`DefaultPluginHubSources`
- 数组：`PluginsTriggerOptions`、`ScheduledTaskOptions`

---

### 19. `frontend/src/utils/env.ts`

**无变更**。两个版本完全相同。`PROJECT_URL`、`TG_GROUP`、`TG_CHANNEL` 均保留（在 env.ts 中定义，但 AboutView 不再引用它们）。

---

### 20. `frontend/src/utils/tray.ts`

删除插件菜单逻辑（约 30 行）和 `usePluginsStore` 导入。

---

### 21. `frontend/src/utils/helper.ts`

删除 `addToRuleSet()` 函数、`usePluginsStore`/`useRulesetsStore` 导入、`reloadApp`/`exitApp` 中的插件触发器调用。

---

### 22. `frontend/src/utils/migration.ts`

删除 `migrateProfiles` 函数。

---

### 23. `frontend/src/utils/index.ts`

```diff
- export * from './generator'
- export * from './restorer'
```

---

### 24. Go 后端

#### `bridge/types.go`
```diff
  type AppConfig struct {
    // ...
-   RollingRelease bool `yaml:"rollingRelease" default:"true"`
  }
```

#### `bridge/utils.go`
删除 `RollingRelease()` 函数（约 30 行）。

#### `main.go`
```diff
  AssetServer: &assets.AssetServer{
-   Middleware: bridge.RollingRelease,
  },
```

---

## 三、mihomo 适配要点

sing-box 与 mihomo 的配置格式差异：

| 维度 | sing-box | mihomo |
|------|----------|--------|
| 配置格式 | JSON | YAML |
| 入站结构 | `inbounds` 数组，每个有 `type` 字段 | 顶层 `mixed-port`/`port`/`socks-port` + `tun` 对象 |
| TUN 配置 | `inbounds` 中的 `type: 'tun'` 入站 | 顶层 `tun.enable`/`tun.stack`/`tun.device` |
| 完整配置检测 | `outbounds` + `rules` | `proxies`/`proxy-providers` + `rules`/`rule-providers` |
| 代理节点 | `outbounds` 数组 | `proxies` 数组 |
| 运行时配置缓存 | `runtimeConfig` JSON 对象 | `runtimeConfig` YAML 对象 |
| TUN 缓存 | `cachedTunInbound`（从 inbounds splice） | `cachedTunConfig`（从顶层 tun 复制后 delete） |

### mihomo 的 startCore 适配

```typescript
const startCore = async () => {
  // ...
  if (!runtimeConfig) {
    const configYaml = await ReadFile(sub.path)
    runtimeConfig = YAML.parse(configYaml)

    // mihomo: 缓存顶层 tun 配置并删除
    if (runtimeConfig.tun) {
      cachedTunConfig = deepClone(runtimeConfig.tun)
      delete runtimeConfig.tun
    }
  }

  await WriteFile(CoreConfigFilePath, YAML.stringify(runtimeConfig))
  // ...
}
```

### mihomo 的 patchTun 适配

```typescript
const patchTun = (enable: boolean) => {
  if (!runtimeConfig) return
  if (!enable) {
    delete runtimeConfig.tun
    return
  }
  if (!runtimeConfig.tun && cachedTunConfig) {
    runtimeConfig.tun = { ...cachedTunConfig }
  }
}
```

### mihomo 的 refreshConfig 适配

```typescript
const refreshConfig = async () => {
  const _config = await getConfigs()
  config.value = { ..._config, tun: config.value.tun }

  if (!runtimeConfig) {
    const txt = await ReadFile(CoreConfigFilePath)
    runtimeConfig = YAML.parse(txt)
  }

  // mihomo: 直接从顶层读取端口
  config.value['mixed-port'] = runtimeConfig['mixed-port'] || 0
  config.value['port'] = runtimeConfig['port'] || 0
  config.value['socks-port'] = runtimeConfig['socks-port'] || 0
  config.value['allow-lan'] = runtimeConfig['allow-lan'] || false
  config.value.tun.enable = runtimeConfig.tun?.enable || false
  config.value.tun.stack = runtimeConfig.tun?.stack || ''
  config.value.tun.device = runtimeConfig.tun?.device || ''
}
```

### mihomo 的完整配置检测

```typescript
const isFullMihomoConfig = (yamlContent: string): boolean => {
  try {
    const parsed = YAML.parse(yamlContent)
    const hasProxies = Array.isArray(parsed.proxies) && parsed.proxies.length > 0
    const hasProviders = parsed['proxy-providers'] &&
      Object.keys(parsed['proxy-providers']).length > 0
    const hasRules = Array.isArray(parsed.rules) && parsed.rules.length > 0
    const hasRuleProviders = parsed['rule-providers'] &&
      Object.keys(parsed['rule-providers']).length > 0
    return (hasProxies || hasProviders) && (hasRules || hasRuleProviders)
  } catch {
    return false
  }
}
```

---

## 四、执行顺序

```
阶段 1：删除文件（低风险）
  ├── 删除 4 个废弃 Store 文件
  ├── 删除 4 个废弃页面目录
  ├── 删除 generator.ts, restorer.ts, constant/profile.ts, PluginSettings.vue
  └── 更新 stores/index.ts 导出

阶段 2：类型和常量清理（低风险）
  ├── 修改 types/app.d.ts（删除接口、修改 AppSettings）
  ├── 修改 enums/app.ts（删除 3 个枚举）
  ├── 修改 constant/app.ts（删除常量和函数）
  └── utils/env.ts 无需修改

阶段 3：核心 Store 改造（高风险）
  ├── 改造 appSettings.ts（11 处变更 + 迁移逻辑）
  ├── 改造 subscribes.ts（5 处变更 + configMode 检测）
  ├── 改造 kernelApi.ts（15 处变更 + TUN 处理）
  └── 改造 useAppBootstrap.ts（4 处变更）

阶段 4：页面和组件改造（中风险）
  ├── 改造 HomeView（Profile 卡片 → 订阅卡片）
  ├── 改造 QuickStart（删除 Profile 创建）
  ├── 改造 SubscribeForm（删除更多选项）
  ├── 改造 SettingsView（删除插件标签页）
  ├── 改造 AboutView（极简化 12 行）
  └── 改造 NavigationBar（简化路由过滤）

阶段 5：工具函数清理（低风险）
  ├── 改造 tray.ts（删除插件菜单）
  ├── 改造 helper.ts（删除规则集/插件依赖）
  ├── 改造 migration.ts（删除 migrateProfiles）
  └── 改造 utils/index.ts（删除导出）

阶段 6：Go 后端改造（低风险）
  ├── 改造 bridge/types.go
  ├── 改造 bridge/utils.go
  └── 改造 main.go

阶段 7：测试验证
  ├── 订阅拉取 → 自动检测 configMode
  ├── 选择 full 模式订阅 → 启动内核
  ├── TUN 默认关闭 → 手动开启 → 重启保持
  ├── 系统代理默认关闭
  └── 旧设置自动迁移（profile → activeSubscription）
```
