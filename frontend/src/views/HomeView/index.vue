<script setup lang="ts">
import { ref, computed, watch, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import logo from '@/assets/logo'
import { ControllerCloseMode } from '@/enums/app'
import { useAppSettingsStore, useSubscribesStore, useKernelApiStore } from '@/stores'
import { APP_TITLE, message, debounce, modal } from '@/utils'

import GroupsController from './components/GroupsController.vue'
import KernelLogs from './components/KernelLogs.vue'
import OverView from './components/OverView.vue'
import QuickStart from './components/QuickStart.vue'

const showController = ref(false)
const controllerRef = useTemplateRef('controllerRef')

const { t } = useI18n()

const appSettingsStore = useAppSettingsStore()
const subscribesStore = useSubscribesStore()
const kernelApiStore = useKernelApiStore()

const fullConfigSubs = computed(() =>
  subscribesStore.subscribes.filter((s) => s.configMode === 'full' && !s.disabled),
)

const handleStartKernel = async () => {
  try {
    await kernelApiStore.startCore()
  } catch (error: any) {
    console.error(error)
    message.error(error.message || error)
  }
}

const handleShowQuickStart = () => {
  modal({ title: 'subscribes.enterLink' }).setContent(QuickStart).open()
}

const handleShowKernelLogs = () => {
  const m = modal({
    title: 'home.overview.viewlog',
    width: '90',
    height: '90',
    submit: false,
    cancelText: 'common.close',
    maskClosable: true,
  })
  m.setContent(KernelLogs).open()
}

let scrollEventCount = 0
const resetScrollEventCount = debounce(() => (scrollEventCount = 0), 100)

const onMouseWheel = (e: WheelEvent) => {
  if (!kernelApiStore.running) return

  const isScrollingDown = e.deltaY > 0

  if (
    isScrollingDown ||
    appSettingsStore.app.kernel.controllerCloseMode === ControllerCloseMode.All
  ) {
    const currentScrollTop = controllerRef.value?.scrollTop ?? 0
    if (isScrollingDown || currentScrollTop === 0) {
      scrollEventCount += 1
    }
    if (scrollEventCount >= appSettingsStore.app.kernel.controllerSensitivity) {
      showController.value = isScrollingDown || currentScrollTop !== 0
    }
  }

  resetScrollEventCount()
}

watch(showController, (v) => {
  if (v) {
    kernelApiStore.refreshProviderProxies()
  } else {
    kernelApiStore.refreshConfig()
  }
})
</script>

<template>
  <div class="home-view relative overflow-hidden h-full" @wheel.passive="onMouseWheel">
    <div
      v-if="(!kernelApiStore.running && !kernelApiStore.stopping) || kernelApiStore.starting"
      class="w-full h-[90%] flex flex-col items-center justify-center"
    >
      <img :src="logo" draggable="false" class="w-128 mb-16" />

      <template v-if="fullConfigSubs.length === 0">
        <p>{{ t('home.noProfile', [APP_TITLE]) }}</p>
        <Button type="primary" @click="handleShowQuickStart">{{ t('home.quickStart') }}</Button>
      </template>

      <template v-else>
        <div class="flex gap-8 mb-32">
          <Card
            v-for="s in fullConfigSubs.slice(0, fullConfigSubs.length > 4 ? 3 : 4)"
            :key="s.id"
            :selected="appSettingsStore.app.kernel.activeSubscription === s.id"
            @click="appSettingsStore.app.kernel.activeSubscription = s.id"
          >
            <div
              class="w-128 h-full flex items-center justify-center py-24 text-center cursor-pointer font-bold text-12"
            >
              {{ s.name }}
            </div>
          </Card>
          <Dropdown v-if="fullConfigSubs.length > 4" placement="top">
            <Card class="h-full">
              <div
                class="w-128 h-full flex items-center justify-center py-24 text-center cursor-pointer font-bold text-12"
              >
                ...
              </div>
            </Card>
            <template #overlay>
              <div class="flex flex-col py-8">
                <Button
                  v-for="s in fullConfigSubs.slice(3)"
                  :key="s.id"
                  @click="appSettingsStore.app.kernel.activeSubscription = s.id"
                >
                  <div class="min-w-32 w-full flex items-center justify-between">
                    {{ s.name }}
                    <Icon v-if="appSettingsStore.app.kernel.activeSubscription === s.id" icon="selected" />
                  </div>
                </Button>
              </div>
            </template>
          </Dropdown>
          <Card @click="handleShowQuickStart">
            <div
              class="w-128 h-full flex items-center justify-center py-24 text-center cursor-pointer font-bold text-12"
            >
              {{ t('home.quickStart') }}
            </div>
          </Card>
        </div>
        <Button :loading="kernelApiStore.starting" type="primary" @click="handleStartKernel">
          {{ t('home.overview.start') }}
        </Button>
        <Button type="link" size="small" class="mt-4" @click="handleShowKernelLogs">
          {{ t('home.overview.viewlog') }}
        </Button>
      </template>
    </div>

    <template v-else-if="!kernelApiStore.coreStateLoading">
      <div :class="{ 'blur-3xl': showController }">
        <OverView />
        <Divider class="controller-trigger">
          <Button type="link" size="small" @click="showController = true">
            {{ t('home.controller.name') }}
          </Button>
        </Divider>
      </div>

      <div
        ref="controllerRef"
        :class="showController ? 'translate-y-0' : 'translate-y-full'"
        class="controller-panel absolute inset-0 pb-32 overflow-y-auto duration-400"
      >
        <GroupsController />
      </div>
      <Button
        v-show="showController"
        class="controller-close fixed left-1/2 -translate-x-1/2 bottom-12 z-2"
        style="background-color: var(--card-bg)"
        type="text"
        size="small"
        icon="close"
        @click="showController = false"
      />
    </template>
  </div>
</template>
