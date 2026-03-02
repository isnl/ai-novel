import type { H3Event } from 'h3'
import { createError } from 'h3'
import { decryptApiKey } from './crypto'
import { getDb } from './db'

type ProviderType = 'anthropic' | 'openai' | 'openai_compatible'

type ResponseFormat = 'text' | 'json'

interface ResolvedProfile {
  id: string
  providerType: ProviderType
  providerName: string
  providerBaseUrl: string
  modelName: string
  baseUrl: string
  apiKey: string
  params: Record<string, unknown>
}

interface RunModelOptions {
  systemPrompt: string
  userPrompt: string
  responseFormat?: ResponseFormat
  maxTokens?: number
  temperature?: number
}

interface Usage {
  tokensIn: number
  tokensOut: number
}

export interface ModelRunResult {
  profileId: string
  content: string
  metadata: {
    provider: string
    model: string
    latencyMs: number
    tokensIn: number
    tokensOut: number
    costEstimate: number
  }
}

function parseParams(raw: string) {
  try {
    const json = JSON.parse(raw)
    return typeof json === 'object' && json ? (json as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function toNumber(value: unknown, fallback: number) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, '')
}

function endpointForAnthropic(baseUrl: string) {
  const clean = trimTrailingSlash(baseUrl)
  return clean.endsWith('/v1') ? `${clean}/messages` : `${clean}/v1/messages`
}

function resolveOpenAIBaseUrl(profile: ResolvedProfile) {
  const fromProfile = trimTrailingSlash(profile.baseUrl)
  if (fromProfile) return fromProfile

  const fromProvider = trimTrailingSlash(profile.providerBaseUrl)
  if (fromProvider) return fromProvider

  if (profile.providerType === 'openai') {
    return 'https://api.openai.com/v1'
  }

  throw createError({ statusCode: 400, statusMessage: `模型 ${profile.modelName} 缺少 base_url 配置` })
}

function extractTextContent(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') return item.text
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }

  return ''
}

function calculateCostEstimate(profile: ResolvedProfile, usage: Usage) {
  const inputCost = toNumber(profile.params.cost_input_per_1k, 0)
  const outputCost = toNumber(profile.params.cost_output_per_1k, 0)
  return Number(((usage.tokensIn / 1000) * inputCost + (usage.tokensOut / 1000) * outputCost).toFixed(6))
}

function readErrorMessage(data: unknown, statusText: string) {
  if (!data || typeof data !== 'object') return statusText

  if ('error' in data && data.error && typeof data.error === 'object' && 'message' in data.error) {
    return String(data.error.message)
  }

  if ('message' in data) {
    return String(data.message)
  }

  return statusText
}

function getAbortSignal(timeoutMs: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return { signal: controller.signal, dispose: () => clearTimeout(timer) }
}

async function callOpenAICompatible(profile: ResolvedProfile, options: RunModelOptions) {
  const endpoint = `${resolveOpenAIBaseUrl(profile)}/chat/completions`
  const temperature = options.temperature ?? toNumber(profile.params.temperature, 0.7)
  const topP = toNumber(profile.params.top_p, 1)
  const maxTokens = options.maxTokens ?? Math.max(128, toNumber(profile.params.max_tokens, 2048))

  const body: Record<string, unknown> = {
    model: profile.modelName,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt }
    ],
    temperature,
    top_p: topP,
    max_tokens: maxTokens,
    stream: false
  }

  if (options.responseFormat === 'json') {
    body.response_format = { type: 'json_object' }
  }

  const timeoutMs = Math.max(1000, toNumber(profile.params.timeout_ms, 60000))
  const { signal, dispose } = getAbortSignal(timeoutMs)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${profile.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal
    })

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok) {
      throw new Error(`OpenAI-compatible 调用失败: ${readErrorMessage(data, response.statusText)}`)
    }

    const choice = Array.isArray(data.choices) ? (data.choices[0] as Record<string, unknown>) : undefined
    const message = choice?.message as Record<string, unknown> | undefined
    const content = extractTextContent(message?.content)

    const usage = (data.usage || {}) as Record<string, unknown>
    return {
      content,
      usage: {
        tokensIn: toNumber(usage.prompt_tokens, 0),
        tokensOut: toNumber(usage.completion_tokens, 0)
      }
    }
  } finally {
    dispose()
  }
}

async function callAnthropic(profile: ResolvedProfile, options: RunModelOptions) {
  const baseUrl = profile.baseUrl || profile.providerBaseUrl || 'https://api.anthropic.com'
  const endpoint = endpointForAnthropic(baseUrl)

  const temperature = options.temperature ?? toNumber(profile.params.temperature, 0.7)
  const topP = toNumber(profile.params.top_p, 1)
  const maxTokens = options.maxTokens ?? Math.max(128, toNumber(profile.params.max_tokens, 2048))
  const anthropicVersion = String(profile.params.anthropic_version || '2023-06-01')

  const body: Record<string, unknown> = {
    model: profile.modelName,
    system: options.systemPrompt,
    messages: [{ role: 'user', content: options.userPrompt }],
    temperature,
    top_p: topP,
    max_tokens: maxTokens
  }

  const timeoutMs = Math.max(1000, toNumber(profile.params.timeout_ms, 60000))
  const { signal, dispose } = getAbortSignal(timeoutMs)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': profile.apiKey,
        'anthropic-version': anthropicVersion,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal
    })

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok) {
      throw new Error(`Anthropic 调用失败: ${readErrorMessage(data, response.statusText)}`)
    }

    const content = Array.isArray(data.content)
      ? data.content
          .map((item) => {
            if (item && typeof item === 'object' && 'type' in item && item.type === 'text' && 'text' in item) {
              return String(item.text)
            }
            return ''
          })
          .filter(Boolean)
          .join('\n')
      : ''

    const usage = (data.usage || {}) as Record<string, unknown>
    return {
      content,
      usage: {
        tokensIn: toNumber(usage.input_tokens, 0),
        tokensOut: toNumber(usage.output_tokens, 0)
      }
    }
  } finally {
    dispose()
  }
}

