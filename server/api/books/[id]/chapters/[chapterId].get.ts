import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getDb } from '~/server/utils/db'

export default defineEventHandler((event) => {
  const projectId = getRouterParam(event, 'id') || ''
  const chapterId = getRouterParam(event, 'chapterId') || ''
  const db = getDb()

  const chapter = db
    .prepare('SELECT * FROM chapters WHERE id = ? AND project_id = ? AND status = ?')
    .get(chapterId, projectId, 'published') as Record<string, unknown> | undefined

  if (!chapter) {
    throw createError({ statusCode: 404, statusMessage: '章节不存在或未发布' })
  }

  const draft = chapter.active_draft_id
    ? (db
        .prepare('SELECT content FROM chapter_drafts WHERE id = ?')
        .get(String(chapter.active_draft_id)) as { content: string } | undefined)
    : undefined

  return {
    chapter: {
      id: String(chapter.id),
      projectId: String(chapter.project_id),
      indexNo: Number(chapter.index_no),
      title: String(chapter.title),
      content: draft?.content || '',
      publishedAt: (chapter.published_at as string | null) ?? ''
    }
  }
})
