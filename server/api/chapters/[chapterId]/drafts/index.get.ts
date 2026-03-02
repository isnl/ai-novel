import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getDb } from '~/server/utils/db'
import { requireUser } from '~/server/utils/session'

function ensureOwnership(chapterId: string, userId: string) {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT c.id FROM chapters c
       INNER JOIN projects p ON p.id = c.project_id
       WHERE c.id = ? AND p.user_id = ?`
    )
    .get(chapterId, userId) as { id: string } | undefined

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '章节不存在' })
  }
}

export default defineEventHandler((event) => {
  const user = requireUser(event)
  const chapterId = getRouterParam(event, 'chapterId') || ''
  ensureOwnership(chapterId, user.id)

  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM chapter_drafts WHERE chapter_id = ? ORDER BY version_no DESC')
    .all(chapterId) as Record<string, unknown>[]

  return {
    drafts: rows.map((row) => ({
      id: String(row.id),
      chapterId: String(row.chapter_id),
      versionNo: Number(row.version_no),
      content: String(row.content),
      source: String(row.source),
      createdAt: String(row.created_at)
    }))
  }
})
