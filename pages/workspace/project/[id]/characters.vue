<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectId = String(route.params.id)

const loading = ref(false)
const saving = ref(false)
const project = ref<Record<string, unknown> | null>(null)
const charactersJson = ref('[]')

async function load() {
  const res = await apiFetch<{ project: Record<string, unknown> }>(`/api/projects/${projectId}`)
  project.value = res.project
  charactersJson.value = String(res.project.charactersJson || '[]')
}

await load()

async function generateCharacters() {
  loading.value = true
  try {
    const res = await apiFetch<{ content: string }>(`/api/projects/${projectId}/characters/generate`, { method: 'POST' })
    charactersJson.value = res.content
    await load()
  } finally {
    loading.value = false
  }
}

async function saveCharacters() {
  saving.value = true
  try {
    await apiFetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: { charactersJson: charactersJson.value }
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
      <h1>角色设定</h1>
      <p class="muted">角色卡、关系网、动机与成长弧。建议以 JSON 结构维护。</p>
      <div class="actions">
        <button class="btn btn-primary" :disabled="loading" @click="generateCharacters">
          {{ loading ? '生成中...' : 'AI 生成' }}
        </button>
        <button class="btn btn-secondary" :disabled="saving" @click="saveCharacters">{{ saving ? '保存中...' : '保存手改' }}</button>
      </div>
      <textarea v-model="charactersJson" class="textarea editor mono"></textarea>
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

.mono {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}
</style>
