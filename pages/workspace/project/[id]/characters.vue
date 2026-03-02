<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { definePageMeta, useRoute } from '#imports'
import { apiFetch, apiStreamFetch } from '~/composables/useApi'
import WorkspaceTabs from '~/components/WorkspaceTabs.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectId = String(route.params.id)

interface CharacterCard {
  name: string
  role: string
  motivation: string
  arc: string
  traits: string
  notes: string
}

// --- State ---
const loading = ref(false)
const saving = ref(false)
const polishing = ref(false)
const project = ref<Record<string, unknown> | null>(null)
const characters = ref<CharacterCard[]>([])

// Edit modal
const showEditForm = ref(false)
const editingIndex = ref(-1)
const charForm = reactive<CharacterCard>({
  name: '', role: '', motivation: '', arc: '', traits: '', notes: ''
})

// AI panel
const promptTemplates = ref<Array<{ id: string; name: string; description: string }>>([])
const selectedTemplateId = ref('')
const userInput = ref('')

// AI 原始流式输出（用于展示生成进度）
const streamingRaw = ref('')

const charCount = computed((): number => characters.value.length)

function parseCharacters(json: string): CharacterCard[] {
  try {
    const arr = JSON.parse(json)
    if (!Array.isArray(arr)) return []
    return arr.map((c: Record<string, unknown>) => ({
      name: String(c.name || ''),
      role: String(c.role || ''),
      motivation: String(c.motivation || ''),
      arc: String(c.arc || ''),
      traits: String(c.traits || ''),
      notes: String(c.notes || '')
    }))
  } catch {
    return []
  }
}

function serializeCharacters(): string {
  return JSON.stringify(characters.value, null, 2)
}

// --- Data loading ---
async function load(): Promise<void> {
  const res = await apiFetch<{ project: Record<string, unknown> }>(`/api/projects/${projectId}`)
  project.value = res.project
  characters.value = parseCharacters(String(res.project.charactersJson || '[]'))
}

async function loadTemplates(): Promise<void> {
  const res = await apiFetch<{ templates: Array<{ id: string; name: string; description: string }> }>(
    '/api/prompt-templates?category_id=cat_characters'
  )
  promptTemplates.value = res.templates
  if (res.templates.length > 0 && !selectedTemplateId.value) {
    selectedTemplateId.value = res.templates[0].id
  }
}

await load()
onMounted(() => { loadTemplates() })

// --- Character CRUD ---
function openAddCharacter(): void {
  editingIndex.value = -1
  charForm.name = ''
  charForm.role = ''
  charForm.motivation = ''
  charForm.arc = ''
  charForm.traits = ''
  charForm.notes = ''
  showEditForm.value = true
}

function openEditCharacter(index: number): void {
  editingIndex.value = index
  const c = characters.value[index]
  charForm.name = c.name
  charForm.role = c.role
  charForm.motivation = c.motivation
  charForm.arc = c.arc
  charForm.traits = c.traits
  charForm.notes = c.notes
  showEditForm.value = true
}

function saveCharacterForm(): void {
  const entry: CharacterCard = { ...charForm }
  if (editingIndex.value >= 0) {
    characters.value[editingIndex.value] = entry
  } else {
    characters.value.push(entry)
  }
  showEditForm.value = false
}

function deleteCharacter(index: number): void {
  characters.value.splice(index, 1)
}

