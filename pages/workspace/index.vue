<script setup lang="ts">
import { ref, reactive } from 'vue'
import { NuxtLink } from '#components'
import { definePageMeta, navigateTo } from '#imports'
import { useWorkspaceStore } from '~/stores/workspace.store'
import StatusBadge from '~/components/StatusBadge.vue'

definePageMeta({
  middleware: 'auth'
})

const ws = useWorkspaceStore()

const showForm = ref(false)
const form = reactive({
  title: '',
  genre: '玄幻',
  style: '沉浸叙事',
  targetWords: 120000
})
const creating = ref(false)

await ws.fetchProjects()

async function createProject(): Promise<void> {
  if (!form.title.trim()) return
  creating.value = true
  try {
    const project = await ws.createProject({
      title: form.title,
      genre: form.genre,
      style: form.style,
      targetWords: form.targetWords
    })
    form.title = ''
    showForm.value = false
    await navigateTo(`/workspace/project/${project.id}`)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-inner">
        <h1>
          <span class="i-carbon-edit" />
          创作工作台
        </h1>
        <p>管理你的小说项目，开启 AI 辅助创作之旅</p>
      </div>
    </div>

    <div class="page-wrap">
      <!-- Action bar -->
      <div class="action-bar">
        <div>
          <span class="muted">共 {{ ws.projects.length }} 个项目</span>
        </div>
        <button class="btn btn-primary" @click="showForm = !showForm">
          <span class="i-carbon-add" />
          {{ showForm ? '收起' : '新建项目' }}
        </button>
      </div>

      <!-- Create form -->
      <div v-if="showForm" class="card create-card">
        <h3 class="section-title">
          <span class="i-carbon-add-alt" />
          创建新项目
        </h3>
        <div class="create-grid">
          <label class="form-label">
            书名
            <input v-model="form.title" class="input" placeholder="为你的作品起个名字" />
          </label>
          <label class="form-label">
            题材
            <input v-model="form.genre" class="input" placeholder="玄幻 / 都市 / 科幻 ..." />
          </label>
          <label class="form-label">
            风格
            <input v-model="form.style" class="input" placeholder="沉浸叙事 / 轻松搞笑 ..." />
          </label>
          <label class="form-label">
            目标字数
            <input v-model.number="form.targetWords" class="input" type="number" min="1000" max="500000" />
          </label>
        </div>
        <div class="create-actions">
          <button class="btn btn-primary" :disabled="creating || !form.title.trim()" @click="createProject">
            <span class="i-carbon-checkmark" />
            {{ creating ? '创建中...' : '确认创建' }}
          </button>
          <button class="btn btn-secondary" @click="showForm = false">取消</button>
        </div>
      </div>

      <!-- Project list -->
      <div v-if="!ws.projects.length && !showForm" class="card empty-state">
        <div class="empty-state-icon i-carbon-notebook" />
        <p class="empty-state-title">还没有项目</p>
        <p class="empty-state-desc">点击「新建项目」开始你的第一部小说创作。</p>
        <button class="btn btn-primary" @click="showForm = true">
          <span class="i-carbon-add" />
          新建项目
        </button>
      </div>

      <div v-else class="project-grid">
        <NuxtLink
          v-for="project in ws.projects"
          :key="project.id"
          :to="`/workspace/project/${project.id}`"
          class="card card-interactive project-card"
        >
          <div class="project-card-header">
            <h3>{{ project.title }}</h3>
            <StatusBadge :text="project.status" />
          </div>
          <p class="muted project-meta">{{ project.genre }} · {{ project.style }}</p>
          <div class="project-card-footer">
            <span class="muted">
              <span class="i-carbon-word-cloud" />
              目标 {{ (project.targetWords / 10000).toFixed(0) }} 万字
            </span>
            <span class="muted">
              <span class="i-carbon-time" />
              {{ project.createdAt.split('T')[0] }}
            </span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}

.create-card {
  margin-bottom: var(--space-6);
  border-color: var(--primary);
  border-width: 1px;
  box-shadow: var(--shadow-sm);
}

.create-card h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.create-grid {
  margin-top: var(--space-4);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.create-actions {
  margin-top: var(--space-5);
  display: flex;
  gap: var(--space-3);
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.project-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.project-card-header h3 {
  margin: 0;
  font-size: var(--text-lg);
}

.project-meta {
  margin: var(--space-2) 0 0;
  font-size: var(--text-sm);
}

.project-card-footer {
  margin-top: auto;
  padding-top: var(--space-4);
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
}

.project-card-footer span {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

@media (max-width: 900px) {
  .create-grid {
    grid-template-columns: 1fr;
  }

  .project-grid {
    grid-template-columns: 1fr;
  }
}
</style>
