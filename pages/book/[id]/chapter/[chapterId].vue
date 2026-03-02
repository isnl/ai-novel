<script setup lang="ts">
const route = useRoute()
const bookId = String(route.params.id)
const chapterId = String(route.params.chapterId)

const { data, pending } = await useAsyncData(
  `read-${bookId}-${chapterId}`,
  () => apiFetch<{ chapter: Record<string, unknown> }>(`/api/books/${bookId}/chapters/${chapterId}`)
)

onMounted(async () => {
  try {
    await apiFetch('/api/bookshelf', {
      method: 'POST',
      body: { projectId: bookId, chapterId, progress: 1 }
    })
  } catch {
    // 阅读侧允许未登录访问，写书架失败时不阻断阅读
  }
})
</script>

<template>
  <div class="page-wrap">
    <section v-if="pending" class="card muted">加载中...</section>

    <template v-else-if="data">
      <article class="card reading-content">
        <h1>{{ data.chapter.title }}</h1>
        <p class="muted">发布时间：{{ data.chapter.publishedAt || '-' }}</p>
        <p v-for="(line, idx) in String(data.chapter.content || '').split('\n')" :key="idx">{{ line }}</p>
      </article>
    </template>
  </div>
</template>

<style scoped>
h1 {
  font-size: 30px;
  margin-top: 0;
}

p {
  margin: 0 0 var(--space-4);
}
</style>
