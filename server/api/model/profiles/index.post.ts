import { createError, readBody } from 'h3'
import { encryptApiKey, randomId } from '~/server/utils/crypto'
import { getDb } from '~/server/utils/db'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const body = await readBody<{
    providerId?: string
    modelName?: string
    baseUrl?: string
    apiKey?: string
    paramsJson?: string
    capabilityTags?: string
    isDefault?: number
  }>(event)

  const providerId = body.providerId || ''
  const modelName = (body.modelName || '').trim()
  if (!providerId || !modelName) {
    throw createError({ statusCode: 400, statusMessage: 'providerId/modelName 不能为空' })
  }

  const db = getDb()
  const provider = db.prepare('SELECT id FROM model_providers WHERE id = ?').get(providerId) as { id: string } | undefined
  if (!provider) {
    throw createError({ statusCode: 400, statusMessage: 'provider 不存在' })
  }

  const config = useRuntimeConfig(event)
  const now = new Date().toISOString()
  const profileId = randomId('profile')
  const encryptedApiKey = body.apiKey ? encryptApiKey(body.apiKey, config.apiKeySecret) : ''

  db.prepare(
    `INSERT INTO model_profiles (
      id, provider_id, model_name, base_url, encrypted_api_key, params_json, capability_tags, is_default, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    profileId,
    providerId,
    modelName,
    body.baseUrl || '',
    encryptedApiKey,
    body.paramsJson || JSON.stringify({ temperature: 0.7, top_p: 0.9, max_tokens: 4096 }),
    body.capabilityTags || 'supports_json_mode,supports_long_context',
    body.isDefault ? 1 : 0,
    now,
    now
  )

  if (body.isDefault) {
    db.prepare('UPDATE model_profiles SET is_default = 0 WHERE id != ?').run(profileId)
    db.prepare('UPDATE model_profiles SET is_default = 1 WHERE id = ?').run(profileId)
  }

  return {
    profileId
  }
})
