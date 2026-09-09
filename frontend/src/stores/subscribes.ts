import { defineStore } from 'pinia'
import { ref } from 'vue'
import { parse } from 'yaml'

import { ReadFile, WriteFile, Requests } from '@/bridge'
import { DefaultSubscribeScript, SubscribesFilePath } from '@/constant/app'
import { RequestMethod, RequestProxyMode } from '@/enums/app'
import {
  sampleID,
  isValidSubYAML,
  ignoredError,
  omitArray,
  isValidBase64,
  stringifyNoFolding,
  asyncPool,
  eventBus,
  buildSmartRegExp,
  GetRequestProxy,
  migrateSubscribes,
} from '@/utils'

export const useSubscribesStore = defineStore('subscribes', () => {
  const subscribes = ref<App.Subscription[]>([])

  const setupSubscribes = async () => {
    const data = await ignoredError(ReadFile, SubscribesFilePath)
    data && (subscribes.value = parse(data))

    await migrateSubscribes(subscribes.value, saveSubscribes)
  }

  const saveSubscribes = () => {
    const s = omitArray(subscribes.value, ['updating'])
    return WriteFile(SubscribesFilePath, stringifyNoFolding(s))
  }

  const addSubscribe = async (s: App.Subscription) => {
    subscribes.value.push(s)
    try {
      await saveSubscribes()
    } catch (error) {
      const idx = subscribes.value.indexOf(s)
      if (idx !== -1) {
        subscribes.value.splice(idx, 1)
      }
      throw error
    }
  }

  const importSubscribe = async (name: string, url: string) => {
    await addSubscribe(getSubscribeTemplate(name, { url }))
  }

  const deleteSubscribe = async (id: string) => {
    const idx = subscribes.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = subscribes.value.splice(idx, 1)[0]!
    try {
      await saveSubscribes()
    } catch (error) {
      subscribes.value.splice(idx, 0, backup)
      throw error
    }

    eventBus.emit('subscriptionChange', { id })
  }

  const editSubscribe = async (id: string, s: App.Subscription) => {
    const idx = subscribes.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = subscribes.value.splice(idx, 1, s)[0]!
    try {
      await saveSubscribes()
    } catch (error) {
      subscribes.value.splice(idx, 1, backup)
      throw error
    }

    eventBus.emit('subscriptionChange', { id })
  }

  const _doUpdateSub = async (s: App.Subscription, options: Partial<App.Subscription> = {}) => {
    const userInfo: Recordable = {}
    let body = ''
    let proxies: Record<string, any>[] = []

    if (s.type === 'Manual') {
      body = await ReadFile(s.path)
    }

    if (s.type === 'File') {
      body = await ReadFile(s.url)
    }

    if (s.type === 'Http') {
      const requestProxyMode = options.requestProxyMode ?? s.requestProxyMode
      const { headers: h, body: b } = await Requests({
        method: options.requestMethod ?? s.requestMethod,
        url: options.url ?? s.url,
        headers: { ...s.header.request, ...options.header?.request },
        autoTransformBody: false,
        options: {
          Insecure: options.inSecure ?? s.inSecure,
          Proxy: await GetRequestProxy(
            requestProxyMode === RequestProxyMode.Global ? undefined : requestProxyMode,
            requestProxyMode === RequestProxyMode.Global
              ? undefined
              : (options.customProxy ?? s.customProxy),
          ),
          Timeout: options.requestTimeout ?? s.requestTimeout,
        },
      })
      Object.assign(h, s.header.response, options.header?.response)
      if (h['Subscription-Userinfo']) {
        ;(h['Subscription-Userinfo'] as string).split(/\s*;\s*/).forEach((part) => {
          const [key, value] = part.split('=') as [string, string]
          userInfo[key] = parseInt(value) || 0
        })
      }
      body = b
    }

    let config: Record<string, any> | undefined

    // ===== 完整配置检测 =====
    if (s.type !== 'Manual' && isFullMihomoConfig(body)) {
      const rawConfig = parse(body) as Record<string, any>

      // 1. 提取代理节点信息
      const proxiesList = rawConfig.proxies || []
      s.proxies = proxiesList.map((proxy: Recordable) => {
        const id = s.proxies.find((v) => v.name === proxy.name)?.id || sampleID()
        return { id, name: proxy.name, type: proxy.type }
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

    if (isValidSubYAML(body)) {
      config = parse(body) as Record<string, any>
      proxies = config.proxies || []
    } else if (isValidBase64(body)) {
      proxies = [{ base64: body }]
    } else {
      throw 'Not a valid subscription data'
    }

    if (s.type !== 'Manual') {
      const r1 = s.include && buildSmartRegExp(s.include)
      const r2 = s.exclude && buildSmartRegExp(s.exclude)
      const r3 = s.includeProtocol && buildSmartRegExp(s.includeProtocol)
      const r4 = s.excludeProtocol && buildSmartRegExp(s.excludeProtocol)

      proxies = proxies.filter((v) => {
        const flag1 = r1 ? r1.test(v.name) : true
        const flag2 = r2 ? r2.test(v.name) : false
        const flag3 = r3 ? r3.test(v.type) : true
        const flag4 = r4 ? r4.test(v.type) : false
        return flag1 && !flag2 && flag3 && !flag4
      })

      if (s.proxyPrefix) {
        proxies.forEach((v) => {
          v.name = v.name.startsWith(s.proxyPrefix) ? v.name : s.proxyPrefix + v.name
        })
      }
    }

    proxies.forEach((proxy: any) => {
      proxy.__id__ = s.proxies.find((v) => v.name === proxy.name)?.id || sampleID()
    })

    s.upload = userInfo.upload ?? 0
    s.download = userInfo.download ?? 0
    s.total = userInfo.total ?? 0
    s.expire = userInfo.expire * 1000
    s.updateTime = Date.now()
    s.proxies = proxies.map(({ name, type, __id__ }) => ({ id: __id__, name, type }))

    const fn = new window.AsyncFunction(
      'proxies',
      'subscription',
      `${s.script}; return await onSubscribe(proxies, subscription)`,
    ) as (
      proxies: Recordable[],
      subscription: App.Subscription,
    ) => Promise<{ proxies: Recordable[]; subscription: App.Subscription }>

    const { proxies: _proxies, subscription } = await fn(proxies, s)

    Object.assign(s, subscription)
    s.proxies = _proxies.map(({ name, type, __id__ }) => ({ id: __id__, name, type }))

    if (s.type === 'Http' || (s.type === 'File' && s.url !== s.path)) {
      proxies = omitArray(_proxies, ['__id__'])
      await WriteFile(s.path, stringifyNoFolding({ proxies }))
    }
  }

  // 检测是否为完整 mihomo 配置文件
  const isFullMihomoConfig = (yamlContent: string): boolean => {
    try {
      const parsed = parse(yamlContent)
      const hasProxies = Array.isArray(parsed.proxies) && parsed.proxies.length > 0
      const hasProviders =
        parsed['proxy-providers'] && Object.keys(parsed['proxy-providers']).length > 0
      const hasRules = Array.isArray(parsed.rules) && parsed.rules.length > 0
      const hasRuleProviders =
        parsed['rule-providers'] && Object.keys(parsed['rule-providers']).length > 0
      return (hasProxies || hasProviders) && (hasRules || hasRuleProviders)
    } catch {
      return false
    }
  }

  const updateSubscribe = async (id: string, options: Partial<App.Subscription> = {}) => {
    const s = subscribes.value.find((v) => v.id === id)
    if (!s) throw id + ' Not Found'
    if (s.disabled) throw s.name + ' Disabled'
    try {
      s.updating = true
      await _doUpdateSub(s, options)
      await saveSubscribes()
    } catch (error: any) {
      throw `Failed to update subscription [${s.name}]. Reason: ${error.message || error}`
    } finally {
      s.updating = false
    }

    eventBus.emit('subscriptionChange', { id })

    return `Subscription [${s.name}] updated successfully.`
  }

  const updateSubscribes = async () => {
    let needSave = false

    const update = async (s: App.Subscription) => {
      const result = { ok: true, id: s.id, name: s.name, result: '' }
      try {
        s.updating = true
        await _doUpdateSub(s)
        needSave = true
        result.result = `Subscription [${s.name}] updated successfully.`
      } catch (error: any) {
        result.ok = false
        result.result = `Failed to update subscription [${s.name}]. Reason: ${error.message || error}`
      } finally {
        s.updating = false
      }
      return result
    }

    const result = await asyncPool(
      5,
      subscribes.value.filter((v) => !v.disabled),
      update,
    )

    if (needSave) await saveSubscribes()

    eventBus.emit('subscriptionsChange', undefined)

    return result.flatMap((v) => (v.ok && v.value) || [])
  }

  const getSubscribeById = (id: string) => subscribes.value.find((v) => v.id === id)

  const getSubscribeTemplate = (name = '', options: { url?: string } = {}): App.Subscription => {
    const id = sampleID()
    return {
      id: id,
      name: name,
      upload: 0,
      download: 0,
      total: 0,
      expire: 0,
      updateTime: 0,
      type: 'Http',
      url: options.url || '',
      website: '',
      path: `data/subscribes/${id}.yaml`,
      include: '',
      exclude: '',
      includeProtocol: '',
      excludeProtocol: '',
      proxyPrefix: '',
      requestProxyMode: RequestProxyMode.Global,
      customProxy: '',
      disabled: false,
      inSecure: false,
      requestMethod: RequestMethod.Get,
      requestTimeout: 15,
      header: {
        request: {
          'User-Agent': 'clash.meta/mihomo',
        },
        response: {},
      },
      script: DefaultSubscribeScript,
      proxies: [],
      configMode: 'proxy' as const,
    }
  }

  return {
    subscribes,
    setupSubscribes,
    saveSubscribes,
    addSubscribe,
    editSubscribe,
    deleteSubscribe,
    updateSubscribe,
    updateSubscribes,
    getSubscribeById,
    importSubscribe,
    getSubscribeTemplate,
  }
})
