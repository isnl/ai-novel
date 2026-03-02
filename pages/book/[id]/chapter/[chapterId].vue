<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useAsyncData } from '#imports'
import { NuxtLink } from '#components'
import { apiFetch } from '~/composables/useApi'

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
  <div>
    <!-- Loading -->
    <div v-if="pending" class="page-wrap reading-wrap">
      <div class="card">
        <div class="skeleton" style="height: 32px; width: 50%; margin-bottom: 16px;" />
        <div class="skeleton" style="height: 14px; width: 30%; margin-bottom: 32px;" />
        <div v-for="n in 6" :key="n" class="skeleton" :style="{ height: '14px', width: (70 + Math.random() * 30) + '%', marginBottom: '12px' }" />
      </div>
    </div>

    <template v-else-if="data">
      <!-- Top nav -->
      <div class="reading-nav">
        <div class="reading-nav-inner">
          <NuxtLink :to="`/book/${bookId}`" class="btn btn-ghost">
            <span class="i-carbon-arrow-left" />
            返回目录
          </NuxtLink>
          <span class="reading-nav-title">{{ data.chapter.title }}</span>
          <div />
        </div>
      </div>

      <!-- Reading content -->
      <div class="page-wrap reading-wrap">
        <article class="reading-article">
          <h1 class="reading-title">{{ data.chapter.title }}</h1>
          <p class="reading-date muted">
            <span class="i-carbon-time" />
            {{ String(data.chapter.publishedAt || '').split('T')[0] || '' }}
          </p>
          <div class="reading-body">
            <p v-for="(line, idx) in String(data.chapter.content || '').split('\n')" :key="idx">{{ line }}</p>
          </div>
        </article>

        <!-- Bottom nav -->
        <div class="chapter-bottom-nav">
          <NuxtLink :to="`/book/${bookId}`" class="btn btn-secondary">
            <span class="i-carbon-list-numbered" />
            返回目录
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.reading-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(var(--surface-rgb, 255, 255, 255), 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--divider);
  padding: var(--space-3) 0;
}

.reading-nav-inner {
  width: min(800px, 100% - calc(var(--space-6) * 2));
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reading-nav-title {
  font-size: var(--text-sm);
  color: var(--text-2);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.reading-wrap {
  max-width: 800px;
}

.reading-article {
  padding: var(--space-8) 0;
}

.reading-title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-3xl);
  font-weight: 700;
  text-align: center;
}

.reading-date {
  text-align: center;
  margin: 0 0 var(--space-8);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
}

.reading-body {
  font-family: var(--font-reading);
  font-size: var(--text-lg);
  line-height: 2;
  color: var(--text-1);
}

.reading-body p {
  margin: 0 0 var(--space-4);
  text-indent: 2em;
}

.reading-body p:empty {
  display: none;
}

.chapter-bottom-nav {
  padding: var(--space-8) 0;
  border-top: 1px solid var(--divider);
  display: flex;
  justify-content: center;
  gap: var(--space-3);
}
</style>
