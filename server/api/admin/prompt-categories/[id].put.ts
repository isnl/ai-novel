import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAdmin } from '~/server/utils/admin'
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody<{ name?: string; description?: string; sortOrder?: number }>(event)

  const db = getDb()
  const row = db.prepare('SELECT id FROM prompt_categories WHERE id = ?').get(id) as { id: string } | undefined
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '分类不存在' })
  }

  const now = new Date().toISOString()
  db.prepare(
    `UPDATE prompt_categories
     SET name = COALESCE(?, name),
         description = COALESCE(?, description),
         sort_order = COALESCE(?, sort_order),
         updated_at = ?
     WHERE id = ?`
  ).run(body.name || null, body.description ?? null, body.sortOrder ?? null, now, id)

  return { ok: true }
})
