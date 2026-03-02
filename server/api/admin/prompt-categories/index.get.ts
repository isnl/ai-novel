import { defineEventHandler } from 'h3'
import { requireAdmin } from '~/server/utils/admin'
import { getDb } from '~/server/utils/db'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const db = getDb()
  const rows = db.prepare('SELECT * FROM prompt_categories ORDER BY sort_order ASC, created_at ASC').all() as Record<string, unknown>[]

  return {
    categories: rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: (row.description as string | null) ?? '',
      sortOrder: Number(row.sort_order ?? 0),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }))
  }
})
