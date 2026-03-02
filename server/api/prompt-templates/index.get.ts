import { defineEventHandler, getQuery } from 'h3'
import { getDb } from '~/server/utils/db'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler((event) => {
  requireUser(event)
  const query = getQuery(event)
  const categoryId = String(query.category_id || '')

  const db = getDb()
  let sql = `SELECT t.id, t.category_id, t.name, t.description, t.variables_json, c.name AS category_name
             FROM prompt_templates t
             INNER JOIN prompt_categories c ON c.id = t.category_id
             WHERE t.is_active = 1`
  const params: string[] = []

  if (categoryId) {
    sql += ' AND t.category_id = ?'
    params.push(categoryId)
  }

  sql += ' ORDER BY t.sort_order ASC, t.created_at ASC'
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]

  return {
    templates: rows.map((row) => ({
      id: String(row.id),
      categoryId: String(row.category_id),
      categoryName: String(row.category_name),
      name: String(row.name),
      description: (row.description as string | null) ?? '',
      variablesJson: String(row.variables_json || '[]')
    }))
  }
})
