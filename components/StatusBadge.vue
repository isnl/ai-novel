<script setup lang="ts">
const props = defineProps<{ text: string; type?: 'success' | 'warning' | 'danger' | 'default' }>()

const cls = computed(() => {
  if (props.type === 'success') return 'tag tag-success'
  if (props.type === 'warning') return 'tag tag-warning'
  if (props.type === 'danger') return 'tag tag-danger'
  return 'tag'
})
</script>

<template>
  <span :class="cls">{{ text }}</span>
</template>

<style scoped>
.tag {
  border-color: var(--border);
  color: var(--text-2);
  background: var(--surface-2);
}
</style>
