import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import {
  getConfigs,
  setConfigs,
  getProxies,
  onLogs,
  onMemory,
  onTraffic,
  onConnections,
  initWebsocket,
  destroyWebsocket,
  probeApiAvailability,
  getProviders,
} from '@/api/kernel'
import { ProcessInfo, KillProcess, ExecBackground, ReadFile, WriteFile, RemoveFile } from '@/bridge'
import { CoreConfigFilePath, CoreLogFilePath, CorePidFilePath, CoreWorkingDirectory } from '@/constant/kernel'
import { Branch } from '@/enums/app'
import { useAppSettingsStore, useLogsStore, useEnvStore, useSubscribesStore } from '@/stores'
import {
  updateTrayAndMenus,
  getKernelFileName,
  normalizeProxyHost,
  deepClone,
  message,
  getKernelRuntimeArgs,
  getKernelRuntimeEnv,
  eventBus,
  sleep,
} from '@/utils'
import { parse, stringify } from 'yaml'

import type { CoreApiConfig, CoreApiProxy } from '@/types/kernel'

export type ProxyType = 'mixed' | 'http' | 'socks'
export type ProxyEndpoint = {
  schema: 'http' | 'socks5'
  host: string
  port: number
  username: string
  password: string
  proxyType: ProxyType
}

