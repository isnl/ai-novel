<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { definePageMeta, useRoute } from '#imports'
import { apiFetch } from '~/composables/useApi'
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

type CharacterField = keyof CharacterCard

const FIELD_META: Array<{ key: CharacterField; label: string; placeholder: string; multiline: boolean }> = [
  { key: 'name', label: '姓名', placeholder: '角色名称', multiline: false },
  { key: 'role', label: '角色定位', placeholder: '如：主角、反派、导师、配角', multiline: false },
  { key: 'motivation', label: '核心动机', placeholder: '角色的核心驱动力', multiline: false },
  { key: 'arc', label: '成长弧线', placeholder: '角色在故事中的成长变化', multiline: true },
  { key: 'traits', label: '性格特质', placeholder: '如：勇敢、固执、善良', multiline: false },
  { key: 'notes', label: '备注', placeholder: '其他补充信息', multiline: true }
]

// --- State ---
const saving = ref(false)
const project = ref<Record<string, unknown> | null>(null)
const characters = ref<CharacterCard[]>([])

// 当前编辑的角色
const editing = ref(false)
const editingIndex = ref(-1) // -1 表示新建
const charForm = reactive<CharacterCard>({
  name: '', role: '', motivation: '', arc: '', traits: '', notes: ''
})

// AI 字段生成状态
const generatingField = ref<CharacterField | null>(null)
const userHint = ref('')

const charCount = computed((): number => characters.value.length)

function emptyCharacter(): CharacterCard {
  return { name: '', role: '', motivation: '', arc: '', traits: '', notes: '' }
}

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

await load()

// --- Character CRUD ---
function startNewCharacter(): void {
  editingIndex.value = -1
  Object.assign(charForm, emptyCharacter())
  userHint.value = ''
  editing.value = true
}

function startEditCharacter(index: number): void {
  editingIndex.value = index
  const c = characters.value[index]
  Object.assign(charForm, { ...c })
  userHint.value = ''
  editing.value = true
}

function saveCharacterForm(): void {
  const entry: CharacterCard = { ...charForm }
  if (editingIndex.value >= 0) {
    characters.value[editingIndex.value] = entry
  } else {
    characters.value.push(entry)
  }
  editing.value = false
}

function cancelEdit(): void {
  editing.value = false
}

function deleteCharacter(index: number): void {
  characters.value.splice(index, 1)
  if (editing.value && editingIndex.value === index) {
    editing.value = false
  } else if (editing.value && editingIndex.value > index) {
    editingIndex.value -= 1
  }
}

// --- AI 单字段生成 ---
async function generateField(field: CharacterField): Promise<void> {
  generatingField.value = field
  try {
    const res = await apiFetch<{ content: string }>(`/api/projects/${projectId}/characters/generate-field`, {
      method: 'POST',
      body: {
        field,
        existingCharacter: { ...charForm },
        userHint: userHint.value.trim() || undefined
      }
    })
    charForm[field] = res.content
  } finally {
    generatingField.value = null
  }
}

