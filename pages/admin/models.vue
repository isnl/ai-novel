<script setup lang="ts">
import { ref, reactive } from 'vue'
import { definePageMeta } from '#imports'
import { apiFetch } from '~/composables/useApi'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const providers = ref<Array<Record<string, unknown>>>([])
const profiles = ref<Array<Record<string, unknown>>>([])
const bindings = ref<Array<Record<string, unknown>>>([])

const creating = ref(false)
const testingId = ref('')
const bindingSaving = ref(false)

const profileForm = reactive({
  providerId: 'provider_openai',
  modelName: 'gpt-4.1-mini',
  baseUrl: '',
  apiKey: '',
  paramsJson: '{"temperature":0.7,"top_p":0.9,"max_tokens":4096}',
  capabilityTags: 'supports_json_mode,supports_long_context',
  isDefault: 1
})

const bindingForm = reactive({
  agentType: 'generate',
  primaryProfileId: '',
  fallbackProfileId: '',
  strategyJson: '{"priority":["availability","stability","cost","quality"]}'
})

const testResult = ref('')
const testSuccess = ref(false)

async function loadData(): Promise<void> {
  const [providerRes, profileRes, bindingRes] = await Promise.all([
    apiFetch<{ providers: Array<Record<string, unknown>> }>('/api/admin/model/providers'),
    apiFetch<{ profiles: Array<Record<string, unknown>> }>('/api/admin/model/profiles'),
    apiFetch<{ bindings: Array<Record<string, unknown>> }>('/api/admin/model/agent-bindings')
  ])

  providers.value = providerRes.providers
  profiles.value = profileRes.profiles
  bindings.value = bindingRes.bindings

  if (profiles.value[0] && !bindingForm.primaryProfileId) {
    bindingForm.primaryProfileId = String(profiles.value[0].id)
  }
}

await loadData()

async function createProfile(): Promise<void> {
  creating.value = true
  try {
    await apiFetch('/api/admin/model/profiles', {
      method: 'POST',
      body: profileForm
    })
    profileForm.apiKey = ''
    await loadData()
  } finally {
    creating.value = false
  }
}

async function testProfile(profileId: string): Promise<void> {
  testingId.value = profileId
  testResult.value = ''
  try {
    const res = await apiFetch<{ status: string; provider: string; model: string; latencyMs: number }>(
      `/api/admin/model/profiles/${profileId}/test`,
      { method: 'POST' }
    )
    testResult.value = `连接成功：${res.provider}/${res.model}，延迟 ${res.latencyMs}ms`
    testSuccess.value = true
  } catch (e) {
    testResult.value = (e as Error).message
    testSuccess.value = false
  } finally {
    testingId.value = ''
  }
}

async function saveBinding(): Promise<void> {
  bindingSaving.value = true
  try {
    await apiFetch(`/api/admin/model/agent-bindings/${bindingForm.agentType}`, {
      method: 'PUT',
      body: bindingForm
    })
    await loadData()
  } finally {
    bindingSaving.value = false
  }
}

const AGENT_TYPES = [
  { value: 'generate', label: '生成', icon: 'i-carbon-machine-learning-model' },
  { value: 'audit', label: '审核', icon: 'i-carbon-task-approved' },
  { value: 'polish', label: '润色', icon: 'i-carbon-text-annotation-toggle' },
  { value: 'consistency', label: '一致性', icon: 'i-carbon-connect' },
  { value: 'publish', label: '发布', icon: 'i-carbon-send-alt' }
]
</script>

