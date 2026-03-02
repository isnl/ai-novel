import { createError, defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '~/server/utils/admin'
import { randomId } from '~/server/utils/crypto'
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<{ name?: string; description?: string; sortOrder?: number }>(event)

  const name = (body.name || '').trim()
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name 不能为空' })
  }

  const db = getDb()
  const now = new Date().toISOString()
  const id = randomId('cat')

  db.prepare(
    'INSERT INTO prompt_categories (id, name, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, name, body.description || '', body.sortOrder ?? 0, now, now)

  return {
    category: { id, name, description: body.description || '', sortOrder: body.sortOrder ?? 0, createdAt: now, updatedAt: now }
  }
})
