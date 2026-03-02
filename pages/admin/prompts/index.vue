<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { definePageMeta } from '#imports'
import { apiFetch } from '~/composables/useApi'
import type { PromptCategory, PromptTemplate } from '~/types/domain'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const categories = ref<PromptCategory[]>([])
const templates = ref<PromptTemplate[]>([])
const activeCategoryId = ref('')
const editingTemplate = ref<PromptTemplate | null>(null)
const showCatForm = ref(false)
const showTplForm = ref(false)

const catForm = reactive({ name: '', description: '', sortOrder: 0 })
const tplForm = reactive({
  categoryId: '',
  name: '',
  description: '',
  systemPrompt: '',
  userPromptTemplate: '',
  variablesJson: '[]',
  isActive: 1,
  sortOrder: 0
})

const saving = ref(false)

const filteredTemplates = computed((): PromptTemplate[] => {
  if (!activeCategoryId.value) return templates.value
  return templates.value.filter((t) => t.categoryId === activeCategoryId.value)
})

async function loadData(): Promise<void> {
  const [catRes, tplRes] = await Promise.all([
    apiFetch<{ categories: PromptCategory[] }>('/api/admin/prompt-categories'),
    apiFetch<{ templates: PromptTemplate[] }>('/api/admin/prompt-templates')
  ])
  categories.value = catRes.categories
  templates.value = tplRes.templates
}

await loadData()

async function createCategory(): Promise<void> {
  saving.value = true
  try {
    await apiFetch('/api/admin/prompt-categories', { method: 'POST', body: catForm })
    catForm.name = ''
    catForm.description = ''
    catForm.sortOrder = 0
    showCatForm.value = false
    await loadData()
  } finally {
    saving.value = false
  }
}

async function deleteCategory(id: string): Promise<void> {
  if (!confirm('确定删除该分类？')) return
  await apiFetch(`/api/admin/prompt-categories/${id}`, { method: 'DELETE' })
  if (activeCategoryId.value === id) activeCategoryId.value = ''
  await loadData()
}

function openCreateTemplate(): void {
  editingTemplate.value = null
  tplForm.categoryId = activeCategoryId.value || categories.value[0]?.id || ''
  tplForm.name = ''
  tplForm.description = ''
  tplForm.systemPrompt = ''
  tplForm.userPromptTemplate = ''
  tplForm.variablesJson = '[]'
  tplForm.isActive = 1
  tplForm.sortOrder = 0
  showTplForm.value = true
}

function openEditTemplate(tpl: PromptTemplate): void {
  editingTemplate.value = tpl
  tplForm.categoryId = tpl.categoryId
  tplForm.name = tpl.name
  tplForm.description = tpl.description || ''
  tplForm.systemPrompt = tpl.systemPrompt
  tplForm.userPromptTemplate = tpl.userPromptTemplate
  tplForm.variablesJson = tpl.variablesJson
  tplForm.isActive = tpl.isActive
  tplForm.sortOrder = tpl.sortOrder
  showTplForm.value = true
}

async function saveTemplate(): Promise<void> {
  saving.value = true
  try {
    if (editingTemplate.value) {
      await apiFetch(`/api/admin/prompt-templates/${editingTemplate.value.id}`, { method: 'PUT', body: tplForm })
    } else {
      await apiFetch('/api/admin/prompt-templates', { method: 'POST', body: tplForm })
    }
    showTplForm.value = false
    editingTemplate.value = null
    await loadData()
  } finally {
    saving.value = false
  }
}

async function deleteTemplate(id: string): Promise<void> {
  if (!confirm('确定删除该模板？')) return
  await apiFetch(`/api/admin/prompt-templates/${id}`, { method: 'DELETE' })
  await loadData()
}
</script>

