import { createError, readBody } from 'h3'
import { randomId } from '~/server/utils/crypto'
import { getDb } from '~/server/utils/db'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const body = await readBody<{ projectId?: string; chapterId?: string; progress?: number }>(event)

  const projectId = body.projectId || ''
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'projectId 不能为空' })
  }

  const db = getDb()
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId) as { id: string } | undefined
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: '作品不存在' })
  }

  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO bookshelf_items (id, user_id, project_id, last_chapter_id, progress, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, project_id)
     DO UPDATE SET
       last_chapter_id = excluded.last_chapter_id,
       progress = excluded.progress,
       updated_at = excluded.updated_at`
  ).run(randomId('shelf'), user.id, projectId, body.chapterId || null, Number(body.progress || 0), now, now)

  return { ok: true }
})
