import { createError, defineEventHandler, readBody } from 'h3'
import { randomId } from '~/server/utils/crypto'
import { getDb } from '~/server/utils/db'
import { toProjectResponse } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const body = await readBody<{ title?: string; genre?: string; style?: string; targetWords?: number }>(event)

  const title = (body.title || '').trim()
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: '书名不能为空' })
  }

  const now = new Date().toISOString()
  const projectId = randomId('proj')
  const genre = (body.genre || '玄幻').trim()
  const style = (body.style || '沉浸叙事').trim()
  const targetWords = Math.max(1000, Math.min(500000, Number(body.targetWords || 100000)))

  const db = getDb()
  db.prepare(
    `INSERT INTO projects (
      id, user_id, title, genre, style, target_words, status, world_text, outline_text, characters_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(projectId, user.id, title, genre, style, targetWords, 'init', null, null, null, now, now)

  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Record<string, unknown>
  return {
    project: toProjectResponse(row)
  }
})
