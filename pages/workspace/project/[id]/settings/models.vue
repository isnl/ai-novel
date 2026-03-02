<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectId = String(route.params.id)

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

async function loadData() {
  const [providerRes, profileRes, bindingRes] = await Promise.all([
    apiFetch<{ providers: Array<Record<string, unknown>> }>('/api/model/providers'),
    apiFetch<{ profiles: Array<Record<string, unknown>> }>('/api/model/profiles'),
    apiFetch<{ bindings: Array<Record<string, unknown>> }>('/api/model/agent-bindings')
  ])

  providers.value = providerRes.providers
  profiles.value = profileRes.profiles
  bindings.value = bindingRes.bindings

  if (profiles.value[0] && !bindingForm.primaryProfileId) {
    bindingForm.primaryProfileId = String(profiles.value[0].id)
  }
}

await loadData()

async function createProfile() {
  creating.value = true
  try {
    await apiFetch('/api/model/profiles', {
      method: 'POST',
      body: profileForm
    })
    profileForm.apiKey = ''
    await loadData()
  } finally {
    creating.value = false
  }
}

async function testProfile(profileId: string) {
  testingId.value = profileId
  testResult.value = ''
  try {
    const res = await apiFetch<{ status: string; provider: string; model: string; latencyMs: number }>(
      `/api/model/profiles/${profileId}/test`,
      { method: 'POST' }
    )
    testResult.value = `连接成功：${res.provider}/${res.model}，延迟 ${res.latencyMs}ms`
  } catch (e) {
    testResult.value = (e as Error).message
  } finally {
    testingId.value = ''
  }
}

async function saveBinding() {
  bindingSaving.value = true
  try {
    await apiFetch(`/api/model/agent-bindings/${bindingForm.agentType}`, {
      method: 'PUT',
      body: bindingForm
    })
    await loadData()
  } finally {
    bindingSaving.value = false
  }
}
</script>

<template>
  <div class="page-wrap">
    <WorkspaceTabs :project-id="projectId" />

    <section class="card">
      <h1>模型网关配置</h1>
      <p class="muted">统一管理 Provider、Model Profile 与 Agent 路由绑定。</p>
    </section>

    <div class="grid">
      <section class="card">
        <h2>新增模型配置</h2>
        <div class="form-grid">
          <label>
            Provider
            <select v-model="profileForm.providerId" class="select">
              <option v-for="p in providers" :key="String(p.id)" :value="String(p.id)">{{ p.name }}</option>
            </select>
          </label>
          <label>
            模型名
            <input v-model="profileForm.modelName" class="input" />
          </label>
          <label>
            Base URL
            <input v-model="profileForm.baseUrl" class="input" placeholder="OpenAI Compatible 可填" />
          </label>
          <label>
            API Key
            <input v-model="profileForm.apiKey" class="input" type="password" placeholder="仅保存密文" />
          </label>
          <label>
            参数 JSON
            <textarea v-model="profileForm.paramsJson" class="textarea"></textarea>
          </label>
          <label>
            能力标签
            <input v-model="profileForm.capabilityTags" class="input" />
          </label>
          <button class="btn btn-primary" :disabled="creating" @click="createProfile">
            {{ creating ? '保存中...' : '保存 Profile' }}
          </button>
        </div>
      </section>

      <section class="card">
        <h2>Profile 列表</h2>
        <div v-if="!profiles.length" class="muted">暂无配置</div>
        <div v-else class="profile-list">
          <div v-for="profile in profiles" :key="String(profile.id)" class="profile-item">
            <div>
              <strong>{{ profile.modelName }}</strong>
              <p class="muted">{{ profile.providerName }} · {{ profile.maskedApiKey || '未配置 Key' }}</p>
            </div>
            <button class="btn btn-secondary" :disabled="testingId === String(profile.id)" @click="testProfile(String(profile.id))">
              {{ testingId === String(profile.id) ? '测试中...' : '测试连接' }}
            </button>
          </div>
        </div>
        <p v-if="testResult" class="muted test-result">{{ testResult }}</p>
      </section>
    </div>

    <section class="card binding-sec">
      <h2>Agent 路由绑定</h2>
      <div class="bind-grid">
        <select v-model="bindingForm.agentType" class="select">
          <option value="generate">generate</option>
          <option value="audit">audit</option>
          <option value="polish">polish</option>
          <option value="consistency">consistency</option>
          <option value="publish">publish</option>
        </select>

        <select v-model="bindingForm.primaryProfileId" class="select">
          <option value="">主模型</option>
          <option v-for="profile in profiles" :key="String(profile.id)" :value="String(profile.id)">{{ profile.modelName }}</option>
        </select>

        <select v-model="bindingForm.fallbackProfileId" class="select">
          <option value="">备用模型</option>
          <option v-for="profile in profiles" :key="String(profile.id)" :value="String(profile.id)">{{ profile.modelName }}</option>
        </select>

        <input v-model="bindingForm.strategyJson" class="input" />
        <button class="btn btn-primary" :disabled="bindingSaving" @click="saveBinding">
          {{ bindingSaving ? '保存中...' : '保存绑定' }}
        </button>
      </div>

      <div class="binding-list">
        <div v-for="item in bindings" :key="String(item.agentType)" class="binding-item">
          <strong>{{ item.agentType }}</strong>
          <span class="muted">主：{{ item.primaryProfileId || '-' }} / 备：{{ item.fallbackProfileId || '-' }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
h1,
h2 {
  margin: 0;
}

.grid {
  margin-top: var(--space-4);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.form-grid {
  margin-top: var(--space-3);
  display: grid;
  gap: var(--space-3);
}

label {
  display: grid;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-2);
}

.profile-list {
  margin-top: var(--space-3);
  display: grid;
  gap: var(--space-2);
}

.profile-item {
  border: 1px solid var(--divider);
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.binding-sec {
  margin-top: var(--space-4);
}

.bind-grid {
  margin-top: var(--space-3);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-3);
}

.binding-list {
  margin-top: var(--space-4);
  display: grid;
  gap: var(--space-2);
}

.binding-item {
  border: 1px solid var(--divider);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  display: flex;
  justify-content: space-between;
  background: var(--surface-2);
}

.test-result {
  margin-top: var(--space-3);
}

@media (max-width: 1100px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .bind-grid {
    grid-template-columns: 1fr;
  }
}
</style>
