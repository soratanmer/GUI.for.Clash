<script lang="ts" setup>
import { computed, nextTick, onMounted, type SetupContext, type Slot } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSubscribesStore } from '@/stores'
import { message, modal } from '@/utils'

export interface ResourceSelectProps {
  title?: string
  cols?: number
  max?: number
  min?: number
  renderSlot?: boolean
  openImmediate?: boolean
}

const props = withDefaults(defineProps<ResourceSelectProps>(), {
  title: undefined,
  cols: 3,
  min: 0,
  max: Number.MAX_SAFE_INTEGER,
  renderSlot: true,
  openImmediate: false,
})

const model = defineModel<string[]>({ default: () => [] })

const emit = defineEmits<{
  (e: 'change', val: string[], items: App.Subscription[]): void
  (e: 'submit', val: string[], items: App.Subscription[]): void
}>()

const { t } = useI18n()
const subscribesStore = useSubscribesStore()

const modalTitle = computed(() => props.title || 'subscribes.select')

let defaultSlot: Slot | undefined
let actionSlot: Slot | undefined

const DefineTemplate = (_: unknown, { slots }: SetupContext) => {
  defaultSlot = slots.default
  actionSlot = slots.action
  return null
}

const open = () => {
  const m = modal(
    {
      title: modalTitle.value,
      submit: false,
      afterClose: () => {
        emit('submit', model.value, getItems())
        m.destroy()
      },
      maskClosable: true,
      cancelText: 'common.close',
    },
    {
      default: defaultSlot,
      action: actionSlot,
    },
  )
  m.open()
}

const isBelowMinSelection = computed(() => model.value.length < props.min)

const getItems = (val = model.value) => {
  return val.flatMap((id) => {
    const item = subscribesStore.getSubscribeById(id)
    return item ? [item] : []
  })
}

const handleSelect = (item: App.Subscription) => {
  const id = item.id

  const nextValue: string[] = []

  if (model.value.includes(id)) {
    nextValue.push(...model.value.filter((item) => item !== id))
  } else {
    nextValue.push(...model.value, id)
    if (nextValue.length > props.max) {
      message.warn('common.maxSelectionExceeded')
      return
    }
  }

  model.value = nextValue

  emit('change', nextValue, getItems(nextValue))
}

onMounted(() => {
  if (props.openImmediate) {
    nextTick(open)
  }
})
</script>

<template>
  <slot v-if="renderSlot" v-bind="{ selected: model, open }">
    <Button @click="open">{{ t('common.select') }}</Button>
  </slot>

  <DefineTemplate>
    <template #action>
      <Button class="mr-auto" type="text" size="small">
        {{
          isBelowMinSelection
            ? t('common.selectAtLeast', [props.min])
            : t('common.selectedCount', [model.length])
        }}
      </Button>
    </template>
    <Empty v-if="subscribesStore.subscribes.length === 0" />
    <div class="grid gap-8" :class="[`grid-cols-${cols}`]">
      <Card
        v-for="item in subscribesStore.subscribes"
        :key="item.id"
        :title="item.name"
        :selected="model.includes(item.id)"
        @click="handleSelect(item)"
      >
        <div class="text-12 line-clamp-2">{{ item.type }}</div>
      </Card>
    </div>
  </DefineTemplate>
</template>
