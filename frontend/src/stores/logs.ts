import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useLogsStore = defineStore('logs', () => {
  const kernelLogs = ref<string[]>([])

  const recordKernelLog = (msg: string) => {
    kernelLogs.value.unshift(msg)
  }

  const isEmpty = computed(() => kernelLogs.value.length === 0)

  const clearKernelLog = () => kernelLogs.value.splice(0)

  return {
    recordKernelLog,
    clearKernelLog,
    kernelLogs,
    isEmpty,
  }
})
