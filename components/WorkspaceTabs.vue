<script setup lang="ts">
const props = defineProps<{ projectId: string }>()

const tabs = computed(() => [
  { label: '总览', to: `/workspace/project/${props.projectId}` },
  { label: '世界观', to: `/workspace/project/${props.projectId}/world` },
  { label: '大纲', to: `/workspace/project/${props.projectId}/outline` },
  { label: '角色', to: `/workspace/project/${props.projectId}/characters` },
  { label: '模型配置', to: `/workspace/project/${props.projectId}/settings/models` }
])
</script>

<template>
  <div class="tabs">
    <NuxtLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="tab-link">{{ tab.label }}</NuxtLink>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.tab-link {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
  padding: 6px 12px;
  color: var(--text-2);
}

.tab-link.router-link-active {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary);
}
</style>
