import { createError, defineEventHandler, getRouterParam } from 'h3'
import { randomId } from '~/server/utils/crypto'
import { getDb } from '~/server/utils/db'
import { requireChapterForProject, requireProjectForUser } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler((event) => {
  const user = requireUser(event)
  const projectId = getRouterParam(event, 'id') || ''
  const chapterId = getRouterParam(event, 'chapterId') || ''

  requireProjectForUser(projectId, user.id)
  const chapter = requireChapterForProject(chapterId, projectId)

  if (!chapter.active_draft_id) {
    throw createError({ statusCode: 400, statusMessage: '没有可发布的草稿' })
  }

  const db = getDb()
  const now = new Date().toISOString()
  db.prepare('UPDATE chapters SET status = ?, published_at = ?, updated_at = ? WHERE id = ?').run(
    'published',
    now,
    now,
    chapterId
  )

  db.prepare('INSERT INTO publish_records (id, project_id, chapter_id, status, published_at) VALUES (?, ?, ?, ?, ?)').run(
    randomId('pub'),
    projectId,
    chapterId,
    'published',
    now
  )

  return {
    chapterId,
    status: 'published',
    publishedAt: now
  }
})
