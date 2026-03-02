<script setup lang="ts">
const auth = useAuthStore()

if (!auth.user) {
  await auth.fetchMe()
}
</script>

<template>
  <div>
    <header class="topbar">
      <div class="topbar-inner">
        <NuxtLink to="/" class="brand">AI 小说创作系统</NuxtLink>
        <nav class="nav-links">
          <NuxtLink to="/workspace">创作台</NuxtLink>
          <NuxtLink to="/bookshelf">书架</NuxtLink>
        </nav>
        <div class="user-zone">
          <template v-if="auth.user">
            <span class="muted">{{ auth.user.nickname }}</span>
            <button class="btn btn-secondary" @click="auth.logout">退出</button>
          </template>
          <NuxtLink v-else class="btn btn-secondary" to="/login">登录</NuxtLink>
        </div>
      </div>
    </header>

    <main>
      <slot />
    </main>
  </div>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  backdrop-filter: blur(8px);
  background: color-mix(in srgb, var(--bg) 76%, white 24%);
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

.brand {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--primary);
}

.nav-links {
  display: flex;
  gap: var(--space-4);
}

.nav-links a {
  color: var(--text-2);
}

.nav-links a.router-link-active {
  color: var(--primary);
  font-weight: 600;
}

.user-zone {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

@media (max-width: 768px) {
  .topbar-inner {
    width: min(1200px, 100% - calc(var(--space-4) * 2));
  }

  .nav-links {
    display: none;
  }
}
</style>