function resolveProfile(event: H3Event, profileId: string) {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT p.id, p.model_name, p.base_url, p.encrypted_api_key, p.params_json,
              mp.name AS provider_name, mp.type AS provider_type, mp.base_url AS provider_base_url
       FROM model_profiles p
       INNER JOIN model_providers mp ON mp.id = p.provider_id
       WHERE p.id = ?`
    )
    .get(profileId) as Record<string, unknown> | undefined

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: `模型配置不存在: ${profileId}` })
  }

  const config = useRuntimeConfig(event)
  const encrypted = String(row.encrypted_api_key || '')
  const apiKey = encrypted ? decryptApiKey(encrypted, config.apiKeySecret) : ''

  return {
    id: String(row.id),
    providerType: String(row.provider_type) as ProviderType,
    providerName: String(row.provider_name),
    providerBaseUrl: String(row.provider_base_url || ''),
    modelName: String(row.model_name),
    baseUrl: String(row.base_url || ''),
    apiKey,
    params: parseParams(String(row.params_json || '{}'))
  } satisfies ResolvedProfile
}

function resolveCandidateProfiles(event: H3Event, bindingAgentType: string) {
  const db = getDb()

  const binding = db
    .prepare('SELECT primary_profile_id, fallback_profile_id FROM agent_model_bindings WHERE agent_type = ?')
    .get(bindingAgentType) as { primary_profile_id: string | null; fallback_profile_id: string | null } | undefined

  const profileIds: string[] = []
  if (binding?.primary_profile_id) profileIds.push(binding.primary_profile_id)
  if (binding?.fallback_profile_id && binding.fallback_profile_id !== binding.primary_profile_id) {
    profileIds.push(binding.fallback_profile_id)
  }

  if (!profileIds.length) {
    const defaultProfile = db
      .prepare('SELECT id FROM model_profiles ORDER BY is_default DESC, datetime(updated_at) DESC LIMIT 2')
      .all() as Array<{ id: string }>

    profileIds.push(...defaultProfile.map((item) => item.id))
  }

  if (!profileIds.length) {
    throw createError({ statusCode: 400, statusMessage: '尚未配置模型 Profile，请先在模型网关页面添加配置' })
  }

  const profiles = profileIds
    .map((id) => resolveProfile(event, id))
    .filter((item) => item.apiKey)

  if (!profiles.length) {
    throw createError({ statusCode: 400, statusMessage: '模型 Profile 缺少 API Key，请先完成配置' })
  }

  return profiles
}

async function runWithProfile(profile: ResolvedProfile, options: RunModelOptions): Promise<ModelRunResult> {
  const retryCount = Math.max(0, Math.floor(toNumber(profile.params.retry_count, 0)))
  const retryBackoff = Math.max(100, toNumber(profile.params.retry_backoff, 400))

  let lastError: unknown

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const startedAt = Date.now()

    try {
      const result =
        profile.providerType === 'anthropic'
          ? await callAnthropic(profile, options)
          : await callOpenAICompatible(profile, options)

      const latencyMs = Date.now() - startedAt
      return {
        profileId: profile.id,
        content: result.content,
        metadata: {
          provider: profile.providerName,
          model: profile.modelName,
          latencyMs,
          tokensIn: result.usage.tokensIn,
          tokensOut: result.usage.tokensOut,
          costEstimate: calculateCostEstimate(profile, result.usage)
        }
      }
    } catch (error) {
      lastError = error
      if (attempt < retryCount) {
        await sleep(retryBackoff * (attempt + 1))
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : '未知错误'
  throw new Error(`${profile.providerName}/${profile.modelName} 调用失败：${message}`)
}

export async function runModelWithProfileId(event: H3Event, profileId: string, options: RunModelOptions) {
  const profile = resolveProfile(event, profileId)

  if (!profile.apiKey) {
    throw createError({ statusCode: 400, statusMessage: `模型 ${profile.modelName} 缺少 API Key` })
  }

  return await runWithProfile(profile, options)
}

export async function runModelWithAgentBinding(event: H3Event, bindingAgentType: string, options: RunModelOptions) {
  const candidates = resolveCandidateProfiles(event, bindingAgentType)
  let lastError: unknown

  for (const profile of candidates) {
    try {
      return await runWithProfile(profile, options)
    } catch (error) {
      lastError = error
    }
  }

  const message = lastError instanceof Error ? lastError.message : '未知错误'
  throw createError({ statusCode: 502, statusMessage: `模型调用失败：${message}` })
}
