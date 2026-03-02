<script setup lang="ts">
import { ref } from 'vue'
import { definePageMeta } from '#imports'
import { apiFetch } from '~/composables/useApi'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const stats = ref({ providers: 0, profiles: 0, bindings: 0, categories: 0, templates: 0 })

async function loadStats(): Promise<void> {
  const [providerRes, profileRes, bindingRes, catRes, tplRes] = await Promise.all([
    apiFetch<{ providers: unknown[] }>('/api/admin/model/providers'),
    apiFetch<{ profiles: unknown[] }>('/api/admin/model/profiles'),
    apiFetch<{ bindings: unknown[] }>('/api/admin/model/agent-bindings'),
    apiFetch<{ categories: unknown[] }>('/api/admin/prompt-categories'),
    apiFetch<{ templates: unknown[] }>('/api/admin/prompt-templates')
  ])
  stats.value = {
    providers: providerRes.providers.length,
    profiles: profileRes.profiles.length,
    bindings: bindingRes.bindings.length,
    categories: catRes.categories.length,
    templates: tplRes.templates.length
  }
}

await loadStats()

const cards = [
  { label: 'Provider', value: () => stats.value.providers, icon: 'i-carbon-cloud-service-management', color: 'var(--primary)' },
  { label: 'Model Profile', value: () => stats.value.profiles, icon: 'i-carbon-model-alt', color: 'var(--accent)' },
  { label: 'Agent 绑定', value: () => stats.value.bindings, icon: 'i-carbon-flow', color: 'var(--secondary)' },
  { label: '提示词分类', value: () => stats.value.categories, icon: 'i-carbon-category', color: 'var(--info)' },
  { label: '提示词模板', value: () => stats.value.templates, icon: 'i-carbon-text-annotation-toggle', color: 'var(--success)' }
]
</script>

<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1 class="section-title"><span class="i-carbon-dashboard" /> 仪表盘</h1>
      <p class="section-desc">系统配置概览</p>
    </div>
    <div class="stat-grid">
      <div v-for="card in cards" :key="card.label" class="card stat-card">
        <div class="stat-icon" :style="{ color: card.color }">
          <span :class="card.icon" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ card.value() }}</div>
          <div class="stat-label muted">{{ card.label }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page { padding: var(--space-8); }
.admin-header { margin-bottom: var(--space-6); }
.admin-header h1 { display: flex; align-items: center; gap: var(--space-2); }
.stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-4); }
.stat-card { display: flex; align-items: center; gap: var(--space-4); }
.stat-icon { font-size: 32px; }
.stat-value { font-size: var(--text-2xl); font-weight: 700; }
.stat-label { font-size: var(--text-sm); }
</style>
