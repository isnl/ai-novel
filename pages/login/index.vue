<script setup lang="ts">
import { ref, reactive } from 'vue'
import { NuxtLink } from '#components'
import { useRoute, navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth.store'

const route = useRoute()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const form = reactive({
  email: '',
  password: '',
  nickname: ''
})
const error = ref('')

async function submit(): Promise<void> {
  error.value = ''
  try {
    if (mode.value === 'login') {
      await auth.login({ email: form.email, password: form.password })
    } else {
      await auth.register({ email: form.email, password: form.password, nickname: form.nickname || '新作者' })
    }

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/workspace'
    await navigateTo(redirect)
  } catch (e) {
    error.value = (e as Error).message || '操作失败'
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-left">
      <div class="login-brand">
        <span class="i-carbon-pen-fountain brand-icon" />
        <h1 class="gradient-text">纸墨青</h1>
        <p>AI 小说创作平台</p>
      </div>
      <div class="login-features">
        <div class="login-feature">
          <span class="i-carbon-machine-learning-model" />
          <span>AI 全流程辅助创作</span>
        </div>
        <div class="login-feature">
          <span class="i-carbon-flow" />
          <span>多 Agent 编排保障质量</span>
        </div>
        <div class="login-feature">
          <span class="i-carbon-version" />
          <span>版本追溯与一键回滚</span>
        </div>
      </div>
    </div>
    <div class="login-right">
      <div class="auth-card card">
        <h2 class="auth-title">{{ mode === 'login' ? '欢迎回来' : '创建账号' }}</h2>
        <p class="muted auth-subtitle">{{ mode === 'login' ? '登录你的创作账号' : '注册一个新的创作账号' }}</p>

        <div class="mode-switch">
          <button
            class="mode-btn"
            :class="{ active: mode === 'login' }"
            @click="mode = 'login'"
          >登录</button>
          <button
            class="mode-btn"
            :class="{ active: mode === 'register' }"
            @click="mode = 'register'"
          >注册</button>
        </div>

        <div class="form-grid">
          <label class="form-label">
            <span>
              <span class="i-carbon-email" />
              邮箱 / 账号
            </span>
            <input v-model="form.email" class="input" type="text" placeholder="you@example.com" />
          </label>

          <label v-if="mode === 'register'" class="form-label">
            <span>
              <span class="i-carbon-user" />
              昵称
            </span>
            <input v-model="form.nickname" class="input" type="text" placeholder="你的作者笔名" />
          </label>

          <label class="form-label">
            <span>
              <span class="i-carbon-locked" />
              密码
            </span>
            <input v-model="form.password" class="input" type="password" placeholder="至少 6 位" />
          </label>
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>
        <button class="btn btn-primary btn-lg submit-btn" :disabled="auth.pending" @click="submit">
          {{ auth.pending ? '处理中...' : mode === 'login' ? '登录' : '注册并登录' }}
        </button>

        <p class="login-tip muted">
          测试账号: admin / 123456
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: calc(100vh - 64px);
}

.login-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--space-12);
  background: linear-gradient(135deg, var(--primary-soft) 0%, var(--bg) 50%, var(--accent-soft) 100%);
}

.login-brand {
  margin-bottom: var(--space-10);
}

.brand-icon {
  font-size: 48px;
  color: var(--primary);
  margin-bottom: var(--space-4);
  display: block;
}

.login-brand h1 {
  margin: 0;
  font-size: var(--text-4xl);
  font-weight: 700;
}

.login-brand p {
  margin: var(--space-2) 0 0;
  font-size: var(--text-lg);
  color: var(--text-2);
}

.login-features {
  display: grid;
  gap: var(--space-4);
}

.login-feature {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-md);
  color: var(--text-2);
}

.login-feature span:first-child {
  font-size: 20px;
  color: var(--primary);
}

.login-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
}

.auth-card {
  width: 100%;
  max-width: 440px;
  box-shadow: var(--shadow-md);
}

.auth-title {
  margin: 0;
  font-size: var(--text-2xl);
}

.auth-subtitle {
  margin: var(--space-1) 0 0;
}

.mode-switch {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-5);
  padding: var(--space-1);
  background: var(--surface-3);
  border-radius: var(--radius-sm);
}

.mode-btn {
  flex: 1;
  height: 36px;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-3);
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease-standard),
    color var(--dur-fast) var(--ease-standard);
}

.mode-btn.active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-xs);
}

.form-grid {
  margin-top: var(--space-5);
  display: grid;
  gap: var(--space-4);
}

.form-label span {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.submit-btn {
  margin-top: var(--space-5);
  width: 100%;
}

.error-text {
  color: var(--danger);
  font-size: var(--text-sm);
  margin: var(--space-3) 0 0;
}

.login-tip {
  margin-top: var(--space-4);
  text-align: center;
  font-size: var(--text-xs);
}

@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-left {
    display: none;
  }

  .login-right {
    padding: var(--space-6);
  }
}
</style>
