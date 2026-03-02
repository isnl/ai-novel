<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { data, pending, refresh } = await useAsyncData('bookshelf-items', () => apiFetch<{ items: Array<Record<string, unknown>> }>('/api/bookshelf'))
</script>

<template>
  <div class="page-wrap">
    <section class="list-header">
      <h1>我的书架</h1>
      <button class="btn btn-secondary" @click="() => refresh()">刷新</button>
    </section>

    <div v-if="pending" class="card muted">加载中...</div>
    <div v-else-if="!data?.items?.length" class="card muted">书架为空，去阅读页收藏作品。</div>
    <div v-else class="grid">
      <NuxtLink v-for="item in data.items" :key="String(item.id)" :to="`/book/${item.projectId}`" class="card">
        <h3>{{ item.title }}</h3>
        <p class="muted">{{ item.genre }}</p>
        <p class="muted">进度：{{ Math.round(Number(item.progress || 0) * 100) }}%</p>
        <p class="muted">最近阅读：{{ item.lastChapterTitle || '暂无' }}</p>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grid {
  margin-top: var(--space-4);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
