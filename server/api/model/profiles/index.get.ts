import { decryptApiKey, maskApiKey } from '~/server/utils/crypto'
import { getDb } from '~/server/utils/db'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler((event) => {
  requireUser(event)
  const db = getDb()
  const config = useRuntimeConfig(event)

  const rows = db
    .prepare(
      `SELECT p.id, p.provider_id, p.model_name, p.base_url, p.encrypted_api_key, p.params_json, p.capability_tags, p.is_default,
              mp.name AS provider_name
       FROM model_profiles p
       INNER JOIN model_providers mp ON mp.id = p.provider_id
       ORDER BY datetime(p.updated_at) DESC`
    )
    .all() as Record<string, unknown>[]

  return {
    profiles: rows.map((row) => {
      const encrypted = String(row.encrypted_api_key || '')
      const plain = encrypted ? decryptApiKey(encrypted, config.apiKeySecret) : ''
      return {
        id: String(row.id),
        providerId: String(row.provider_id),
        providerName: String(row.provider_name),
        modelName: String(row.model_name),
        baseUrl: (row.base_url as string | null) ?? '',
        maskedApiKey: plain ? maskApiKey(plain) : '',
        paramsJson: String(row.params_json || '{}'),
        capabilityTags: String(row.capability_tags || ''),
        isDefault: Number(row.is_default || 0)
      }
    })
  }
})
