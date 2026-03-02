<script setup lang="ts">
import { computed } from 'vue'

const STATUS_MAP: Record<string, { label: string; type: string }> = {
  init: { label: '初始化', type: 'default' },
  world_ready: { label: '世界观就绪', type: 'info' },
  outline_ready: { label: '大纲就绪', type: 'info' },
  writing: { label: '写作中', type: 'warning' },
  completed: { label: '已完结', type: 'success' },
  planned: { label: '规划中', type: 'default' },
  drafting: { label: '起草中', type: 'warning' },
  reviewing: { label: '审核中', type: 'info' },
  ready_to_publish: { label: '待发布', type: 'warning' },
  published: { label: '已发布', type: 'success' },
  withdrawn: { label: '已撤回', type: 'danger' },
  success: { label: '成功', type: 'success' },
  failed: { label: '失败', type: 'danger' },
  needs_review: { label: '需审核', type: 'warning' }
}

const props = defineProps<{
  text: string
  type?: 'success' | 'warning' | 'danger' | 'info' | 'default'
}>()

const resolved = computed(() => {
  const mapped = STATUS_MAP[props.text]
  if (mapped) {
    return { label: mapped.label, type: props.type || mapped.type }
  }
  return { label: props.text, type: props.type || 'default' }
})

const cls = computed((): string => {
  return `tag tag-${resolved.value.type}`
})
</script>

<template>
  <span :class="cls">{{ resolved.label }}</span>
</template>
