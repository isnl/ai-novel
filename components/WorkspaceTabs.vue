<script setup lang="ts">
import { computed } from 'vue'
import { NuxtLink } from '#components'

const props = defineProps<{ projectId: string }>()

const tabs = computed(() => [
  { label: '总览', to: `/workspace/project/${props.projectId}`, icon: 'i-carbon-dashboard' },
  { label: '世界观', to: `/workspace/project/${props.projectId}/world`, icon: 'i-carbon-earth-filled' },
  { label: '大纲', to: `/workspace/project/${props.projectId}/outline`, icon: 'i-carbon-list-boxes' },
  { label: '角色', to: `/workspace/project/${props.projectId}/characters`, icon: 'i-carbon-group' }
])
</script>

<template>
  <nav class="tabs">
    <NuxtLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="tab-link">
      <span :class="tab.icon" />
      <span>{{ tab.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--divider);
  overflow-x: auto;
}

.tab-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-3);
  white-space: nowrap;
  transition:
    color var(--dur-fast) var(--ease-standard),
    background var(--dur-fast) var(--ease-standard);
}

.tab-link:hover {
  color: var(--text);
  background: var(--surface-3);
}

.tab-link.router-link-active {
  color: var(--primary);
  background: var(--primary-soft);
  font-weight: 600;
}
</style>