// --- 保存到服务器 ---
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
        <p class="section-desc">逐个创建和打磨你的角色，每个属性都可以 AI 辅助生成。共 {{ charCount }} 个角色。</p>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" @click="startNewCharacter" :disabled="editing">
          <span class="i-carbon-add" />
          新建角色
        </button>
        <button class="btn btn-secondary" :disabled="saving" @click="saveCharacters">
          <span class="i-carbon-save" />
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <div class="main-layout">
      <!-- 左侧：角色列表 -->
      <section class="char-list">
        <div v-if="!characters.length && !editing" class="card empty-state">
          <div class="empty-state-icon i-carbon-user-avatar-filled" />
          <p class="empty-state-title">暂无角色</p>
          <p class="empty-state-desc">点击「新建角色」开始创建你的第一个角色。</p>
          <button class="btn btn-primary" @click="startNewCharacter">
            <span class="i-carbon-add" />
            新建角色
          </button>
        </div>

        <div
          v-for="(char, index) in characters"
          :key="index"
          class="card char-card"
          :class="{ 'char-card-active': editing && editingIndex === index }"
          @click="startEditCharacter(index)"
        >
          <div class="char-card-header">
            <div class="char-avatar">{{ char.name ? char.name.charAt(0) : '?' }}</div>
            <div class="char-card-info">
              <h3 class="char-name">{{ char.name || '未命名' }}</h3>
              <span class="char-role tag tag-default">{{ char.role || '未设定' }}</span>
            </div>
          </div>
          <div class="char-summary">
            <p v-if="char.motivation" class="char-line"><span class="char-line-label">动机</span>{{ char.motivation }}</p>
            <p v-if="char.traits" class="char-line"><span class="char-line-label">特质</span>{{ char.traits }}</p>
          </div>
          <div class="char-card-actions" @click.stop>
            <button class="btn btn-ghost btn-xs" @click="startEditCharacter(index)">
              <span class="i-carbon-edit" /> 编辑
            </button>
            <button class="btn btn-ghost btn-xs" @click="deleteCharacter(index)">
              <span class="i-carbon-trash-can" /> 删除
            </button>
          </div>
        </div>
      </section>

      <!-- 右侧：角色工作台 -->
      <section v-if="editing" class="card workbench">
        <div class="workbench-header">
          <h2 class="workbench-title">
            {{ editingIndex >= 0 ? '编辑角色' : '新建角色' }}
          </h2>
          <div class="workbench-actions">
            <button
              class="btn btn-primary"
              :disabled="!charForm.name.trim()"
              @click="saveCharacterForm"
            >
              <span class="i-carbon-checkmark" />
              确认
            </button>
            <button class="btn btn-ghost" @click="cancelEdit">取消</button>
          </div>
        </div>

        <!-- 用户补充提示 -->
        <div class="hint-bar">
          <input
            v-model="userHint"
            class="input hint-input"
            placeholder="可选：给 AI 的补充说明，如「武侠风格」「性格反差萌」..."
          />
        </div>

        <!-- 各字段 -->
        <div class="fields-list">
          <div
            v-for="meta in FIELD_META"
            :key="meta.key"
            class="field-row"
          >
            <div class="field-label-row">
              <label class="field-label">{{ meta.label }}</label>
              <button
                class="btn btn-ghost btn-xs ai-btn"
                :disabled="generatingField !== null"
                @click="generateField(meta.key)"
              >
                <span v-if="generatingField === meta.key" class="i-carbon-circle-dash spin" />
                <span v-else class="i-carbon-machine-learning-model" />
                {{ generatingField === meta.key ? '生成中...' : 'AI 生成' }}
              </button>
            </div>
            <textarea
              v-if="meta.multiline"
              v-model="charForm[meta.key]"
              class="textarea field-input"
              :placeholder="meta.placeholder"
              rows="3"
            />
            <input
              v-else
              v-model="charForm[meta.key]"
              class="input field-input"
              :placeholder="meta.placeholder"
            />
          </div>
        </div>
      </section>

      <!-- 未编辑时的引导 -->
      <section v-else class="card workbench workbench-empty">
        <div class="empty-state">
          <span class="i-carbon-user-avatar-filled empty-icon" />
          <p>选择左侧角色进行编辑，或点击「新建角色」</p>
        </div>
      </section>
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

.main-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-4);
  align-items: start;
}

/* --- 角色列表 --- */
.char-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.char-card {
  cursor: pointer;
  padding: var(--space-4);
  transition: border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard);
}
.char-card:hover { border-color: var(--primary); }
.char-card-active { border-color: var(--primary); box-shadow: var(--shadow-focus); }

.char-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}
.char-card-info { min-width: 0; }

.char-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: var(--text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: 700;
  flex-shrink: 0;
}

.char-name { margin: 0; font-size: var(--text-sm); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.char-role { margin-top: 2px; display: inline-block; }

.char-summary { margin-bottom: var(--space-2); }
.char-line {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.6;
}
.char-line-label {
  font-weight: 600;
  color: var(--text-2);
  margin-right: var(--space-1);
}

.char-card-actions {
  display: flex;
  gap: var(--space-1);
  border-top: 1px solid var(--divider);
  padding-top: var(--space-2);
}

/* --- 工作台 --- */
.workbench {
  position: sticky;
  top: 80px;
}

.workbench-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}
.workbench-title { margin: 0; font-size: var(--text-lg); font-weight: 600; }
.workbench-actions { display: flex; gap: var(--space-2); }

.hint-bar { margin-bottom: var(--space-4); }
.hint-input { height: 36px; font-size: var(--text-sm); }

.fields-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field-row { }

.field-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.field-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-2);
}

.ai-btn {
  gap: var(--space-1);
}

.field-input { font-size: var(--text-sm); }

.workbench-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.3;
}

.workbench-empty .empty-state {
  padding: 0;
}
.workbench-empty .empty-state p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-3);
}

.btn-xs {
  height: 26px;
  padding: 0 var(--space-2);
  font-size: 11px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .main-layout { grid-template-columns: 1fr; }
  .workbench { position: static; }
}
</style>
