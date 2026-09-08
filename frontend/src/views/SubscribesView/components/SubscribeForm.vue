<script setup lang="ts">
import { ref, inject, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSubscribesStore } from '@/stores'
import { deepClone, message } from '@/utils'

import Button from '@/components/Button/index.vue'

interface Props {
  id?: string
}

const props = defineProps<Props>()

const { t } = useI18n()
const subscribeStore = useSubscribesStore()

const loading = ref(false)
const sub = ref<App.Subscription>(subscribeStore.getSubscribeTemplate())

const isManual = computed(() => sub.value.type === 'Manual')
const isRemote = computed(() => sub.value.type === 'Http')

const handleCancel = inject('cancel') as any
const handleSubmit = inject('submit') as any

const handleSave = async () => {
  loading.value = true

  try {
    if (props.id) {
      await subscribeStore.editSubscribe(props.id, sub.value)
    } else {
      await subscribeStore.addSubscribe(sub.value)
    }
    await handleSubmit()
  } catch (error: any) {
    console.error(error)
    message.error(error)
  }

  loading.value = false
}

if (props.id) {
  const s = subscribeStore.getSubscribeById(props.id)
  if (s) {
    sub.value = deepClone(s)
  }
}

const modalSlots = {
  cancel: () =>
    h(
      Button,
      {
        disabled: loading.value,
        onClick: handleCancel,
      },
      () => t('common.cancel'),
    ),
  submit: () =>
    h(
      Button,
      {
        type: 'primary',
        loading: loading.value,
        disabled: !sub.value.name || !sub.value.path || (!sub.value.url && !isManual.value),
        onClick: handleSave,
      },
      () => t('common.save'),
    ),
}

defineExpose({ modalSlots })
</script>

<template>
  <div>
    <div class="form-item">
      <div class="name">
        {{ t('subscribes.subtype') }}
      </div>
      <Radio
        v-model="sub.type"
        :options="[
          { label: 'common.http', value: 'Http' },
          { label: 'common.file', value: 'File' },
          { label: 'common.manual', value: 'Manual' },
        ]"
      />
    </div>
    <div class="form-item">
      {{ t('subscribe.name') }} *
      <div class="min-w-[75%]">
        <Input v-model="sub.name" autofocus class="w-full" />
      </div>
    </div>
    <div v-if="!isManual" class="form-item">
      {{ t(isRemote ? 'subscribe.url' : 'subscribe.localPath') }} *
      <div class="min-w-[75%]">
        <Input
          v-model="sub.url"
          :placeholder="isRemote ? 'http(s)://' : 'data/local/{filename}.txt'"
          allow-paste
          class="w-full"
        />
      </div>
    </div>
    <div class="form-item">
      {{ t('subscribe.path') }} *
      <div class="min-w-[75%]">
        <Input v-model="sub.path" placeholder="data/subscribes/{filename}.yaml" class="w-full" />
      </div>
    </div>
  </div>
</template>
