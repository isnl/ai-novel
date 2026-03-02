<script setup lang="ts">
import { NuxtLink } from '#components'
import { definePageMeta } from '#imports'
import { useAuthStore } from '~/stores/auth.store'

definePageMeta({ middleware: 'admin' })

const auth = useAuthStore()

if (!auth.user) {
  await auth.fetchMe()
}

const menuItems = [
  { label: '仪表盘', to: '/admin', icon: 'i-carbon-dashboard' },
  { label: '模型管理', to: '/admin/models', icon: 'i-carbon-settings-adjust' },
  { label: '提示词管理', to: '/admin/prompts', icon: 'i-carbon-text-annotation-toggle' }
]
</script>

<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="sidebar-brand">
        <NuxtLink to="/admin" class="brand-link">
          <span class="i-carbon-settings" />
          <span>后台管理</span>
        </NuxtLink>
      </div>
      <nav class="sidebar-nav">
        <NuxtLink
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="sidebar-item"
        >
          <span :class="item.icon" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
      <div class="sidebar-footer">
        <NuxtLink to="/workspace" class="sidebar-item sidebar-back">
          <span class="i-carbon-arrow-left" />
          <span>返回前台</span>
        </NuxtLink>
        <div class="sidebar-user" v-if="auth.user">
          <div class="sidebar-avatar">{{ auth.user.nickname.charAt(0) }}</div>
          <span class="sidebar-username">{{ auth.user.nickname }}</span>
        </div>
      </div>
    </aside>
    <main class="admin-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.admin-shell {
  display: flex;
  min-height: 100vh;
}

.admin-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--divider);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.sidebar-brand {
  padding: var(--space-5) var(--space-4);
  border-bottom: 1px solid var(--divider);
}

.brand-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--primary);
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-3) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-2);
  transition: color var(--dur-fast) var(--ease-standard),
    background var(--dur-fast) var(--ease-standard);
}

.sidebar-item:hover {
  color: var(--text);
  background: var(--surface-3);
}

.sidebar-item.router-link-active {
  color: var(--primary);
  background: var(--primary-soft);
  font-weight: 600;
}

.sidebar-footer {
  padding: var(--space-3) var(--space-2);
  border-top: 1px solid var(--divider);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sidebar-back {
  color: var(--text-3);
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
}

.sidebar-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: var(--text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: 600;
}

.sidebar-username {
  font-size: var(--text-sm);
  color: var(--text-2);
}

.admin-main {
  flex: 1;
  min-width: 0;
  background: var(--bg);
}

@media (max-width: 768px) {
  .admin-sidebar {
    width: 60px;
  }
  .sidebar-brand span:last-child,
  .sidebar-item span:last-child,
  .sidebar-username {
    display: none;
  }
  .sidebar-nav { align-items: center; }
  .sidebar-item { justify-content: center; padding: var(--space-2); }
}
</style>
