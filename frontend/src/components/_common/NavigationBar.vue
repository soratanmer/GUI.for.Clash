<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import rawRoutes from '@/router/routes'

const { t } = useI18n()

const routes = rawRoutes.filter((r) => r.meta?.hidden !== true)
</script>

<template>
  <div class="main-nav flex items-center justify-center">
    <div
      v-for="r in routes"
      :key="r.path"
      :class="['main-nav__item', `main-nav__item--${String(r.name).toLowerCase()}`]"
    >
      <RouterLink v-slot="{ navigate, isActive }" :to="r.path" custom>
        <Button
          :class="{ 'is-active': isActive }"
          class="main-nav__button"
          :type="isActive ? 'link' : 'text'"
          :icon="r.meta && r.meta.icon"
          @click="navigate"
        >
          {{ (r.meta && t(r.meta.name)) || r.name }}
        </Button>
      </RouterLink>
    </div>
  </div>
</template>