<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1 class="section-title"><span class="i-carbon-text-annotation-toggle" /> 提示词管理</h1>
      <p class="section-desc">管理 AI 生成所用的系统提示词和用户提示词模板。</p>
    </div>

    <div class="prompt-layout">
      <!-- Left: Categories -->
      <aside class="cat-panel card">
        <div class="cat-header">
          <h2 class="panel-title"><span class="i-carbon-category" /> 分类</h2>
          <button class="btn btn-ghost" @click="showCatForm = !showCatForm">
            <span class="i-carbon-add" />
          </button>
        </div>

        <div v-if="showCatForm" class="cat-form">
          <input v-model="catForm.name" class="input" placeholder="分类名称" />
          <input v-model="catForm.description" class="input" placeholder="描述（可选）" />
          <button class="btn btn-primary btn-sm" :disabled="saving || !catForm.name.trim()" @click="createCategory">新增</button>
        </div>

        <div class="cat-list">
          <button
            class="cat-item"
            :class="{ active: !activeCategoryId }"
            @click="activeCategoryId = ''"
          >
            <span class="i-carbon-list" />
            <span>全部</span>
            <span class="cat-count">{{ templates.length }}</span>
          </button>
          <div v-for="cat in categories" :key="cat.id" class="cat-item-wrap">
            <button
              class="cat-item"
              :class="{ active: activeCategoryId === cat.id }"
              @click="activeCategoryId = cat.id"
            >
              <span class="i-carbon-folder" />
              <span>{{ cat.name }}</span>
              <span class="cat-count">{{ templates.filter(t => t.categoryId === cat.id).length }}</span>
            </button>
            <button class="cat-delete" @click.stop="deleteCategory(cat.id)" title="删除分类">
              <span class="i-carbon-close" />
            </button>
          </div>
        </div>
      </aside>

      <!-- Right: Templates -->
      <section class="tpl-panel">
        <div class="tpl-toolbar">
          <span class="muted">{{ filteredTemplates.length }} 个模板</span>
          <button class="btn btn-primary" @click="openCreateTemplate">
            <span class="i-carbon-add" />
            新增模板
          </button>
        </div>

        <!-- Template form modal -->
        <div v-if="showTplForm" class="card tpl-form-card">
          <h3 class="panel-title">{{ editingTemplate ? '编辑模板' : '新增模板' }}</h3>
          <div class="tpl-form-grid">
            <label class="form-label">
              分类
              <select v-model="tplForm.categoryId" class="select">
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </label>
            <label class="form-label">
              名称
              <input v-model="tplForm.name" class="input" placeholder="模板名称" />
            </label>
            <label class="form-label tpl-form-full">
              描述
              <input v-model="tplForm.description" class="input" placeholder="简要说明用途" />
            </label>
            <label class="form-label tpl-form-full">
              系统提示词 (System Prompt)
              <textarea v-model="tplForm.systemPrompt" class="textarea mono" rows="4" placeholder="定义 AI 的角色和行为..." />
            </label>
            <label class="form-label tpl-form-full">
              用户提示词模板 (User Prompt Template)
              <textarea v-model="tplForm.userPromptTemplate" class="textarea mono" rows="6" placeholder="使用 {{变量名}} 占位符..." />
            </label>
            <label class="form-label">
              变量列表 (JSON)
              <input v-model="tplForm.variablesJson" class="input mono" placeholder='["projectTitle","userInput"]' />
            </label>
            <label class="form-label">
              <span>状态</span>
              <select v-model.number="tplForm.isActive" class="select">
                <option :value="1">启用</option>
                <option :value="0">禁用</option>
              </select>
            </label>
          </div>
          <div class="tpl-form-actions">
            <button class="btn btn-primary" :disabled="saving || !tplForm.name.trim() || !tplForm.systemPrompt.trim()" @click="saveTemplate">
              <span class="i-carbon-save" />
              {{ saving ? '保存中...' : '保存' }}
            </button>
            <button class="btn btn-secondary" @click="showTplForm = false">取消</button>
          </div>
        </div>

        <!-- Template list -->
        <div v-if="!filteredTemplates.length && !showTplForm" class="card empty-state">
          <div class="empty-state-icon i-carbon-document-blank" />
          <p class="empty-state-title">暂无模板</p>
          <p class="empty-state-desc">点击「新增模板」创建第一个提示词模板。</p>
        </div>

        <div v-else class="tpl-list">
          <div v-for="tpl in filteredTemplates" :key="tpl.id" class="card tpl-card">
            <div class="tpl-card-header">
              <div>
                <h3 class="tpl-name">{{ tpl.name }}</h3>
                <p class="tpl-desc muted">{{ tpl.description || '无描述' }}</p>
              </div>
              <div class="tpl-actions">
                <span class="tag" :class="tpl.isActive ? 'tag-success' : 'tag-default'">
                  {{ tpl.isActive ? '启用' : '禁用' }}
                </span>
              </div>
            </div>
            <div class="tpl-meta muted">
              <span><span class="i-carbon-folder" /> {{ tpl.categoryName }}</span>
              <span><span class="i-carbon-code" /> {{ JSON.parse(tpl.variablesJson || '[]').join(', ') || '无变量' }}</span>
            </div>
            <div class="tpl-card-actions">
              <button class="btn btn-secondary" @click="openEditTemplate(tpl)">
                <span class="i-carbon-edit" /> 编辑
              </button>
              <button class="btn btn-ghost" @click="deleteTemplate(tpl.id)">
                <span class="i-carbon-trash-can" /> 删除
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-page { padding: var(--space-8); }
.admin-header { margin-bottom: var(--space-6); }
.admin-header h1 { display: flex; align-items: center; gap: var(--space-2); }
.panel-title { margin: 0 0 var(--space-4); font-size: var(--text-lg); display: flex; align-items: center; gap: var(--space-2); }
.mono { font-family: var(--font-mono); font-size: var(--text-sm); }

