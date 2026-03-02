<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const ws = useWorkspaceStore()
const projectId = computed(() => String(route.params.id))

const newChapterTitle = ref('第一章 破局')
const creating = ref(false)

await ws.fetchProject(projectId.value)

async function createChapter() {
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

    <section class="card">
      <h1>{{ ws.currentProject.title }}</h1>
      <p class="muted">{{ ws.currentProject.genre }} · {{ ws.currentProject.style }}</p>
      <div class="meta-row">
        <StatusBadge :text="ws.currentProject.status" />
        <span class="muted">目标 {{ ws.currentProject.targetWords }} 字</span>
      </div>
    </section>

    <section class="card chapter-sec">
      <div class="sec-head">
        <h2>章节管理</h2>
      </div>
      <div class="create-row">
        <input v-model="newChapterTitle" class="input" placeholder="章节标题" />
        <button class="btn btn-primary" :disabled="creating" @click="createChapter">
          {{ creating ? '创建中...' : '新建章节' }}
        </button>
      </div>

      <div v-if="!ws.chapters.length" class="muted">尚未创建章节。</div>
      <div v-else class="chapter-list">
        <NuxtLink
          v-for="chapter in ws.chapters"
          :key="chapter.id"
          :to="`/workspace/project/${projectId}/chapters/${chapter.id}`"
          class="chapter-item"
        >
          <strong>第{{ chapter.indexNo }}章 {{ chapter.title }}</strong>
          <StatusBadge :text="chapter.status" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
h1 {
  margin: 0;
}

.meta-row {
  margin-top: var(--space-3);
  display: flex;
  gap: var(--space-3);
}

.chapter-sec {
  margin-top: var(--space-5);
}

.sec-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-row {
  margin: var(--space-3) 0 var(--space-4);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-3);
}

.chapter-list {
  display: grid;
  gap: var(--space-2);
}

.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--divider);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  background: var(--surface-2);
}

@media (max-width: 768px) {
  .create-row {
    grid-template-columns: 1fr;
  }
}
</style>
