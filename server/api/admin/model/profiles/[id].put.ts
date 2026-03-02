import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { requireAdmin } from '~/server/utils/admin'
import { encryptApiKey } from '~/server/utils/crypto'
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody<{
    modelName?: string
    baseUrl?: string
    apiKey?: string
    paramsJson?: string
    capabilityTags?: string
    isDefault?: number
  }>(event)

  const db = getDb()
  const row = db.prepare('SELECT id FROM model_profiles WHERE id = ?').get(id) as { id: string } | undefined
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'profile 不存在' })
  }

  const config = useRuntimeConfig(event)
  const now = new Date().toISOString()
  const encryptedApiKey = body.apiKey ? encryptApiKey(body.apiKey, config.apiKeySecret) : null

  db.prepare(
    `UPDATE model_profiles
     SET model_name = COALESCE(?, model_name),
         base_url = COALESCE(?, base_url),
         encrypted_api_key = COALESCE(?, encrypted_api_key),
         params_json = COALESCE(?, params_json),
         capability_tags = COALESCE(?, capability_tags),
         is_default = COALESCE(?, is_default),
         updated_at = ?
     WHERE id = ?`
  ).run(
    body.modelName || null,
    body.baseUrl || null,
    encryptedApiKey,
    body.paramsJson || null,
    body.capabilityTags || null,
    body.isDefault === undefined ? null : body.isDefault,
    now,
    id
  )

  if (body.isDefault) {
    db.prepare('UPDATE model_profiles SET is_default = 0 WHERE id != ?').run(id)
    db.prepare('UPDATE model_profiles SET is_default = 1 WHERE id = ?').run(id)
  }

  return { ok: true }
})
