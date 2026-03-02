<script setup lang="ts">
const route = useRoute()
const bookId = String(route.params.id)

const { data, pending, refresh } = await useAsyncData(`book-${bookId}`, () => apiFetch<{ book: Record<string, unknown>; chapters: Array<Record<string, unknown>> }>(`/api/books/${bookId}`))

const savingShelf = ref(false)
const shelfMsg = ref('')

async function addToBookshelf() {
  savingShelf.value = true
  shelfMsg.value = ''
  try {
    await apiFetch('/api/bookshelf', {
      method: 'POST',
      body: { projectId: bookId, progress: 0 }
    })
    shelfMsg.value = '已加入书架'
  } catch (e) {
    shelfMsg.value = (e as Error).message
  } finally {
    savingShelf.value = false
  }
}
</script>

<template>
  <div class="page-wrap">
    <section v-if="pending" class="card muted">加载中...</section>

    <template v-else-if="data">
      <section class="card">
        <h1>{{ data.book.title }}</h1>
        <p class="muted">{{ data.book.genre }} · {{ data.book.style }}</p>
        <div class="actions">
          <button class="btn btn-secondary" @click="() => refresh()">刷新</button>
          <button class="btn btn-primary" :disabled="savingShelf" @click="addToBookshelf">
            {{ savingShelf ? '处理中...' : '加入书架' }}
          </button>
        </div>
        <p v-if="shelfMsg" class="muted">{{ shelfMsg }}</p>
      </section>

      <section class="card chapter-sec">
        <h2>目录</h2>
        <div v-if="!data.chapters.length" class="muted">暂无已发布章节</div>
        <div v-else class="chapter-list">
          <NuxtLink
            v-for="chapter in data.chapters"
            :key="String(chapter.id)"
            :to="`/book/${bookId}/chapter/${chapter.id}`"
            class="chapter-item"
          >
            第{{ chapter.indexNo }}章 {{ chapter.title }}
          </NuxtLink>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
h1,
h2 {
  margin: 0;
}

.actions {
  margin-top: var(--space-3);
  display: flex;
  gap: var(--space-2);
}

.chapter-sec {
  margin-top: var(--space-4);
}

.chapter-list {
  margin-top: var(--space-3);
  display: grid;
  gap: var(--space-2);
}

.chapter-item {
  border: 1px solid var(--divider);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  padding: var(--space-3);
}
</style>
