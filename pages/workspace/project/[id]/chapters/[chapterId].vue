<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const ws = useWorkspaceStore()

const projectId = computed(() => String(route.params.id))
const chapterId = computed(() => String(route.params.chapterId))

const busy = ref(false)
const saving = ref(false)
const publishing = ref(false)
const currentContent = ref('')
const agentResult = ref<Record<string, unknown> | null>(null)

const chapter = computed(() => ws.chapters.find((item) => item.id === chapterId.value) || null)
const activeDraft = computed(() => {
  if (!chapter.value || !chapter.value.activeDraftId) return null
  return ws.drafts.find((d) => d.id === chapter.value?.activeDraftId) || null
})

async function loadAll() {
  await ws.fetchProject(projectId.value)
  await ws.fetchDrafts(chapterId.value)
  if (activeDraft.value) {
    currentContent.value = activeDraft.value.content
  } else if (ws.drafts[0]) {
    currentContent.value = ws.drafts[0].content
  }
}

await loadAll()

async function generateOutline() {
  busy.value = true
  try {
    agentResult.value = await apiFetch(`/api/projects/${projectId.value}/chapters/${chapterId.value}/outline/generate`, {
      method: 'POST'
    })
    await loadAll()
  } finally {
    busy.value = false
  }
}

async function generateDraft() {
  busy.value = true
  try {
    agentResult.value = await apiFetch(`/api/projects/${projectId.value}/chapters/${chapterId.value}/draft/generate`, {
      method: 'POST'
    })
    await loadAll()
  } finally {
    busy.value = false
  }
}

async function runAgent(agentType: 'audit' | 'polish' | 'consistency' | 'publish') {
  busy.value = true
  try {
    agentResult.value = await apiFetch(
      `/api/projects/${projectId.value}/chapters/${chapterId.value}/agent/${agentType}/run`,
      { method: 'POST' }
    )
  } finally {
    busy.value = false
  }
}

async function saveManualDraft() {
  if (!currentContent.value.trim()) return
  saving.value = true
  try {
    await apiFetch(`/api/chapters/${chapterId.value}/drafts`, {
      method: 'POST',
      body: { content: currentContent.value, source: 'mixed' }
    })
    await loadAll()
  } finally {
    saving.value = false
  }
}

async function activateDraft(draftId: string) {
  await apiFetch(`/api/chapters/${chapterId.value}/drafts/${draftId}/activate`, { method: 'POST' })
  await loadAll()
}

async function publishChapter() {
  publishing.value = true
  try {
    await apiFetch(`/api/projects/${projectId.value}/chapters/${chapterId.value}/publish`, { method: 'POST' })
    await loadAll()
  } finally {
    publishing.value = false
  }
}
</script>

<template>
  <div class="page-wrap" v-if="chapter && ws.currentProject">
    <WorkspaceTabs :project-id="projectId" />

    <section class="card">
      <h1>第{{ chapter.indexNo }}章 · {{ chapter.title }}</h1>
      <div class="meta-row">
        <StatusBadge :text="chapter.status" :type="chapter.status === 'published' ? 'success' : 'default'" />
        <span class="muted">版本数：{{ ws.drafts.length }}</span>
      </div>
    </section>

    <div class="editor-grid">
      <section class="card">
        <h2>章节细纲</h2>
        <p class="muted">{{ chapter.outlineText || '暂无细纲，先点击 AI 生成。' }}</p>
        <button class="btn btn-secondary" :disabled="busy" @click="generateOutline">生成细纲</button>
      </section>

      <section class="card">
        <h2>正文草稿</h2>
        <div class="actions">
          <button class="btn btn-primary" :disabled="busy" @click="generateDraft">AI 生成正文</button>
          <button class="btn btn-secondary" :disabled="saving" @click="saveManualDraft">保存手改版本</button>
          <button class="btn btn-secondary" :disabled="publishing" @click="publishChapter">
            {{ publishing ? '发布中...' : '发布章节' }}
          </button>
        </div>
        <textarea v-model="currentContent" class="textarea draft-editor" placeholder="AI 生成后可继续手动编辑"></textarea>
      </section>
    </div>

    <div class="side-grid">
      <section class="card">
        <h2>Agent 操作</h2>
        <div class="actions-wrap">
          <button class="btn btn-secondary" :disabled="busy" @click="runAgent('audit')">审核</button>
          <button class="btn btn-secondary" :disabled="busy" @click="runAgent('polish')">润色</button>
          <button class="btn btn-secondary" :disabled="busy" @click="runAgent('consistency')">一致性</button>
          <button class="btn btn-secondary" :disabled="busy" @click="runAgent('publish')">发布建议</button>
        </div>
        <pre v-if="agentResult" class="agent-result">{{ JSON.stringify(agentResult, null, 2) }}</pre>
      </section>

      <section class="card">
        <h2>历史版本</h2>
        <div v-if="!ws.drafts.length" class="muted">暂无历史版本</div>
        <div v-else class="draft-list">
          <div v-for="draft in ws.drafts" :key="draft.id" class="draft-item">
            <div>
              <strong>V{{ draft.versionNo }}</strong>
              <span class="muted"> · {{ draft.source }}</span>
            </div>
            <button class="btn btn-secondary" @click="activateDraft(draft.id)">
              {{ chapter.activeDraftId === draft.id ? '当前生效' : '切换生效' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
h1,
h2 {
  margin: 0;
}

.meta-row {
  margin-top: var(--space-3);
  display: flex;
  gap: var(--space-3);
}

.editor-grid {
  margin-top: var(--space-4);
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--space-4);
}

.side-grid {
  margin-top: var(--space-4);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.actions {
  margin: var(--space-3) 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.actions-wrap {
  margin-top: var(--space-3);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.draft-editor {
  min-height: 360px;
  font-family: var(--font-reading);
}

.agent-result {
  margin-top: var(--space-4);
  border: 1px solid var(--divider);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  background: var(--surface-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  white-space: pre-wrap;
}

.draft-list {
  margin-top: var(--space-3);
  display: grid;
  gap: var(--space-2);
}

.draft-item {
  border: 1px solid var(--divider);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  padding: var(--space-3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 1024px) {
  .editor-grid,
  .side-grid {
    grid-template-columns: 1fr;
  }

  .actions-wrap {
    grid-template-columns: 1fr;
  }
}
</style>
