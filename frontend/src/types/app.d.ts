declare namespace App {
  type OS = 'windows' | 'linux' | 'darwin'
  type Theme = 'auto' | 'light' | 'dark'
  type Color = 'default' | 'green' | 'purple' | 'custom'
  type View = 'grid' | 'list'
  type WindowStartState =
    | 0 // Normal
    | 2 // Minimised
  type WebviewGpuPolicy =
    | 0 // Always
    | 1 // OnDemand
    | 2 // Never
  type RequestProxyMode = 'global' | 'none' | 'system' | 'kernel' | 'custom'
  type RequestMethod = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'HEAD' | 'PATCH'

  interface AppEnv {
    appName: string
    appVersion: string
    basePath: string
    appPath: string
    os: OS
    arch: string
    isPrivileged: boolean
  }

  interface TrayContent {
    icon?: string
    title?: string
    tooltip?: string
  }

  interface Menu {
    label: string
    handler?: (...args: any) => void
    separator?: boolean
    children?: Menu[]
  }

  interface MenuItem {
    type: 'item' | 'separator'
    text?: string
    tooltip?: string
    event?: (() => void) | string
    children?: MenuItem[]
    hidden?: boolean
    checked?: boolean
    checkable?: boolean
  }

  type AppSettings = {
    lang: 'en' | 'zh' | string
    theme: Theme
    color: Color
    primaryColor: string
    secondaryColor: string
    fontFamily: string
    subscribesView: View
    windowStartState: WindowStartState
    webviewGpuPolicy: WebviewGpuPolicy
    contentProtection: boolean
    width: number
    height: number
    exitOnClose: boolean
    closeKernelOnExit: boolean
    autoSetSystemProxy: boolean
    autoSetSystemDNS: boolean
    requestProxyMode: RequestProxyMode
    customProxy: string
    proxyBypassList: string
    systemProxyServices: string[]
    systemProxyDNS: string
    systemDefaultDNS: string
    autoStartKernel: boolean
    autoRestartKernel: boolean
    userAgent: string
    startupDelay: number
    connections: {
      visibility: Record<string, boolean>
      order: string[]
    }
    kernel: {
      realMemoryUsage: boolean
      branch: 'main' | 'alpha'
      activeSubscription: string
      autoClose: boolean
      unAvailable: boolean
      cardMode: boolean
      cardColumns: number
      sortByDelay: boolean
      testUrl: string
      testTimeout: number
      concurrencyLimit: number
      controllerCloseMode: 'all' | 'button'
      controllerSensitivity: number
      main: {
        env: Recordable
        args: string[]
      }
      alpha: {
        env: Recordable
        args: string[]
      }
    }
    addGroupToMenu: boolean
    githubApiToken: string
    githubDownloadAcceleration: boolean
    githubDownloadMirror: string
    multipleInstance: boolean
    debugOutline: boolean
    debugNoAnimation: boolean
    debugNoRounded: boolean
    debugBorder: boolean
    debugUsePointer: boolean
  }

  interface Subscription {
    id: string
    name: string
    upload: number
    download: number
    total: number
    expire: number
    updateTime: number
    type: 'Http' | 'File' | 'Manual'
    url: string
    website: string
    path: string
    include: string
    exclude: string
    includeProtocol: string
    excludeProtocol: string
    proxyPrefix: string
    requestProxyMode: RequestProxyMode
    customProxy: string
    disabled: boolean
    inSecure: boolean
    proxies: { id: string; name: string; type: string }[]
    requestMethod: RequestMethod
    requestTimeout: number
    header: {
      request: Recordable
      response: Recordable
    }
    script: string
    configMode: 'proxy' | 'full'
    // Not Config
    updating?: boolean
  }

  interface CustomActionApi {
    h: typeof import('vue').h
    ref: typeof import('vue').ref
  }

  type CustomActionProps = Recordable
  type CustomActionSlot = import('vue').VNode | string | number | boolean
  type CustomActionSlots = Recordable<
    ((api: CustomActionApi) => CustomActionSlot) | CustomActionSlot
  >

  interface CustomAction<P = CustomActionProps, S = CustomActionSlots> {
    id?: string
    component: string
    componentProps?: P | ((api: CustomActionApi) => P)
    componentSlots?: S | ((api: CustomActionApi) => S)
  }

  type CustomActionFn = ((api: CustomActionApi) => CustomAction) & {
    id?: string
  }

  type ProxyGroup = 'select' | 'url-test' | 'fallback' | 'load-balance'
  type RulesetBehavior = 'domain' | 'ipcidr' | 'classical'
  type RulesetFormat = 'yaml' | 'mrs'
  type RuleType =
    | 'DOMAIN'
    | 'DOMAIN-SUFFIX'
    | 'DOMAIN-KEYWORD'
    | 'DOMAIN-REGEX'
    | 'IP-CIDR'
    | 'IP-CIDR6'
    | 'IP-ASN'
    | 'SRC-IP-CIDR'
    | 'SRC-PORT'
    | 'DST-PORT'
    | 'PROCESS-NAME'
    | 'PROCESS-PATH'
    | 'RULE-SET'
    | 'LOGIC'
    | 'GEOIP'
    | 'GEOSITE'
    | 'SCRIPT'
    | 'MATCH'
    | 'inline'
    | 'InsertionPoint'

}
