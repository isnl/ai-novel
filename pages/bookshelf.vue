<script setup lang="ts">
import { definePageMeta, useAsyncData } from '#imports'
import { NuxtLink } from '#components'
import { apiFetch } from '~/composables/useApi'

definePageMeta({ middleware: 'auth' })

const { data, pending, refresh } = await useAsyncData('bookshelf-items', () =>
  apiFetch<{ items: Array<Record<string, unknown>> }>('/api/bookshelf')
)
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-inner">
        <h1>
          <span class="i-carbon-book" />
          我的书架
        </h1>
        <p>收藏的作品与阅读进度一目了然</p>
      </div>
    </div>

    <div class="page-wrap">
      <div class="shelf-actions">
        <span class="muted">共 {{ data?.items?.length || 0 }} 本</span>
        <button class="btn btn-secondary" @click="() => refresh()">
          <span class="i-carbon-renew" />
          刷新
        </button>
      </div>

      <!-- Loading -->
      <div v-if="pending" class="book-grid">
        <div v-for="n in 4" :key="n" class="card">
          <div class="skeleton" style="height: 20px; width: 60%; margin-bottom: 12px;" />
          <div class="skeleton" style="height: 14px; width: 40%; margin-bottom: 8px;" />
          <div class="skeleton" style="height: 8px; width: 100%; margin-top: 16px;" />
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!data?.items?.length" class="card empty-state">
        <div class="empty-state-icon i-carbon-bookmark" />
        <p class="empty-state-title">书架空空如也</p>
        <p class="empty-state-desc">去浏览作品页面收藏你喜欢的作品吧。</p>
        <NuxtLink to="/" class="btn btn-primary">
          <span class="i-carbon-home" />
          浏览作品
        </NuxtLink>
      </div>

      <!-- Book grid -->
      <div v-else class="book-grid">
        <NuxtLink
          v-for="item in data.items"
          :key="String(item.id)"
          :to="`/book/${item.projectId}`"
          class="card card-interactive book-card"
        >
          <div class="book-card-top">
            <span class="tag tag-info">{{ item.genre || '小说' }}</span>
          </div>
          <h3 class="book-title">{{ item.title }}</h3>
          <p class="muted book-last">最近阅读：{{ item.lastChapterTitle || '暂无' }}</p>
          <div class="progress-section">
            <div class="progress-bar">
              <div class="progress-bar-fill" :style="{ width: Math.round(Number(item.progress || 0) * 100) + '%' }" />
            </div>
            <span class="progress-label muted">{{ Math.round(Number(item.progress || 0) * 100) }}%</span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shelf-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.book-card {
  display: flex;
  flex-direction: column;
}

.book-card-top {
  margin-bottom: var(--space-3);
}

.book-title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-lg);
  font-weight: 600;
}

.book-last {
  font-size: var(--text-sm);
  margin: 0;
}

.progress-section {
  margin-top: auto;
  padding-top: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.progress-label {
  font-size: var(--text-xs);
  white-space: nowrap;
  min-width: 36px;
  text-align: right;
}

@media (max-width: 900px) {
  .book-grid {
    grid-template-columns: 1fr;
  }
}
</style>
