import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '~/server/utils/admin'
import { getDb } from '~/server/utils/db'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const query = getQuery(event)
  const categoryId = String(query.category_id || '')

  const db = getDb()
  let sql = `SELECT t.*, c.name AS category_name
             FROM prompt_templates t
             INNER JOIN prompt_categories c ON c.id = t.category_id`
  const params: string[] = []

  if (categoryId) {
    sql += ' WHERE t.category_id = ?'
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
      systemPrompt: String(row.system_prompt),
      userPromptTemplate: String(row.user_prompt_template),
      variablesJson: String(row.variables_json || '[]'),
      isActive: Number(row.is_active ?? 1),
      sortOrder: Number(row.sort_order ?? 0),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }))
  }
})
