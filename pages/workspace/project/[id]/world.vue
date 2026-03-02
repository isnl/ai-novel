<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { definePageMeta, useRoute } from '#imports'
import { apiFetch } from '~/composables/useApi'
import { useAiChat } from '~/composables/useAiChat'
import WorkspaceTabs from '~/components/WorkspaceTabs.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectId = String(route.params.id)
const { openDrawer, registerEditor, unregisterEditor, updateEditorText } = useAiChat()

// --- State ---
const loading = ref(false)
const saving = ref(false)
const polishing = ref(false)
const project = ref<Record<string, unknown> | null>(null)
const worldText = ref('')

// AI panel
const promptTemplates = ref<Array<{ id: string; name: string; description: string }>>([])
const selectedTemplateId = ref('')
const userInput = ref('')

const wordCount = computed((): number => worldText.value.length)

// --- Editor 注册 ---
onMounted(() => {
  registerEditor(
    () => worldText.value,
    (text: string) => {
      worldText.value = text
      saveWorld()
    }
  )
  loadTemplates()
})

onUnmounted(() => {
  unregisterEditor()
})

watch(worldText, (val) => {
  updateEditorText(val)
})

// --- Data loading ---
async function load(): Promise<void> {
  const res = await apiFetch<{ project: Record<string, unknown> }>(`/api/projects/${projectId}`)
  project.value = res.project
  worldText.value = String(res.project.worldText || '')
}

async function loadTemplates(): Promise<void> {
  const res = await apiFetch<{ templates: Array<{ id: string; name: string; description: string }> }>(
    '/api/prompt-templates?category_id=cat_world'
  )
  promptTemplates.value = res.templates
  if (res.templates.length > 0 && !selectedTemplateId.value) {
    selectedTemplateId.value = res.templates[0].id
  }
}

await load()

// --- Actions ---
async function generateWorld(): Promise<void> {
  loading.value = true
  try {
    const body: Record<string, string> = {}
    if (userInput.value.trim()) body.userInput = userInput.value.trim()
    if (selectedTemplateId.value) body.promptTemplateId = selectedTemplateId.value

    const res = await apiFetch<{ content: string }>(`/api/projects/${projectId}/world/generate`, {
      method: 'POST',
      body
    })
    worldText.value = res.content
    await load()
  } finally {
    loading.value = false
  }
}

async function polishInput(): Promise<void> {
  if (!userInput.value.trim()) return
  polishing.value = true
  try {
    const res = await apiFetch<{ content: string }>(`/api/projects/${projectId}/polish-input`, {
      method: 'POST',
      body: { rawInput: userInput.value.trim() }
    })
    userInput.value = res.content
  } finally {
    polishing.value = false
  }
}

async function saveWorld(): Promise<void> {
  saving.value = true
  try {
    await apiFetch(`/api/projects/${projectId}`, { method: 'PUT', body: { worldText: worldText.value } })
    await load()
  } finally {
    saving.value = false
  }
}

function openAiChat(): void {
  openDrawer(projectId, 'world')
}
</script>

<template>
  <div class="page-wrap" v-if="project">
    <WorkspaceTabs :project-id="projectId" />

    <div class="editor-header">
      <div>
        <h1 class="section-title"><span class="i-carbon-earth-filled" /> 世界观</h1>
        <p class="section-desc">硬规则、软规则、势力关系和核心矛盾。</p>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" @click="openAiChat">
          <span class="i-carbon-chat-bot" />
          AI 对话
        </button>
        <button class="btn btn-secondary" :disabled="saving" @click="saveWorld">
          <span class="i-carbon-save" />
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <div class="dual-panel">
      <!-- Left: Editor -->
      <section class="card editor-panel">
        <textarea v-model="worldText" class="textarea editor" placeholder="在此编辑世界观设定，或使用右侧 AI 面板生成..." />
        <div class="word-count">{{ wordCount }} 字</div>
      </section>

      <!-- Right: AI Generation Panel -->
      <aside class="card ai-panel">
        <h2 class="panel-title"><span class="i-carbon-machine-learning-model" /> AI 生成</h2>

        <label class="form-label">
          <span>提示词模板</span>
          <select v-model="selectedTemplateId" class="select">
            <option value="">默认模板</option>
            <option v-for="tpl in promptTemplates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
          </select>
        </label>

        <label class="form-label">
          <span>创作需求</span>
          <textarea
            v-model="userInput"
            class="textarea ai-input"
            placeholder="描述你想生成的世界观，如：末日废土风格，有变异生物和人类据点..."
            rows="5"
          />
        </label>

        <div class="ai-actions">
          <button
            class="btn btn-ghost btn-sm"
            :disabled="polishing || !userInput.trim()"
            @click="polishInput"
          >
            <span class="i-carbon-text-annotation-toggle" />
            {{ polishing ? '润色中...' : 'AI 润色输入' }}
          </button>
        </div>

        <button
          class="btn btn-primary btn-generate"
          :disabled="loading"
          @click="generateWorld"
        >
          <span class="i-carbon-machine-learning-model" />
          {{ loading ? '生成中...' : '开始生成' }}
        </button>

        <p class="ai-hint muted">生成结果将自动填入左侧编辑器，可手动修改后保存。</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
}
.editor-header h1 { display: flex; align-items: center; gap: var(--space-2); }
.actions { display: flex; gap: var(--space-2); }

.dual-panel {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: var(--space-4);
  align-items: start;
}

.editor-panel { display: flex; flex-direction: column; }
.editor {
  min-height: 500px;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  flex: 1;
}

.ai-panel {
  position: sticky;
  top: 80px;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.panel-title {
  margin: 0;
  font-size: var(--text-lg);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ai-input { resize: vertical; }
.ai-actions { display: flex; justify-content: flex-end; }
.btn-sm { height: 32px; font-size: var(--text-xs); }

.btn-generate { width: 100%; }

.ai-hint {
  font-size: var(--text-xs);
  margin: 0;
  text-align: center;
}

@media (max-width: 900px) {
  .dual-panel { grid-template-columns: 1fr; }
  .ai-panel { position: static; }
  .editor { min-height: 300px; }
}
</style>
