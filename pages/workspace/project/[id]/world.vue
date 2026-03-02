<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectId = String(route.params.id)

const loading = ref(false)
const saving = ref(false)
const project = ref<Record<string, unknown> | null>(null)
const worldText = ref('')

async function load() {
  const res = await apiFetch<{ project: Record<string, unknown> }>(`/api/projects/${projectId}`)
  project.value = res.project
  worldText.value = String(res.project.worldText || '')
}

await load()

async function generateWorld() {
  loading.value = true
  try {
    const res = await apiFetch<{ content: string }>(`/api/projects/${projectId}/world/generate`, { method: 'POST' })
    worldText.value = res.content
    await load()
  } finally {
    loading.value = false
  }
}

async function saveWorld() {
  saving.value = true
  try {
    await apiFetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: { worldText: worldText.value }
    })
    await load()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page-wrap" v-if="project">
    <WorkspaceTabs :project-id="projectId" />
    <section class="card">
      <h1>世界观</h1>
      <p class="muted">硬规则、软规则、势力关系和核心矛盾。</p>
      <div class="actions">
        <button class="btn btn-primary" :disabled="loading" @click="generateWorld">{{ loading ? '生成中...' : 'AI 生成' }}</button>
        <button class="btn btn-secondary" :disabled="saving" @click="saveWorld">{{ saving ? '保存中...' : '保存手改' }}</button>
      </div>
      <textarea v-model="worldText" class="textarea editor"></textarea>
    </section>
  </div>
</template>

<style scoped>
.actions {
  margin: var(--space-3) 0;
  display: flex;
  gap: var(--space-2);
}

.editor {
  min-height: 360px;
}
</style>
