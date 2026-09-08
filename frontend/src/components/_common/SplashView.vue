<script setup lang="ts">
import logo from '@/assets/logo'
import { APP_TITLE } from '@/utils/env'
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center" style="--wails-draggable: drag">
    <img :src="logo" class="w-128" draggable="false" />
    <div class="text-24 font-bold mt-16 mb-24">{{ APP_TITLE }}</div>
    <div class="rotation">
      <slot></slot>
    </div>
  </div>
</template>
