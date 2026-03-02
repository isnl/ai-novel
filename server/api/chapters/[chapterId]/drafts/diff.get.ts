import { createError, getQuery, getRouterParam } from 'h3'
import { getDb } from '~/server/utils/db'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler((event) => {
  const user = requireUser(event)
  const chapterId = getRouterParam(event, 'chapterId') || ''
  const query = getQuery(event)
  const fromId = String(query.from || '')
  const toId = String(query.to || '')

  if (!fromId || !toId) {
    throw createError({ statusCode: 400, statusMessage: '缺少 from/to 参数' })
  }

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

  const fromDraft = db
    .prepare('SELECT content FROM chapter_drafts WHERE id = ? AND chapter_id = ?')
    .get(fromId, chapterId) as { content: string } | undefined
  const toDraft = db.prepare('SELECT content FROM chapter_drafts WHERE id = ? AND chapter_id = ?').get(toId, chapterId) as
    | { content: string }
    | undefined

  if (!fromDraft || !toDraft) {
    throw createError({ statusCode: 404, statusMessage: '草稿不存在' })
  }

  const fromLines = fromDraft.content.split('\n')
  const toLines = toDraft.content.split('\n')
  const max = Math.max(fromLines.length, toLines.length)
  const diff: Array<{ index: number; type: 'same' | 'add' | 'remove' | 'change'; from?: string; to?: string }> = []

  for (let i = 0; i < max; i += 1) {
    const fromLine = fromLines[i]
    const toLine = toLines[i]
    if (fromLine === toLine) {
      diff.push({ index: i + 1, type: 'same', from: fromLine || '' })
      continue
    }

    if (fromLine === undefined) {
      diff.push({ index: i + 1, type: 'add', to: toLine || '' })
      continue
    }

    if (toLine === undefined) {
      diff.push({ index: i + 1, type: 'remove', from: fromLine })
      continue
    }

    diff.push({ index: i + 1, type: 'change', from: fromLine, to: toLine })
  }

  return { diff }
})