export const useKernelApiStore = defineStore('kernelApi', () => {
  const envStore = useEnvStore()
  const logsStore = useLogsStore()
  const subscribesStore = useSubscribesStore()
  const appSettingsStore = useAppSettingsStore()

  /** RESTful API */
  const config = ref<CoreApiConfig>({
    port: 0,
    'socks-port': 0,
    'mixed-port': 0,
    'interface-name': '',
    'allow-lan': false,
    mode: '',
    tun: {
      enable: false,
      stack: '',
      device: '',
    },
  })

  const proxies = ref<Record<string, CoreApiProxy>>({})

  let runtimeConfig: Recordable | undefined
  let cachedTunConfig: Recordable | undefined
  // runtimeConfig 的来源订阅 id，切换订阅后据此使配置缓存失效
  let runtimeConfigSubId = ''

  const refreshConfig = async () => {
    const _config = await getConfigs()
    config.value = { ..._config, tun: config.value.tun }

    if (!runtimeConfig) {
      const txt = await ReadFile(CoreConfigFilePath).catch(() => '')
      if (txt) {
        runtimeConfig = parse(txt)
      }
    }

    if (runtimeConfig) {
      config.value['mixed-port'] = runtimeConfig['mixed-port'] || 0
      config.value['port'] = runtimeConfig['port'] || 0
      config.value['socks-port'] = runtimeConfig['socks-port'] || 0
      config.value['allow-lan'] = runtimeConfig['allow-lan'] || false
      config.value.tun.enable = runtimeConfig.tun?.enable || false
      config.value.tun.stack = runtimeConfig.tun?.stack || ''
      config.value.tun.device = runtimeConfig.tun?.device || ''
      config.value['interface-name'] = runtimeConfig['interface-name'] || ''
    }
  }

  const resetConfig = () => {
    config.value.port = 0
    config.value['socks-port'] = 0
    config.value['mixed-port'] = 0
    config.value['interface-name'] = ''
    config.value['allow-lan'] = false
    config.value.mode = ''
    config.value.tun.enable = false
    config.value.tun.stack = ''
    config.value.tun.device = ''
  }

  const updateConfig = async (updates: Recordable) => {
    const [field, value] = Object.entries(updates)[0] || []

    if (field === 'mode') {
      await setConfigs({ mode: value })
      await refreshConfig()
      return
    }

    const patchInboundPort = (type: 'mixed' | 'socks' | 'http', port: number) => {
      if (!runtimeConfig) return
      runtimeConfig[type + '-port'] = port
    }

    const patchAllowLan = (allowLan: boolean) => {
      if (!runtimeConfig) return
      runtimeConfig['allow-lan'] = allowLan
    }

    const patchTun = (options: { enable: boolean; stack?: string; device?: string }) => {
      if (!runtimeConfig) return
      if (!options.enable) {
        // 关闭 TUN 时移除配置
        delete runtimeConfig.tun
        return
      }
      // 开启 TUN 时，从缓存恢复原始配置
      if (!runtimeConfig.tun && cachedTunConfig) {
        runtimeConfig.tun = { ...cachedTunConfig }
      }
      if (runtimeConfig.tun) {
        if (options.stack) runtimeConfig.tun.stack = options.stack
        if (options.device) runtimeConfig.tun.device = options.device
      }
    }

    if (!field) return

    const fieldHandlerMap: Recordable<() => void> = {
      http: () => patchInboundPort('http', value),
      socks: () => patchInboundPort('socks', value),
      mixed: () => patchInboundPort('mixed', value),
      'allow-lan': () => patchAllowLan(value),
      tun: () => patchTun(value),
      'tun-stack': () => patchTun(value),
      'tun-device': () => patchTun(value),
    }

    fieldHandlerMap[field]?.()

    await restartCore(undefined, true)
    await envStore.updateSystemProxyStatus()
  }

  const refreshProviderProxies = async () => {
    const [a, { proxies: b }] = await Promise.all([getProviders(), getProxies()])
    for (const provider in a.providers) {
      if (!b[provider]) {
        for (const proxy of a.providers[provider].proxies) {
          if (!b[proxy.name]) {
            proxy.provider = provider
            b[proxy.name] = proxy
          }
        }
      }
    }
    proxies.value = b
  }

  /* Bridge API */
  const corePid = ref(-1)
  const running = ref(false)
  const starting = ref(false)
  const stopping = ref(false)
  const restarting = ref(false)
  const needRestart = ref(false)
  const coreStateLoading = ref(true)
  let isCoreStartedByThisInstance = false
  let { promise: coreStoppedPromise, resolve: coreStoppedResolver } = Promise.withResolvers()

  const initCoreState = async () => {
    corePid.value = Number(await ReadFile(CorePidFilePath).catch(() => -1))
    const processName = corePid.value === -1 ? '' : await ProcessInfo(corePid.value).catch(() => '')
    running.value = processName.startsWith('mihomo')

    coreStateLoading.value = false

    if (running.value) {
      initWebsocket()
      await Promise.all([refreshConfig(), refreshProviderProxies()])
      await envStore.updateSystemProxyStatus()
    } else if (appSettingsStore.app.autoStartKernel) {
      await startCore()
    }
  }

  const runCoreProcess = async (isAlpha: boolean) => {
    let stopped = false
    const pid = await ExecBackground(
      CoreWorkingDirectory + '/' + getKernelFileName(isAlpha),
      getKernelRuntimeArgs(isAlpha),
      undefined,
      async (end) => {
        stopped = true
        const logs = await ReadFile(CoreLogFilePath, { Range: '-4096' }).catch((err) => String(err))
        logs.split('\n').forEach((line) => line && logsStore.recordKernelLog(line))
        end && logsStore.recordKernelLog(end)
        onCoreStopped()
      },
      {
        PidFile: CorePidFilePath,
        LogFile: CoreLogFilePath,
        Env: getKernelRuntimeEnv(isAlpha),
      },
    )
    while (!stopped) {
      const ok = await probeApiAvailability().catch(() => false)
      if (ok) break
      if (stopped) throw 'Startup failed. Check logs for details.'
      await sleep(500)
    }
    return pid
  }

  const onCoreStarted = async (pid: number) => {
    corePid.value = pid
    running.value = true
    needRestart.value = false
    isCoreStartedByThisInstance = true
    coreStoppedPromise = new Promise((r) => (coreStoppedResolver = r))

    initWebsocket()
    await Promise.all([refreshConfig(), refreshProviderProxies()])

    if (appSettingsStore.app.autoSetSystemProxy) {
      await envStore.setSystemProxy().catch((err) => message.error(err))
    }
    if (appSettingsStore.app.autoSetSystemDNS) {
      await envStore.setSystemDNS(true).catch((err) => message.error(err))
    }
    await envStore.updateSystemProxyStatus()
  }

  const onCoreStopped = async () => {
    if (!isCoreStartedByThisInstance) {
      await RemoveFile(CorePidFilePath)
    }

    corePid.value = -1
    running.value = false
    needRestart.value = false

    destroyWebsocket()

    await envStore.updateSystemProxyStatus()
    if (envStore.systemProxy) {
      await envStore.clearSystemProxy().catch((err) => message.error(err))
    }
    if (appSettingsStore.app.autoSetSystemDNS || envStore.systemDNSSet) {
      await envStore.setSystemDNS(false).catch((err) => message.error(err))
    }

    resetConfig()

    coreStoppedResolver(null)
  }

  const startCore = async () => {
    if (running.value) throw 'The core is already running'

    logsStore.clearKernelLog()

    const { activeSubscription, branch } = appSettingsStore.app.kernel
    const sub = subscribesStore.getSubscribeById(activeSubscription)
    if (!sub) throw 'Please select a subscription first'
    if (sub.configMode !== 'full') throw 'Selected subscription is not a full config'

    starting.value = true
    try {
      // 切换订阅后：旧配置缓存失效，强制从新订阅读取
      if (runtimeConfigSubId !== activeSubscription) {
        runtimeConfig = undefined
      }
      // 如果 runtimeConfig 已存在（重启场景，如用户手动切换 TUN），保留已有配置
      if (!runtimeConfig) {
        const configYaml = await ReadFile(sub.path)
        runtimeConfig = parse(configYaml) as Recordable
        runtimeConfigSubId = activeSubscription

        // 缓存 TUN 配置并移除，避免非管理员权限下启动失败
        if (runtimeConfig!.tun) {
          cachedTunConfig = deepClone(runtimeConfig!.tun)
          delete runtimeConfig!.tun
        }
      }

      await WriteFile(CoreConfigFilePath, stringify(runtimeConfig))

      const isAlpha = branch === Branch.Alpha
      const pid = await runCoreProcess(isAlpha)
      pid && (await onCoreStarted(pid))
    } finally {
      starting.value = false
    }
  }

  const stopCore = async () => {
    if (!running.value) throw 'The core is not running'

    stopping.value = true
    try {
      await KillProcess(corePid.value)
      await (isCoreStartedByThisInstance ? coreStoppedPromise : onCoreStopped())
    } finally {
      stopping.value = false
    }
  }

  const restartCore = async (cleanupTask?: () => Promise<any>, keepRuntime = false) => {
    restarting.value = true
    try {
      await stopCore()
      await cleanupTask?.()
      if (!keepRuntime) {
        runtimeConfig = undefined
        runtimeConfigSubId = ''
      }
      await startCore()
    } finally {
      needRestart.value = false
      restarting.value = false
    }
  }

  const getProxyProfileOptions = () => {
    if (!runtimeConfig) return { host: '127.0.0.1', username: '', password: '' }

    const controller = runtimeConfig['external-controller']?.trim()
    const auth = runtimeConfig.authentication?.[0]?.trim()
    const rawHost = controller?.startsWith('[')
      ? controller.match(/^\[([^\]]+)\](?::\d+)?$/)?.[1]
      : controller?.slice(0, Math.max(controller.lastIndexOf(':'), 0)) || controller
    const host = normalizeProxyHost(rawHost?.trim() || '')

    if (!auth) return { host, username: '', password: '' }

    const [username, ...passwordParts] = auth.split(':')

    return {
      host,
      username: username || '',
      password: passwordParts.join(':'),
    }
  }

  const getProxyEndpoint = (): ProxyEndpoint | undefined => {
    const { port, 'socks-port': socksPort, 'mixed-port': mixedPort } = config.value
    const { host, username, password } = getProxyProfileOptions()
    let targetPort = 0
    let proxyType: ProxyType | undefined

    if (mixedPort) {
      targetPort = mixedPort
      proxyType = 'mixed'
    } else if (port) {
      targetPort = port
      proxyType = 'http'
    } else if (socksPort) {
      targetPort = socksPort
      proxyType = 'socks'
    } else {
      return undefined
    }

    const schema = proxyType === 'socks' ? 'socks5' : 'http'

    return {
      schema,
      host,
      port: targetPort,
      username,
      password,
      proxyType,
    }
  }

  eventBus.on('profileChange', ({ id }) => {
    if (running.value && id === appSettingsStore.app.kernel.activeSubscription) {
      needRestart.value = true
    }
  })

  eventBus.on('subscriptionChange', ({ id }) => {
    if (running.value) {
      const activeId = appSettingsStore.app.kernel.activeSubscription
      if (activeId === id) {
        needRestart.value = true
      }
    }
  })

  eventBus.on('subscriptionsChange', () => {
    if (running.value) {
      needRestart.value = true
    }
  })

  watch(needRestart, (v) => {
    if (v && appSettingsStore.app.autoRestartKernel) {
      restartCore()
    }
  })

  const watchSources = computed(() => {
    const source = [config.value.mode, config.value.tun.enable]
    if (!appSettingsStore.app.addGroupToMenu) return source.join('')

    const { unAvailable, sortByDelay } = appSettingsStore.app.kernel

    const proxySignature = Object.values(proxies.value)
      .map((group) => group.name + group.now)
      .sort()
      .join()

    return source.concat([proxySignature, unAvailable, sortByDelay]).join('')
  })

  watch([watchSources, running], updateTrayAndMenus)

  return {
    startCore,
    stopCore,
    restartCore,
    initCoreState,
    pid: corePid,
    running,
    starting,
    stopping,
    restarting,
    needRestart,
    coreStateLoading,
    config,
    proxies,
    refreshConfig,
    updateConfig,
    refreshProviderProxies,
    getProxyEndpoint,
    getRuntimeConfig: () => runtimeConfig,

    onLogs,
    onMemory,
    onTraffic,
    onConnections,
  }
})
