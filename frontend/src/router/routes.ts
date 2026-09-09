import { type RouteRecordRaw } from 'vue-router'

import HomeView from '@/views/HomeView/index.vue'
import SettingsView from '@/views/SettingsView/index.vue'
import SubscribesView from '@/views/SubscribesView/index.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Overview',
    component: HomeView,
    meta: {
      name: 'router.overview',
      icon: 'overview',
    },
  },
  {
    path: '/subscriptions',
    name: 'Subscriptions',
    component: SubscribesView,
    meta: {
      name: 'router.subscriptions',
      icon: 'subscriptions',
    },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: {
      name: 'router.settings',
      icon: 'settings2',
      hidden: false,
    },
  },
]

export default routes
