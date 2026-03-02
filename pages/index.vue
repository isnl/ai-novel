<script setup lang="ts">
import { NuxtLink } from '#components'
import { useAsyncData } from '#imports'
import { apiFetch } from '~/composables/useApi'

const { data, pending, refresh } = await useAsyncData('home-books', () =>
  apiFetch<{ books: Array<Record<string, unknown>> }>('/api/books')
)
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-content">
          <p class="hero-badge">
            <span class="i-carbon-magic-wand" />
            AI 驱动的全流程创作平台
          </p>
          <h1 class="hero-title">
            用 AI 的力量<br />
            <span class="gradient-text">释放你的创作才华</span>
          </h1>
          <p class="hero-desc">
            从书名到连载发布，纸墨青为你提供世界观构建、大纲生成、章节写作、多 Agent 审核润色的一站式创作体验。
          </p>
          <div class="hero-actions">
            <NuxtLink to="/workspace" class="btn btn-primary btn-lg">
              <span class="i-carbon-edit" />
              开始创作
            </NuxtLink>
            <NuxtLink to="/bookshelf" class="btn btn-secondary btn-lg">
              <span class="i-carbon-book" />
              浏览作品
            </NuxtLink>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-card">
            <div class="hero-card-header">
              <span class="i-carbon-pen-fountain hero-card-icon" />
              <span>创作预览</span>
            </div>
            <div class="hero-card-line skeleton" style="width: 90%; height: 12px;" />
            <div class="hero-card-line skeleton" style="width: 75%; height: 12px;" />
            <div class="hero-card-line skeleton" style="width: 85%; height: 12px;" />
            <div class="hero-card-line skeleton" style="width: 60%; height: 12px;" />
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="page-wrap">
      <div class="features-header">
        <h2 class="section-title">核心能力</h2>
        <p class="section-desc">一套工具，覆盖小说创作全链路</p>
      </div>
      <div class="features-grid">
        <div class="card card-hover feature-card">
          <div class="feature-icon-wrap">
            <span class="i-carbon-machine-learning-model feature-icon" />
          </div>
          <h3>AI 全流程创作</h3>
          <p class="muted">从世界观、大纲、角色到章节正文，AI 辅助每一步，大幅提升创作效率。</p>
        </div>
        <div class="card card-hover feature-card">
          <div class="feature-icon-wrap">
            <span class="i-carbon-flow feature-icon" />
          </div>
          <h3>多 Agent 编排</h3>
          <p class="muted">生成、审核、润色、一致性检查，多个专业 Agent 串行协作保障内容质量。</p>
        </div>
        <div class="card card-hover feature-card">
          <div class="feature-icon-wrap">
            <span class="i-carbon-version feature-icon" />
          </div>
          <h3>版本追溯</h3>
          <p class="muted">每章每稿自动存档，支持版本对比与一键回滚，创作过程全程可控。</p>
        </div>
      </div>

      <!-- Recent books -->
      <div class="recent-section">
        <div class="recent-header">
          <h2 class="section-title">最近更新</h2>
          <button class="btn btn-secondary" @click="() => refresh()">
            <span class="i-carbon-renew" />
            刷新
          </button>
        </div>

        <div v-if="pending" class="book-grid">
          <div v-for="n in 3" :key="n" class="card">
            <div class="skeleton" style="height: 20px; width: 60%; margin-bottom: 12px;" />
            <div class="skeleton" style="height: 14px; width: 40%; margin-bottom: 8px;" />
            <div class="skeleton" style="height: 14px; width: 50%;" />
          </div>
        </div>

        <div v-else-if="!data?.books?.length" class="card empty-state">
          <div class="empty-state-icon i-carbon-document-blank" />
          <p class="empty-state-title">暂无已发布作品</p>
          <p class="empty-state-desc">前往创作台发布你的第一章，作品将展示在这里。</p>
          <NuxtLink to="/workspace" class="btn btn-primary">
            <span class="i-carbon-edit" />
            去创作
          </NuxtLink>
        </div>

        <div v-else class="book-grid">
          <NuxtLink
            v-for="book in data.books"
            :key="String(book.id)"
            :to="`/book/${book.id}`"
            class="card card-interactive book-card"
          >
            <div class="book-card-top">
              <span class="tag tag-info">{{ book.genre }}</span>
            </div>
            <h3 class="book-title">{{ book.title }}</h3>
            <p class="muted book-meta">{{ book.style }}</p>
            <div class="book-card-footer">
              <span class="muted">
                <span class="i-carbon-document" />
                已发布 {{ book.publishedChapters }} 章
              </span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  padding: var(--space-16) 0;
  background: linear-gradient(135deg, var(--primary-soft) 0%, var(--bg) 40%, var(--accent-soft) 100%);
  border-bottom: 1px solid var(--divider);
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -200px;
  right: -100px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(31, 107, 117, 0.08) 0%, transparent 70%);
  border-radius: 50%;
}

.hero-inner {
  width: min(1200px, 100% - calc(var(--space-6) * 2));
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-12);
  align-items: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--surface);
  border: 1px solid var(--divider);
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
  color: var(--primary);
  font-weight: 500;
  margin: 0 0 var(--space-6);
  width: fit-content;
}

.hero-title {
  margin: 0 0 var(--space-5);
  font-size: var(--text-4xl);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.hero-desc {
  margin: 0 0 var(--space-8);
  font-size: var(--text-lg);
  color: var(--text-2);
  line-height: var(--leading-loose);
  max-width: 480px;
}

.hero-actions {
  display: flex;
  gap: var(--space-3);
}

.hero-visual {
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.hero-card {
  width: 320px;
  padding: var(--space-6);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: grid;
  gap: var(--space-4);
}

.hero-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  color: var(--text-2);
  font-size: var(--text-sm);
}

.hero-card-icon {
  color: var(--primary);
  font-size: 20px;
}

.hero-card-line {
  border-radius: var(--radius-xs);
}

.features-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5);
  margin-bottom: var(--space-12);
}

.feature-card {
  text-align: center;
  padding: var(--space-8) var(--space-6);
}

.feature-card h3 {
  margin: var(--space-4) 0 var(--space-2);
  font-size: var(--text-lg);
}

.feature-card p {
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-loose);
}

.feature-icon-wrap {
  width: 56px;
  height: 56px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--primary-soft) 0%, var(--accent-soft) 100%);
}

.feature-icon {
  font-size: 28px;
  color: var(--primary);
}

.recent-section {
  margin-top: var(--space-4);
}

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.book-meta {
  font-size: var(--text-sm);
  margin: 0;
}

.book-card-footer {
  margin-top: auto;
  padding-top: var(--space-4);
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

@media (max-width: 900px) {
  .hero-inner {
    grid-template-columns: 1fr;
  }

  .hero-title {
    font-size: var(--text-3xl);
  }

  .hero-visual {
    display: none;
  }

  .features-grid,
  .book-grid {
    grid-template-columns: 1fr;
  }
}
</style>
