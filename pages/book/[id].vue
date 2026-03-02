<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useAsyncData } from '#imports'
import { NuxtLink } from '#components'
import { apiFetch } from '~/composables/useApi'

const route = useRoute()
const bookId = String(route.params.id)

const { data, pending, refresh } = await useAsyncData(`book-${bookId}`, () =>
  apiFetch<{ book: Record<string, unknown>; chapters: Array<Record<string, unknown>> }>(`/api/books/${bookId}`)
)

const savingShelf = ref(false)
const shelfMsg = ref('')
const shelfSuccess = ref(false)

async function addToBookshelf(): Promise<void> {
  savingShelf.value = true
  shelfMsg.value = ''
  try {
    await apiFetch('/api/bookshelf', {
      method: 'POST',
      body: { projectId: bookId, progress: 0 }
    })
    shelfMsg.value = '已加入书架'
    shelfSuccess.value = true
  } catch (e) {
    shelfMsg.value = (e as Error).message
    shelfSuccess.value = false
  } finally {
    savingShelf.value = false
  }
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="pending" class="page-wrap">
      <div class="card">
        <div class="skeleton" style="height: 32px; width: 50%; margin-bottom: 16px;" />
        <div class="skeleton" style="height: 16px; width: 30%; margin-bottom: 24px;" />
        <div class="skeleton" style="height: 16px; width: 80%;" />
      </div>
    </div>

    <template v-else-if="data">
      <!-- Book hero -->
      <div class="book-hero">
        <div class="book-hero-inner">
          <div class="book-cover">
            <span class="i-carbon-pen-fountain book-cover-icon" />
          </div>
          <div class="book-info">
            <h1 class="book-title">{{ data.book.title }}</h1>
            <p class="book-meta muted">{{ data.book.genre }} · {{ data.book.style }}</p>
            <div class="book-stats">
              <span class="stat">
                <span class="i-carbon-document" />
                {{ data.chapters.length }} 章
              </span>
              <span class="stat">
                <span class="i-carbon-time" />
                {{ String(data.book.createdAt || '').split('T')[0] }}
              </span>
            </div>
            <div class="book-actions">
              <button class="btn btn-primary" :disabled="savingShelf" @click="addToBookshelf">
                <span class="i-carbon-bookmark" />
                {{ savingShelf ? '处理中...' : '加入书架' }}
              </button>
              <button class="btn btn-secondary" @click="() => refresh()">
                <span class="i-carbon-renew" />
                刷新
              </button>
            </div>
            <div v-if="shelfMsg" class="shelf-msg" :class="shelfSuccess ? 'shelf-msg-ok' : 'shelf-msg-err'">
              <span :class="shelfSuccess ? 'i-carbon-checkmark-filled' : 'i-carbon-close-filled'" />
              {{ shelfMsg }}
            </div>
          </div>
        </div>
      </div>

      <!-- Chapters -->
      <div class="page-wrap">
        <section>
          <h2 class="section-title"><span class="i-carbon-list-numbered" /> 目录</h2>

          <div v-if="!data.chapters.length" class="card empty-state">
            <div class="empty-state-icon i-carbon-document-blank" />
            <p class="empty-state-title">暂无已发布章节</p>
            <p class="empty-state-desc">作者还在努力创作中，敬请期待。</p>
          </div>

          <div v-else class="chapter-list">
            <NuxtLink
              v-for="chapter in data.chapters"
              :key="String(chapter.id)"
              :to="`/book/${bookId}/chapter/${chapter.id}`"
              class="card card-hover chapter-item"
            >
              <div class="chapter-left">
                <span class="chapter-no">{{ chapter.indexNo }}</span>
                <div>
                  <strong>{{ chapter.title }}</strong>
                  <p class="muted chapter-date">{{ String(chapter.publishedAt || '').split('T')[0] || '' }}</p>
                </div>
              </div>
              <span class="i-carbon-chevron-right chapter-arrow" />
            </NuxtLink>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.book-hero {
  padding: var(--space-12) 0;
  background: linear-gradient(135deg, var(--primary-soft) 0%, var(--bg) 50%, var(--accent-soft) 100%);
  border-bottom: 1px solid var(--divider);
}

.book-hero-inner {
  width: min(1200px, 100% - calc(var(--space-6) * 2));
  margin: 0 auto;
  display: flex;
  gap: var(--space-8);
  align-items: flex-start;
}

.book-cover {
  width: 160px;
  height: 220px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-lg);
}

.book-cover-icon {
  font-size: 48px;
  color: white;
  opacity: 0.8;
}

.book-title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-3xl);
  font-weight: 700;
}

.book-meta {
  margin: 0 0 var(--space-4);
  font-size: var(--text-lg);
}

.book-stats {
  display: flex;
  gap: var(--space-5);
  margin-bottom: var(--space-5);
}

.stat {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--text-2);
}

.book-actions {
  display: flex;
  gap: var(--space-2);
}

.shelf-msg {
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.shelf-msg-ok { color: #059669; }
.shelf-msg-err { color: #dc2626; }

.chapter-list {
  display: grid;
  gap: var(--space-3);
}

.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
}

.chapter-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.chapter-no {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 700;
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chapter-date {
  margin: var(--space-1) 0 0;
  font-size: var(--text-xs);
}

.chapter-arrow {
  color: var(--text-3);
  font-size: 18px;
}

@media (max-width: 768px) {
  .book-hero-inner {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .book-stats {
    justify-content: center;
  }

  .book-actions {
    justify-content: center;
  }
}
</style>