// --- Actions ---
async function generateCharacters(): Promise<void> {
  loading.value = true
  streamingRaw.value = ''
  try {
    const body: Record<string, string> = {}
    if (userInput.value.trim()) body.userInput = userInput.value.trim()
    if (selectedTemplateId.value) body.promptTemplateId = selectedTemplateId.value

    const fullText = await apiStreamFetch(
      `/api/projects/${projectId}/characters/generate`,
      body,
      (chunk) => {
        streamingRaw.value += chunk
      }
    )
    const generated = parseCharacters(fullText)
    if (generated.length > 0) {
      characters.value = generated
    }
    streamingRaw.value = ''
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

async function saveCharacters(): Promise<void> {
  saving.value = true
  try {
    await apiFetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: { charactersJson: serializeCharacters() }
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

    <div class="editor-header">
      <div>
        <h1 class="section-title"><span class="i-carbon-group" /> 角色设定</h1>
        <p class="section-desc">角色卡、关系网、动机与成长弧。共 {{ charCount }} 个角色。</p>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" @click="openAddCharacter">
          <span class="i-carbon-add" />
          手动添加
        </button>
        <button class="btn btn-secondary" :disabled="saving" @click="saveCharacters">
          <span class="i-carbon-save" />
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <div class="dual-panel">
      <!-- Left: Character cards -->
      <section class="char-panel">
        <!-- Edit form -->
        <div v-if="showEditForm" class="card char-form-card">
          <h3 class="form-card-title">{{ editingIndex >= 0 ? '编辑角色' : '新增角色' }}</h3>
          <div class="char-form-grid">
            <label class="form-label">
              <span>姓名</span>
              <input v-model="charForm.name" class="input" placeholder="角色名称" />
            </label>
            <label class="form-label">
              <span>角色定位</span>
              <input v-model="charForm.role" class="input" placeholder="如：主角、反派、导师" />
            </label>
            <label class="form-label char-form-full">
              <span>动机</span>
              <input v-model="charForm.motivation" class="input" placeholder="角色的核心驱动力" />
            </label>
            <label class="form-label char-form-full">
              <span>成长弧</span>
              <textarea v-model="charForm.arc" class="textarea" rows="2" placeholder="角色在故事中的成长变化" />
            </label>
            <label class="form-label char-form-full">
              <span>性格特质</span>
              <input v-model="charForm.traits" class="input" placeholder="如：勇敢、固执、善良" />
            </label>
            <label class="form-label char-form-full">
              <span>备注</span>
              <textarea v-model="charForm.notes" class="textarea" rows="2" placeholder="其他补充信息" />
            </label>
          </div>
          <div class="char-form-actions">
            <button class="btn btn-primary" :disabled="!charForm.name.trim()" @click="saveCharacterForm">
              <span class="i-carbon-checkmark" />
              确认
            </button>
            <button class="btn btn-secondary" @click="showEditForm = false">取消</button>
          </div>
        </div>

        <!-- Character card list -->
        <div v-if="!characters.length && !showEditForm" class="card empty-state">
          <div class="empty-state-icon i-carbon-user-avatar-filled" />
          <p class="empty-state-title">暂无角色</p>
          <p class="empty-state-desc">点击「手动添加」或使用右侧 AI 面板生成角色。</p>
        </div>

        <div v-else class="char-grid">
          <div v-for="(char, index) in characters" :key="index" class="card char-card">
            <div class="char-card-header">
              <div class="char-avatar">{{ char.name.charAt(0) }}</div>
              <div>
                <h3 class="char-name">{{ char.name }}</h3>
                <span class="char-role tag tag-default">{{ char.role || '未设定' }}</span>
              </div>
            </div>
            <div class="char-details">
              <div v-if="char.motivation" class="char-field">
                <span class="char-field-label"><span class="i-carbon-target" /> 动机</span>
                <p>{{ char.motivation }}</p>
              </div>
              <div v-if="char.arc" class="char-field">
                <span class="char-field-label"><span class="i-carbon-growth" /> 成长弧</span>
                <p>{{ char.arc }}</p>
              </div>
              <div v-if="char.traits" class="char-field">
                <span class="char-field-label"><span class="i-carbon-user-profile" /> 特质</span>
                <p>{{ char.traits }}</p>
              </div>
              <div v-if="char.notes" class="char-field">
                <span class="char-field-label"><span class="i-carbon-document" /> 备注</span>
                <p>{{ char.notes }}</p>
              </div>
            </div>
            <div class="char-card-actions">
              <button class="btn btn-secondary btn-sm" @click="openEditCharacter(index)">
                <span class="i-carbon-edit" /> 编辑
              </button>
              <button class="btn btn-ghost btn-sm" @click="deleteCharacter(index)">
                <span class="i-carbon-trash-can" /> 删除
              </button>
            </div>
          </div>
        </div>
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
            placeholder="描述你想生成的角色，如：需要一个亦正亦邪的反派，有复杂的过去..."
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
          @click="generateCharacters"
        >
          <span class="i-carbon-machine-learning-model" />
          {{ loading ? '生成中...' : '开始生成' }}
        </button>

        <p class="ai-hint muted">AI 生成的角色将替换当前列表，请先保存再生成。</p>

        <div v-if="streamingRaw" class="streaming-preview">
          <h3 class="streaming-title">生成中...</h3>
          <pre class="streaming-content">{{ streamingRaw }}</pre>
        </div>
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

/* Character cards */
.char-panel { min-width: 0; }
.char-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-3); }

.char-card { transition: border-color var(--dur-fast) var(--ease-standard); }
.char-card:hover { border-color: var(--primary); }

.char-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.char-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: var(--text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  font-weight: 700;
  flex-shrink: 0;
}

.char-name { margin: 0; font-size: var(--text-md); font-weight: 600; }
.char-role { margin-top: var(--space-1); display: inline-block; }

.char-details { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-3); }
.char-field-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-3);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-bottom: var(--space-1);
}
.char-field p { margin: 0; font-size: var(--text-sm); color: var(--text-2); line-height: 1.5; }

.char-card-actions {
  display: flex;
  gap: var(--space-2);
  border-top: 1px solid var(--divider);
  padding-top: var(--space-3);
}

/* Character form */
.char-form-card { margin-bottom: var(--space-4); border-color: var(--primary); }
.form-card-title { margin: 0 0 var(--space-4); font-size: var(--text-lg); font-weight: 600; }
.char-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.char-form-full { grid-column: 1 / -1; }
.char-form-actions { margin-top: var(--space-4); display: flex; gap: var(--space-3); }

/* AI panel */
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
  .char-grid { grid-template-columns: 1fr; }
  .char-form-grid { grid-template-columns: 1fr; }
}

.streaming-preview { margin-top: var(--space-3); }
.streaming-title { margin: 0 0 var(--space-2); font-size: var(--text-sm); color: var(--text-3); }
.streaming-content { margin: 0; padding: var(--space-3); background: var(--surface-2); border: 1px solid var(--divider); border-radius: var(--radius-sm); font-size: var(--text-xs); font-family: var(--font-mono); white-space: pre-wrap; max-height: 300px; overflow-y: auto; }
</style>
