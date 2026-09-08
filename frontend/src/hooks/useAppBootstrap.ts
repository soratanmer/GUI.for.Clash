import { ref } from 'vue'

import * as Stores from '@/stores'
import { message, sleep } from '@/utils'

const MIN_SPLASH_DURATION = 1000

export const useAppBootstrap = () => {
  const loading = ref(true)
  const percent = ref(0)
  const hasError = ref(false)

  const envStore = Stores.useEnvStore()
  const appSettings = Stores.useAppSettingsStore()
  const subscribesStore = Stores.useSubscribesStore()
  const kernelApiStore = Stores.useKernelApiStore()

  const showError = (error: unknown) => {
    hasError.value = true
    message.error(error)
  }

  const initialize = async () => {
    await envStore.setupEnv()

    await Promise.all([
      appSettings.setupAppSettings(),
      subscribesStore.setupSubscribes(),
    ])

    const startTime = performance.now()
    percent.value = 40

    const duration = performance.now() - startTime
    percent.value = duration < 500 ? 80 : 100

    await sleep(Math.max(0, MIN_SPLASH_DURATION - duration))

    loading.value = false
    kernelApiStore.initCoreState()
  }

  initialize().catch(showError)

  return {
    loading,
    percent,
    hasError,
  }
}
