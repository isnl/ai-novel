<script setup lang="ts">
import { computed } from 'vue'
import { NuxtLink } from '#components'
import { useRoute } from '#imports'
import { useAuthStore } from '~/stores/auth.store'
import AiChatDrawer from '~/components/AiChatDrawer.vue'

const auth = useAuthStore()
const route = useRoute()

if (!auth.user) {
  await auth.fetchMe()
}

const showAiChat = computed((): boolean => {
  return route.path.startsWith('/workspace')
})
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="topbar-left">
          <NuxtLink to="/" class="brand">
            <span class="brand-icon i-carbon-pen-fountain" />
            <span class="brand-text">纸墨青</span>
          </NuxtLink>
          <nav class="nav-links">
            <NuxtLink to="/" class="nav-item">
              <span class="i-carbon-home" />
              <span>首页</span>
            </NuxtLink>
            <NuxtLink to="/workspace" class="nav-item">
              <span class="i-carbon-edit" />
              <span>创作台</span>
            </NuxtLink>
            <NuxtLink to="/bookshelf" class="nav-item">
              <span class="i-carbon-book" />
              <span>书架</span>
            </NuxtLink>
            <NuxtLink v-if="auth.user?.role === 'admin'" to="/admin" class="nav-item">
              <span class="i-carbon-settings" />
              <span>后台</span>
            </NuxtLink>
          </nav>
        </div>
        <div class="user-zone">
          <template v-if="auth.user">
            <div class="user-info">
              <div class="avatar">{{ auth.user.nickname.charAt(0) }}</div>
              <span class="user-name">{{ auth.user.nickname }}</span>
            </div>
            <button class="btn btn-ghost" @click="auth.logout">
              <span class="i-carbon-logout" />
              退出
            </button>
          </template>
          <NuxtLink v-else class="btn btn-primary" to="/login">
            <span class="i-carbon-login" />
            登录
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="main-content">
      <slot />
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="i-carbon-pen-fountain" />
          <span>纸墨青 · AI 小说创作平台</span>
        </div>
        <p class="footer-copy">面向创作者的全流程 AI 辅助写作工具</p>
      </div>
    </footer>

    <AiChatDrawer v-if="showAiChat" />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(248, 245, 238, 0.85);
  border-bottom: 1px solid var(--divider);
}

.topbar-inner {
  width: min(1200px, 100% - calc(var(--space-6) * 2));
  height: 64px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--primary);
  transition: opacity var(--dur-fast) var(--ease-standard);
}

.brand:hover {
  opacity: 0.85;
}

.brand-icon {
  font-size: 24px;
}

.nav-links {
  display: flex;
  gap: var(--space-1);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-2);
  transition:
    color var(--dur-fast) var(--ease-standard),
    background var(--dur-fast) var(--ease-standard);
}

.nav-item:hover {
  color: var(--text);
  background: var(--surface-3);
}

.nav-item.router-link-active {
  color: var(--primary);
  background: var(--primary-soft);
}

.user-zone {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: var(--text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: 600;
}

.user-name {
  font-size: var(--text-sm);
  color: var(--text-2);
  font-weight: 500;
}

.main-content {
  flex: 1;
}

.site-footer {
  margin-top: auto;
  padding: var(--space-8) 0;
  border-top: 1px solid var(--divider);
  background: var(--surface-2);
}

.footer-inner {
  width: min(1200px, 100% - calc(var(--space-6) * 2));
  margin: 0 auto;
  text-align: center;
}

.footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: var(--space-2);
}

.footer-copy {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-3);
}

@media (max-width: 768px) {
  .topbar-inner {
    width: min(1200px, 100% - calc(var(--space-4) * 2));
  }

  .nav-links {
    display: none;
  }

  .topbar-left {
    gap: var(--space-4);
  }

  .brand-text {
    display: none;
  }

  .user-name {
    display: none;
  }
}
</style>
