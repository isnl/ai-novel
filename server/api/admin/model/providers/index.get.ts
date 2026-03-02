import { defineEventHandler } from 'h3'
import { requireAdmin } from '~/server/utils/admin'
import { getDb } from '~/server/utils/db'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const db = getDb()
  const rows = db.prepare('SELECT id, name, type, base_url FROM model_providers ORDER BY created_at ASC').all() as Record<
    string,
    unknown
  >[]

  return {
    providers: rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      type: String(row.type),
      baseUrl: (row.base_url as string | null) ?? ''
    }))
  }
})
