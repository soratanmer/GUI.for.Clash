<script lang="ts" setup>
import { OpenDir } from '@/bridge'
import { OS } from '@/enums/app'
import { useAppSettingsStore, useEnvStore } from '@/stores'

const appSettings = useAppSettingsStore()
const envStore = useEnvStore()

const handleOpenFolder = async () => {
  await OpenDir(envStore.env.basePath)
}
</script>

<template>
  <div class="px-8 py-12 text-18 font-bold">{{ $t('settings.advanced') }}</div>

  <Card>
    <div class="px-8 py-12 flex items-center justify-between">
      <div class="text-16 font-bold">{{ $t('settings.appFolder.name') }}</div>
      <Button type="primary" icon="folder" @click="handleOpenFolder">
        <span class="ml-8">{{ $t('settings.appFolder.open') }}</span>
      </Button>
    </div>
    <div class="px-8 py-12 flex items-center justify-between">
      <div class="text-16 font-bold">{{ $t('settings.realMemoryUsage') }}</div>
      <Switch v-model="appSettings.app.kernel.realMemoryUsage" />
    </div>
    <div class="px-8 py-12 flex items-center justify-between">
      <div class="text-16 font-bold">
        {{ $t('settings.autoRestartKernel.name') }}
        <span class="font-normal text-12">({{ $t('settings.autoRestartKernel.tips') }})</span>
      </div>
      <Switch v-model="appSettings.app.autoRestartKernel" />
    </div>
    <div class="px-8 py-12 flex items-center justify-between">
      <div class="text-16 font-bold">
        {{ $t('settings.multipleInstance') }}
        <span class="font-normal text-12">({{ $t('settings.needRestart') }})</span>
      </div>
      <Switch v-model="appSettings.app.multipleInstance" />
    </div>
    <div v-platform="[OS.Windows, OS.Darwin]" class="px-8 py-12 flex items-center justify-between">
      <div class="text-16 font-bold">
        {{ $t('settings.contentProtection') }}
        <span class="font-normal text-12">({{ $t('settings.contentProtectionTips') }})</span>
      </div>
      <Switch v-model="appSettings.app.contentProtection" />
    </div>
  </Card>
</template>
