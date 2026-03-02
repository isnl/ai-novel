<script setup lang="ts">
const route = useRoute()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const form = reactive({
  email: '',
  password: '',
  nickname: ''
})
const error = ref('')

async function submit() {
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
  <div class="page-wrap">
    <div class="auth card">
      <h1>{{ mode === 'login' ? '登录创作台' : '注册账号' }}</h1>
      <p class="muted">MVP 阶段支持邮箱登录，后续可扩展手机号登录。</p>

      <div class="switch-row">
        <button class="btn" :class="mode === 'login' ? 'btn-primary' : 'btn-secondary'" @click="mode = 'login'">登录</button>
        <button class="btn" :class="mode === 'register' ? 'btn-primary' : 'btn-secondary'" @click="mode = 'register'">
          注册
        </button>
      </div>

      <div class="form-grid">
        <label>
          邮箱/账号
          <input v-model="form.email" class="input" type="text" placeholder="you@example.com 或 admin" />
        </label>

        <label v-if="mode === 'register'">
          昵称
          <input v-model="form.nickname" class="input" type="text" placeholder="你的作者名" />
        </label>

        <label>
          密码
          <input v-model="form.password" class="input" type="password" placeholder="至少 6 位" />
        </label>
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>
      <button class="btn btn-primary submit" :disabled="auth.pending" @click="submit">
        {{ auth.pending ? '处理中...' : mode === 'login' ? '登录' : '注册并登录' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.auth {
  max-width: 520px;
  margin: 48px auto;
}

h1 {
  margin: 0;
}

.switch-row {
  margin-top: var(--space-4);
  display: flex;
  gap: var(--space-2);
}

.form-grid {
  margin-top: var(--space-4);
  display: grid;
  gap: var(--space-4);
}

label {
  font-size: var(--text-sm);
  color: var(--text-2);
  display: grid;
  gap: var(--space-2);
}

.submit {
  margin-top: var(--space-5);
  width: 100%;
  height: 44px;
}

.error-text {
  color: var(--danger);
  margin-top: var(--space-2);
}
</style>
