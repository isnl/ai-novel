import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAdmin } from '~/server/utils/admin'
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody<{
    categoryId?: string
    name?: string
    description?: string
    systemPrompt?: string
    userPromptTemplate?: string
    variablesJson?: string
    isActive?: number
    sortOrder?: number
  }>(event)

  const db = getDb()
  const row = db.prepare('SELECT id FROM prompt_templates WHERE id = ?').get(id) as { id: string } | undefined
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '模板不存在' })
  }

  if (body.categoryId) {
    const cat = db.prepare('SELECT id FROM prompt_categories WHERE id = ?').get(body.categoryId) as { id: string } | undefined
    if (!cat) {
      throw createError({ statusCode: 400, statusMessage: '分类不存在' })
    }
  }

  const now = new Date().toISOString()
  db.prepare(
    `UPDATE prompt_templates
     SET category_id = COALESCE(?, category_id),
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         system_prompt = COALESCE(?, system_prompt),
         user_prompt_template = COALESCE(?, user_prompt_template),
         variables_json = COALESCE(?, variables_json),
         is_active = COALESCE(?, is_active),
         sort_order = COALESCE(?, sort_order),
         updated_at = ?
     WHERE id = ?`
  ).run(
    body.categoryId || null,
    body.name || null,
    body.description ?? null,
    body.systemPrompt || null,
    body.userPromptTemplate || null,
    body.variablesJson || null,
    body.isActive ?? null,
    body.sortOrder ?? null,
    now,
    id
  )

  return { ok: true }
})
