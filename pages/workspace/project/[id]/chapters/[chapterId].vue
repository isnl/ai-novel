<script setup lang="ts">
import { ref, computed } from 'vue'
import { definePageMeta, useRoute } from '#imports'
import { useWorkspaceStore } from '~/stores/workspace.store'
import { apiFetch } from '~/composables/useApi'
import WorkspaceTabs from '~/components/WorkspaceTabs.vue'
import StatusBadge from '~/components/StatusBadge.vue'

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

const wordCount = computed((): number => currentContent.value.length)

async function loadAll(): Promise<void> {
  await ws.fetchProject(projectId.value)
  await ws.fetchDrafts(chapterId.value)
  if (activeDraft.value) {
    currentContent.value = activeDraft.value.content
  } else if (ws.drafts[0]) {
    currentContent.value = ws.drafts[0].content
  }
}

await loadAll()

async function generateOutline(): Promise<void> {
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

async function generateDraft(): Promise<void> {
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

async function runAgent(agentType: 'audit' | 'polish' | 'consistency' | 'publish'): Promise<void> {
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

async function saveManualDraft(): Promise<void> {
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

async function activateDraft(draftId: string): Promise<void> {
  await apiFetch(`/api/chapters/${chapterId.value}/drafts/${draftId}/activate`, { method: 'POST' })
  await loadAll()
}

async function publishChapter(): Promise<void> {
  publishing.value = true
  try {
    await apiFetch(`/api/projects/${projectId.value}/chapters/${chapterId.value}/publish`, { method: 'POST' })
    await loadAll()
  } finally {
    publishing.value = false
  }
}

const AGENT_ACTIONS = [
  { type: 'audit' as const, label: '审核', icon: 'i-carbon-task-approved', desc: '检查内容质量' },
  { type: 'polish' as const, label: '润色', icon: 'i-carbon-text-annotation-toggle', desc: '优化表达文笔' },
  { type: 'consistency' as const, label: '一致性', icon: 'i-carbon-connect', desc: '检查前后一致' },
  { type: 'publish' as const, label: '发布建议', icon: 'i-carbon-send-alt', desc: '评估发布就绪度' },
]
</script>

<template>
  <div class="page-wrap" v-if="chapter && ws.currentProject">
    <WorkspaceTabs :project-id="projectId" />

    <!-- Chapter header -->
    <section class="card chapter-info">
      <div class="chapter-info-header">
        <div>
          <h1 class="chapter-title">
            <span class="chapter-no-badge">{{ chapter.indexNo }}</span>
            {{ chapter.title }}
          </h1>
          <div class="meta-row">
            <StatusBadge :text="chapter.status" />
            <span class="muted">版本数：{{ ws.drafts.length }}</span>
            <span class="muted">{{ wordCount }} 字</span>
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" :disabled="publishing" @click="publishChapter">
            <span class="i-carbon-send-alt" />
            {{ publishing ? '发布中...' : '发布章节' }}
          </button>
        </div>
      </div>
    </section>

    <!-- Main grid: outline + editor -->
    <div class="editor-grid">
      <section class="card outline-panel">
        <h2 class="panel-title"><span class="i-carbon-list-boxes" /> 章节细纲</h2>
        <div v-if="chapter.outlineText" class="outline-content">{{ chapter.outlineText }}</div>
        <div v-else class="empty-hint muted">暂无细纲，点击下方按钮生成。</div>
        <button class="btn btn-secondary btn-block" :disabled="busy" @click="generateOutline">
          <span class="i-carbon-machine-learning-model" />
          {{ busy ? '生成中...' : '生成细纲' }}
        </button>
      </section>

      <section class="card draft-panel">
        <div class="draft-header">
          <h2 class="panel-title"><span class="i-carbon-document" /> 正文草稿</h2>
          <div class="actions">
            <button class="btn btn-primary" :disabled="busy" @click="generateDraft">
              <span class="i-carbon-machine-learning-model" />
              {{ busy ? '生成中...' : 'AI 生成' }}
            </button>
            <button class="btn btn-secondary" :disabled="saving" @click="saveManualDraft">
              <span class="i-carbon-save" />
              {{ saving ? '保存中...' : '保存手改' }}
            </button>
          </div>
        </div>
        <textarea v-model="currentContent" class="textarea draft-editor" placeholder="AI 生成后可继续手动编辑..." />
      </section>
    </div>

    <!-- Bottom grid: agents + versions -->
    <div class="side-grid">
      <section class="card">
        <h2 class="panel-title"><span class="i-carbon-bot" /> Agent 操作</h2>
        <div class="agent-grid">
          <button
            v-for="agent in AGENT_ACTIONS"
            :key="agent.type"
            class="agent-card"
            :disabled="busy"
            @click="runAgent(agent.type)"
          >
            <span :class="agent.icon" class="agent-icon" />
            <strong>{{ agent.label }}</strong>
            <span class="muted agent-desc">{{ agent.desc }}</span>
          </button>
        </div>
        <div v-if="agentResult" class="agent-result-wrap">
          <h3 class="result-label">Agent 返回结果</h3>
          <pre class="agent-result">{{ JSON.stringify(agentResult, null, 2) }}</pre>
        </div>
      </section>

      <section class="card">
        <h2 class="panel-title"><span class="i-carbon-version" /> 历史版本</h2>
        <div v-if="!ws.drafts.length" class="empty-hint muted">暂无历史版本</div>
        <div v-else class="draft-list">
          <div
            v-for="draft in ws.drafts"
            :key="draft.id"
            class="draft-item"
            :class="{ 'draft-item-active': chapter.activeDraftId === draft.id }"
          >
            <div class="draft-item-info">
              <div class="draft-version">
                <span class="version-badge">V{{ draft.versionNo }}</span>
                <span class="tag" :class="draft.source === 'ai' ? 'tag-info' : 'tag-default'">{{ draft.source }}</span>
              </div>
              <span class="muted draft-date">{{ draft.createdAt?.split('T')[0] || '' }}</span>
            </div>
            <button
              class="btn"
              :class="chapter.activeDraftId === draft.id ? 'btn-ghost' : 'btn-secondary'"
              :disabled="chapter.activeDraftId === draft.id"
              @click="activateDraft(draft.id)"
            >
              {{ chapter.activeDraftId === draft.id ? '当前生效' : '切换生效' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.chapter-info { margin-bottom: var(--space-4); }
.chapter-info-header { display: flex; justify-content: space-between; align-items: flex-start; }
.chapter-title { margin: 0; font-size: var(--text-2xl); display: flex; align-items: center; gap: var(--space-3); }
.chapter-no-badge { width: 40px; height: 40px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); font-weight: 700; font-size: var(--text-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.meta-row { margin-top: var(--space-3); display: flex; align-items: center; gap: var(--space-3); }
.actions { display: flex; gap: var(--space-2); }

.panel-title { margin: 0 0 var(--space-4); font-size: var(--text-lg); display: flex; align-items: center; gap: var(--space-2); }

.editor-grid { display: grid; grid-template-columns: 1fr 2fr; gap: var(--space-4); margin-bottom: var(--space-4); }
.side-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }

.outline-panel { display: flex; flex-direction: column; }
.outline-content { flex: 1; padding: var(--space-3); background: var(--surface-2); border-radius: var(--radius-sm); border: 1px solid var(--divider); font-size: var(--text-sm); line-height: var(--leading-loose); white-space: pre-wrap; margin-bottom: var(--space-3); }
.empty-hint { padding: var(--space-4); text-align: center; }
.btn-block { width: 100%; justify-content: center; }

.draft-panel { display: flex; flex-direction: column; }
.draft-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3); }
.draft-header .panel-title { margin: 0; }
.draft-editor { flex: 1; min-height: 400px; font-family: var(--font-reading); }

.agent-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.agent-card { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); padding: var(--space-4); border: 1px solid var(--divider); border-radius: var(--radius-md); background: var(--surface-2); cursor: pointer; transition: all 0.2s; text-align: center; }
.agent-card:hover:not(:disabled) { border-color: var(--primary); background: var(--primary-soft); }
.agent-card:disabled { opacity: 0.5; cursor: not-allowed; }
.agent-icon { font-size: 24px; color: var(--primary); }
.agent-desc { font-size: var(--text-xs); }

.agent-result-wrap { margin-top: var(--space-4); }
.result-label { margin: 0 0 var(--space-2); font-size: var(--text-sm); color: var(--text-2); }
.agent-result { margin: 0; border: 1px solid var(--divider); border-radius: var(--radius-sm); padding: var(--space-3); background: var(--surface-2); font-family: var(--font-mono); font-size: var(--text-xs); white-space: pre-wrap; max-height: 300px; overflow-y: auto; }

.draft-list { display: grid; gap: var(--space-2); }
.draft-item { border: 1px solid var(--divider); border-radius: var(--radius-sm); background: var(--surface-2); padding: var(--space-3) var(--space-4); display: flex; justify-content: space-between; align-items: center; transition: border-color 0.2s; }
.draft-item-active { border-color: var(--primary); background: var(--primary-soft); }
.draft-item-info { display: flex; flex-direction: column; gap: var(--space-1); }
.draft-version { display: flex; align-items: center; gap: var(--space-2); }
.version-badge { font-weight: 700; color: var(--primary); }
.draft-date { font-size: var(--text-xs); }

@media (max-width: 1024px) {
  .editor-grid, .side-grid { grid-template-columns: 1fr; }
}
</style>
