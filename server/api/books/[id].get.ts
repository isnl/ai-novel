import { createError, getRouterParam } from 'h3'
import { getDb } from '~/server/utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id') || ''
  const db = getDb()

  const project = db.prepare('SELECT id, title, genre, style, status, world_text, outline_text FROM projects WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: '作品不存在' })
  }

  const chapters = db
    .prepare('SELECT id, index_no, title, status, published_at FROM chapters WHERE project_id = ? AND status = ? ORDER BY index_no ASC')
    .all(id, 'published') as Record<string, unknown>[]

  return {
    book: {
      id: String(project.id),
      title: String(project.title),
      genre: String(project.genre),
      style: String(project.style),
      status: String(project.status),
      worldText: (project.world_text as string | null) ?? '',
      outlineText: (project.outline_text as string | null) ?? ''
    },
    chapters: chapters.map((row) => ({
      id: String(row.id),
      indexNo: Number(row.index_no),
      title: String(row.title),
      status: String(row.status),
      publishedAt: (row.published_at as string | null) ?? ''
    }))
  }
})