.prompt-layout { display: grid; grid-template-columns: 240px 1fr; gap: var(--space-4); align-items: start; }

.cat-panel { position: sticky; top: var(--space-4); }
.cat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); }
.cat-header .panel-title { margin: 0; }

.cat-form { display: grid; gap: var(--space-2); margin-bottom: var(--space-3); padding-bottom: var(--space-3); border-bottom: 1px solid var(--divider); }
.btn-sm { height: 32px; font-size: var(--text-xs); }

.cat-list { display: flex; flex-direction: column; gap: var(--space-1); }
.cat-item-wrap { display: flex; align-items: center; gap: var(--space-1); }
.cat-item { flex: 1; display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border: none; background: none; border-radius: var(--radius-sm); font-size: var(--text-sm); color: var(--text-2); cursor: pointer; text-align: left; transition: background var(--dur-fast) var(--ease-standard); }
.cat-item:hover { background: var(--surface-3); }
.cat-item.active { background: var(--primary-soft); color: var(--primary); font-weight: 600; }
.cat-count { margin-left: auto; font-size: var(--text-xs); color: var(--text-3); }
.cat-delete { width: 24px; height: 24px; border: none; background: none; color: var(--text-3); cursor: pointer; border-radius: var(--radius-xs); display: flex; align-items: center; justify-content: center; }
.cat-delete:hover { background: var(--danger-bg); color: var(--danger); }

.tpl-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }

.tpl-form-card { margin-bottom: var(--space-4); border-color: var(--primary); }
.tpl-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.tpl-form-full { grid-column: 1 / -1; }
.tpl-form-actions { margin-top: var(--space-5); display: flex; gap: var(--space-3); }

.tpl-list { display: grid; gap: var(--space-3); }
.tpl-card { transition: border-color var(--dur-fast) var(--ease-standard); }
.tpl-card:hover { border-color: var(--primary); }
.tpl-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-2); }
.tpl-name { margin: 0; font-size: var(--text-md); font-weight: 600; }
.tpl-desc { margin: var(--space-1) 0 0; font-size: var(--text-sm); }
.tpl-actions { display: flex; gap: var(--space-2); }
.tpl-meta { display: flex; gap: var(--space-4); font-size: var(--text-xs); margin-bottom: var(--space-3); }
.tpl-meta span { display: flex; align-items: center; gap: var(--space-1); }
.tpl-card-actions { display: flex; gap: var(--space-2); border-top: 1px solid var(--divider); padding-top: var(--space-3); }

@media (max-width: 900px) {
  .prompt-layout { grid-template-columns: 1fr; }
  .cat-panel { position: static; }
  .tpl-form-grid { grid-template-columns: 1fr; }
}
</style>
