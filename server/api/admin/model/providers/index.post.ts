import { createError, defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '~/server/utils/admin'
import { randomId } from '~/server/utils/crypto'
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<{ name?: string; type?: string; baseUrl?: string }>(event)

  const name = (body.name || '').trim()
  const type = (body.type || '').trim()
  const baseUrl = (body.baseUrl || '').trim()

  if (!name || !type) {
    throw createError({ statusCode: 400, statusMessage: 'name/type 不能为空' })
  }

  const db = getDb()
  const now = new Date().toISOString()
  const id = randomId('provider')

  db.prepare('INSERT INTO model_providers (id, name, type, base_url, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    name,
    type,
    baseUrl,
    now
  )

  return {
    provider: { id, name, type, baseUrl }
  }
})
