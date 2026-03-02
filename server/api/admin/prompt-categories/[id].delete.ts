import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAdmin } from '~/server/utils/admin'
import { getDb } from '~/server/utils/db'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id') || ''

  const db = getDb()
  const row = db.prepare('SELECT id FROM prompt_categories WHERE id = ?').get(id) as { id: string } | undefined
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '分类不存在' })
  }

  const templateCount = db.prepare('SELECT COUNT(1) as count FROM prompt_templates WHERE category_id = ?').get(id) as { count: number }
  if (templateCount.count > 0) {
    throw createError({ statusCode: 400, statusMessage: '该分类下还有模板，请先删除或转移模板' })
  }

  db.prepare('DELETE FROM prompt_categories WHERE id = ?').run(id)
  return { ok: true }
})
