import { createError, getRouterParam, readBody } from 'h3'
import { randomId } from '~/server/utils/crypto'
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

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const chapterId = getRouterParam(event, 'chapterId') || ''
  ensureOwnership(chapterId, user.id)

  const body = await readBody<{ content?: string; source?: string }>(event)
  const content = (body.content || '').trim()
  if (!content) {
    throw createError({ statusCode: 400, statusMessage: '草稿内容不能为空' })
  }

  const db = getDb()
  const row = db
    .prepare('SELECT COALESCE(MAX(version_no), 0) AS max_version FROM chapter_drafts WHERE chapter_id = ?')
    .get(chapterId) as { max_version: number }

  const now = new Date().toISOString()
  const draftId = randomId('draft')
  db.prepare(
    'INSERT INTO chapter_drafts (id, chapter_id, version_no, content, source, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(draftId, chapterId, row.max_version + 1, content, body.source || 'manual', now)

  db.prepare('UPDATE chapters SET active_draft_id = ?, updated_at = ? WHERE id = ?').run(draftId, now, chapterId)

  return {
    draft: {
      id: draftId,
      chapterId,
      versionNo: row.max_version + 1,
      content,
      source: body.source || 'manual',
      createdAt: now
    }
  }
})
