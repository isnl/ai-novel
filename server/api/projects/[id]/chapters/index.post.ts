import { createError, getRouterParam, readBody } from 'h3'
import { randomId } from '~/server/utils/crypto'
import { getDb } from '~/server/utils/db'
import { requireProjectForUser, toChapterResponse } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const projectId = getRouterParam(event, 'id') || ''
  requireProjectForUser(projectId, user.id)

  const body = await readBody<{ title?: string }>(event)
  const title = (body.title || '').trim()
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: '章节标题不能为空' })
  }

  const db = getDb()
  const maxIndex = db
    .prepare('SELECT COALESCE(MAX(index_no), 0) AS max_index FROM chapters WHERE project_id = ?')
    .get(projectId) as { max_index: number }

  const chapterId = randomId('chap')
  const now = new Date().toISOString()

  db.prepare(
    `INSERT INTO chapters (
      id, project_id, index_no, title, status, active_draft_id, outline_text, summary_text, published_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(chapterId, projectId, maxIndex.max_index + 1, title, 'planned', null, null, null, null, now, now)

  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, projectId)

  const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId) as Record<string, unknown>
  return { chapter: toChapterResponse(chapter) }
})
