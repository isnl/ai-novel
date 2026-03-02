import { createError, getRouterParam } from 'h3'
import { getDb } from '~/server/utils/db'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler((event) => {
  const user = requireUser(event)
  const chapterId = getRouterParam(event, 'chapterId') || ''
  const draftId = getRouterParam(event, 'draftId') || ''

  const db = getDb()
  const chapter = db
    .prepare(
      `SELECT c.id FROM chapters c
       INNER JOIN projects p ON p.id = c.project_id
       WHERE c.id = ? AND p.user_id = ?`
    )
    .get(chapterId, user.id) as { id: string } | undefined

  if (!chapter) {
    throw createError({ statusCode: 404, statusMessage: '章节不存在' })
  }

  const draft = db.prepare('SELECT id FROM chapter_drafts WHERE id = ? AND chapter_id = ?').get(draftId, chapterId) as
    | { id: string }
    | undefined

  if (!draft) {
    throw createError({ statusCode: 404, statusMessage: '草稿不存在' })
  }

  db.prepare('UPDATE chapters SET active_draft_id = ?, updated_at = ? WHERE id = ?').run(
    draftId,
    new Date().toISOString(),
    chapterId
  )

  return { ok: true }
})
