<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectId = String(route.params.id)

const loading = ref(false)
const saving = ref(false)
const project = ref<Record<string, unknown> | null>(null)
const outlineText = ref('')

async function load() {
  const res = await apiFetch<{ project: Record<string, unknown> }>(`/api/projects/${projectId}`)
  project.value = res.project
  outlineText.value = String(res.project.outlineText || '')
}

await load()

async function generateOutline() {
  loading.value = true
  try {
    const res = await apiFetch<{ content: string }>(`/api/projects/${projectId}/outline/generate`, { method: 'POST' })
    outlineText.value = res.content
    await load()
  } finally {
    loading.value = false
  }
}

async function saveOutline() {
  saving.value = true
  try {
    await apiFetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: { outlineText: outlineText.value }
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
      <h1>主线大纲</h1>
      <p class="muted">卷纲 + 关键章纲骨架，支持手动和 AI 并排协作。</p>
      <div class="actions">
        <button class="btn btn-primary" :disabled="loading" @click="generateOutline">{{ loading ? '生成中...' : 'AI 生成' }}</button>
        <button class="btn btn-secondary" :disabled="saving" @click="saveOutline">{{ saving ? '保存中...' : '保存手改' }}</button>
      </div>
      <textarea v-model="outlineText" class="textarea editor"></textarea>
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