<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1 class="section-title"><span class="i-carbon-settings-adjust" /> 模型网关配置</h1>
      <p class="section-desc">统一管理 Provider、Model Profile 与 Agent 路由绑定。</p>
    </div>

    <div class="main-grid">
      <!-- Create profile -->
      <section class="card">
        <h2 class="panel-title"><span class="i-carbon-add-alt" /> 新增模型配置</h2>
        <div class="form-grid">
          <label class="form-label">
            <span><span class="i-carbon-cloud-service-management" /> Provider</span>
            <select v-model="profileForm.providerId" class="select">
              <option v-for="p in providers" :key="String(p.id)" :value="String(p.id)">{{ p.name }}</option>
            </select>
          </label>
          <label class="form-label">
            <span><span class="i-carbon-model-alt" /> 模型名</span>
            <input v-model="profileForm.modelName" class="input" />
          </label>
          <label class="form-label">
            <span><span class="i-carbon-link" /> Base URL</span>
            <input v-model="profileForm.baseUrl" class="input" placeholder="OpenAI Compatible 可填" />
          </label>
          <label class="form-label">
            <span><span class="i-carbon-locked" /> API Key</span>
            <input v-model="profileForm.apiKey" class="input" type="password" placeholder="仅保存密文" />
          </label>
          <label class="form-label form-label-full">
            <span><span class="i-carbon-code" /> 参数 JSON</span>
            <textarea v-model="profileForm.paramsJson" class="textarea mono" />
          </label>
          <label class="form-label form-label-full">
            <span><span class="i-carbon-tag" /> 能力标签</span>
            <input v-model="profileForm.capabilityTags" class="input" />
          </label>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" :disabled="creating" @click="createProfile">
            <span class="i-carbon-save" />
            {{ creating ? '保存中...' : '保存 Profile' }}
          </button>
        </div>
      </section>

      <!-- Profile list -->
      <section class="card">
        <h2 class="panel-title"><span class="i-carbon-list" /> Profile 列表</h2>
        <div v-if="!profiles.length" class="empty-hint muted">暂无配置，请先创建 Profile</div>
        <div v-else class="profile-list">
          <div v-for="profile in profiles" :key="String(profile.id)" class="profile-card">
            <div class="profile-info">
              <strong class="profile-name">{{ profile.modelName }}</strong>
              <span class="muted profile-meta">{{ profile.providerName }} · {{ profile.maskedApiKey || '未配置 Key' }}</span>
            </div>
            <button
              class="btn btn-secondary"
              :disabled="testingId === String(profile.id)"
              @click="testProfile(String(profile.id))"
            >
              <span class="i-carbon-connection-signal" />
              {{ testingId === String(profile.id) ? '测试中...' : '测试连接' }}
            </button>
          </div>
        </div>
        <div v-if="testResult" class="test-result" :class="testSuccess ? 'test-success' : 'test-fail'">
          <span :class="testSuccess ? 'i-carbon-checkmark-filled' : 'i-carbon-close-filled'" />
          {{ testResult }}
        </div>
      </section>
    </div>

    <!-- Agent bindings -->
    <section class="card binding-section">
      <h2 class="panel-title"><span class="i-carbon-flow" /> Agent 路由绑定</h2>
      <div class="bind-form">
        <label class="form-label">
          <span>Agent 类型</span>
          <select v-model="bindingForm.agentType" class="select">
            <option v-for="at in AGENT_TYPES" :key="at.value" :value="at.value">{{ at.label }}</option>
          </select>
        </label>
        <label class="form-label">
          <span>主模型</span>
          <select v-model="bindingForm.primaryProfileId" class="select">
            <option value="">选择主模型</option>
            <option v-for="profile in profiles" :key="String(profile.id)" :value="String(profile.id)">{{ profile.modelName }}</option>
          </select>
        </label>
        <label class="form-label">
          <span>备用模型</span>
          <select v-model="bindingForm.fallbackProfileId" class="select">
            <option value="">选择备用模型</option>
            <option v-for="profile in profiles" :key="String(profile.id)" :value="String(profile.id)">{{ profile.modelName }}</option>
          </select>
        </label>
        <label class="form-label">
          <span>策略 JSON</span>
          <input v-model="bindingForm.strategyJson" class="input mono" />
        </label>
        <div class="bind-action">
          <button class="btn btn-primary" :disabled="bindingSaving" @click="saveBinding">
            <span class="i-carbon-save" />
            {{ bindingSaving ? '保存中...' : '保存绑定' }}
          </button>
        </div>
      </div>

      <div v-if="bindings.length" class="binding-list">
        <div v-for="item in bindings" :key="String(item.agentType)" class="binding-card">
          <div class="binding-type">
            <span :class="AGENT_TYPES.find(a => a.value === item.agentType)?.icon || 'i-carbon-bot'" class="binding-icon" />
            <strong>{{ AGENT_TYPES.find(a => a.value === item.agentType)?.label || item.agentType }}</strong>
          </div>
          <div class="binding-models muted">
            <span>主：{{ profiles.find(p => String(p.id) === String(item.primaryProfileId))?.modelName || '-' }}</span>
            <span>备：{{ profiles.find(p => String(p.id) === String(item.fallbackProfileId))?.modelName || '-' }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-page { padding: var(--space-8); }
.admin-header { margin-bottom: var(--space-6); }
.admin-header h1 { display: flex; align-items: center; gap: var(--space-2); }
.panel-title { margin: 0 0 var(--space-4); font-size: var(--text-lg); display: flex; align-items: center; gap: var(--space-2); }

.main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4); }

.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
.form-label-full { grid-column: 1 / -1; }
.form-actions { margin-top: var(--space-5); }

.mono { font-family: var(--font-mono); font-size: var(--text-sm); }

.profile-list { display: grid; gap: var(--space-3); }
.profile-card { border: 1px solid var(--divider); background: var(--surface-2); border-radius: var(--radius-md); padding: var(--space-4); display: flex; justify-content: space-between; align-items: center; transition: border-color 0.2s; }
.profile-card:hover { border-color: var(--border-hover, var(--primary)); }
.profile-info { display: flex; flex-direction: column; gap: var(--space-1); }
.profile-name { font-size: var(--text-base); }
.profile-meta { font-size: var(--text-sm); }
.empty-hint { padding: var(--space-4); text-align: center; }

.test-result { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-sm); font-size: var(--text-sm); display: flex; align-items: center; gap: var(--space-2); }
.test-success { background: rgba(16, 185, 129, 0.1); color: #059669; }
.test-fail { background: rgba(239, 68, 68, 0.1); color: #dc2626; }

.binding-section { margin-top: 0; }
.bind-form { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)) auto; gap: var(--space-3); align-items: end; }
.bind-action { display: flex; align-items: end; }

.binding-list { margin-top: var(--space-5); display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-3); }
.binding-card { border: 1px solid var(--divider); border-radius: var(--radius-md); padding: var(--space-4); background: var(--surface-2); }
.binding-type { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); }
.binding-icon { font-size: 20px; color: var(--primary); }
.binding-models { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-sm); }

@media (max-width: 1100px) {
  .main-grid { grid-template-columns: 1fr; }
  .form-grid { grid-template-columns: 1fr; }
  .bind-form { grid-template-columns: 1fr; }
}
</style>
