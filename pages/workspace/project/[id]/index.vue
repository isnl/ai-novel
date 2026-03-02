<script setup lang="ts">
import { ref, computed } from 'vue'
import { NuxtLink } from '#components'
import { definePageMeta, useRoute, navigateTo } from '#imports'
import { useWorkspaceStore } from '~/stores/workspace.store'
import StatusBadge from '~/components/StatusBadge.vue'
import WorkspaceTabs from '~/components/WorkspaceTabs.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const ws = useWorkspaceStore()
const projectId = computed(() => String(route.params.id))

const newChapterTitle = ref('第一章 破局')
const creating = ref(false)

await ws.fetchProject(projectId.value)

async function createChapter(): Promise<void> {
  if (!newChapterTitle.value.trim()) return
  creating.value = true
  try {
    const chapter = await ws.createChapter(projectId.value, { title: newChapterTitle.value })
    newChapterTitle.value = ''
    await navigateTo(`/workspace/project/${projectId.value}/chapters/${chapter.id}`)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="page-wrap" v-if="ws.currentProject">
    <WorkspaceTabs :project-id="projectId" />

    <section class="card project-info">
      <div class="project-header">
        <div>
          <h1>{{ ws.currentProject.title }}</h1>
          <p class="muted">{{ ws.currentProject.genre }} · {{ ws.currentProject.style }}</p>
        </div>
        <StatusBadge :text="ws.currentProject.status" />
      </div>
      <div class="project-stats">
        <div class="stat-item">
          <span class="stat-value">{{ (ws.currentProject.targetWords / 10000).toFixed(0) }}</span>
          <span class="stat-label muted">万字目标</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ ws.chapters.length }}</span>
          <span class="stat-label muted">章节数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ ws.chapters.filter(c => c.status === 'published').length }}</span>
          <span class="stat-label muted">已发布</span>
        </div>
      </div>
    </section>

    <section>
      <div class="chapter-header">
        <h2 class="section-title"><span class="i-carbon-list-numbered" /> 章节管理</h2>
      </div>
      <div class="create-row">
        <input v-model="newChapterTitle" class="input" placeholder="输入章节标题" />
        <button class="btn btn-primary" :disabled="creating" @click="createChapter">
          <span class="i-carbon-add" />
          {{ creating ? '创建中...' : '新建章节' }}
        </button>
      </div>
      <div v-if="!ws.chapters.length" class="card empty-state">
        <div class="empty-state-icon i-carbon-document-add" />
        <p class="empty-state-title">尚未创建章节</p>
        <p class="empty-state-desc">在上方输入章节标题开始创作。</p>
      </div>
      <div v-else class="chapter-list">
        <NuxtLink v-for="chapter in ws.chapters" :key="chapter.id" :to="`/workspace/project/${projectId}/chapters/${chapter.id}`" class="chapter-item card card-hover">
          <div class="chapter-item-left">
            <span class="chapter-no">{{ chapter.indexNo }}</span>
            <div>
              <strong>{{ chapter.title }}</strong>
              <p class="muted chapter-date">{{ chapter.createdAt.split('T')[0] }}</p>
            </div>
          </div>
          <StatusBadge :text="chapter.status" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
h1 { margin: 0; font-size: var(--text-2xl); }
.project-info { margin-bottom: var(--space-6); }
.project-header { display: flex; justify-content: space-between; align-items: flex-start; }
.project-stats { display: flex; gap: var(--space-8); margin-top: var(--space-5); padding-top: var(--space-5); border-top: 1px solid var(--divider); }
.stat-item { display: flex; flex-direction: column; }
.stat-value { font-size: var(--text-2xl); font-weight: 700; color: var(--primary); }
.stat-label { font-size: var(--text-xs); }
.chapter-header { margin-bottom: var(--space-4); }
.chapter-header h2 { display: flex; align-items: center; gap: var(--space-2); }
.create-row { display: grid; grid-template-columns: 1fr auto; gap: var(--space-3); margin-bottom: var(--space-5); }
.chapter-list { display: grid; gap: var(--space-3); }
.chapter-item { display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) var(--space-5); }
.chapter-item-left { display: flex; align-items: center; gap: var(--space-4); }
.chapter-no { width: 36px; height: 36px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); font-weight: 700; font-size: var(--text-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.chapter-date { margin: var(--space-1) 0 0; font-size: var(--text-xs); }
@media (max-width: 768px) { .create-row { grid-template-columns: 1fr; } .project-stats { gap: var(--space-4); } }
</style>
