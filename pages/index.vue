<script setup lang="ts">
const { data, pending, refresh } = await useAsyncData('home-books', () => apiFetch<{ books: Array<Record<string, unknown>> }>('/api/books'))
</script>

<template>
  <div class="page-wrap">
    <section class="hero card">
      <h1>纸墨青 · AI 小说创作系统</h1>
      <p class="muted">从书名到连载发布的全流程创作工作台，支持多 Agent 编排与版本追溯。</p>
      <div class="hero-actions">
        <NuxtLink to="/workspace" class="btn btn-primary">进入创作台</NuxtLink>
        <NuxtLink to="/bookshelf" class="btn btn-secondary">我的书架</NuxtLink>
      </div>
    </section>

    <section class="list-header">
      <h2>最近更新</h2>
      <button class="btn btn-secondary" @click="() => refresh()">刷新</button>
    </section>

    <div v-if="pending" class="card muted">加载中...</div>
    <div v-else-if="!data?.books?.length" class="card muted">暂无已发布作品，先去创作台发布第一章。</div>
    <div v-else class="book-grid">
      <NuxtLink
        v-for="book in data.books"
        :key="String(book.id)"
        :to="`/book/${book.id}`"
        class="card book-item"
      >
        <h3>{{ book.title }}</h3>
        <p class="muted">{{ book.genre }} · {{ book.style }}</p>
        <p class="muted">已发布 {{ book.publishedChapters }} 章</p>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.hero {
  margin-bottom: var(--space-6);
}

.hero h1 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-2xl);
}

.hero-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.book-item h3 {
  margin: 0 0 var(--space-2);
}

@media (max-width: 900px) {
  .book-grid {
    grid-template-columns: 1fr;
  }
}
</style>
