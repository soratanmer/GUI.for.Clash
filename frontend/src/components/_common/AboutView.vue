<script setup lang="ts">
import logo from '@/assets/logo'
import { useEnvStore } from '@/stores'
import { APP_TITLE } from '@/utils'

const envStore = useEnvStore()
</script>

<template>
  <div class="flex flex-col items-center py-12">
    <img :src="logo" class="w-64" draggable="false" />
    <div class="py-8 font-bold">{{ APP_TITLE }}</div>
    <div class="text-12">{{ envStore.env.appVersion }}</div>
  </div>
</template>
