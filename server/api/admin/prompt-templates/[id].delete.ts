import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAdmin } from '~/server/utils/admin'
import { getDb } from '~/server/utils/db'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id') || ''

  const db = getDb()
  const row = db.prepare('SELECT id FROM prompt_templates WHERE id = ?').get(id) as { id: string } | undefined
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '模板不存在' })
  }

  db.prepare('DELETE FROM prompt_templates WHERE id = ?').run(id)
  return { ok: true }
})
