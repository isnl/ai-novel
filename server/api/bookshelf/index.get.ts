import { getDb } from '~/server/utils/db'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler((event) => {
  const user = requireUser(event)
  const db = getDb()

  const rows = db
    .prepare(
      `SELECT b.id, b.project_id, b.last_chapter_id, b.progress, b.updated_at,
              p.title, p.genre,
              c.title as chapter_title
       FROM bookshelf_items b
       INNER JOIN projects p ON p.id = b.project_id
       LEFT JOIN chapters c ON c.id = b.last_chapter_id
       WHERE b.user_id = ?
       ORDER BY datetime(b.updated_at) DESC`
    )
    .all(user.id) as Record<string, unknown>[]

  return {
    items: rows.map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      title: String(row.title),
      genre: String(row.genre),
      lastChapterId: (row.last_chapter_id as string | null) ?? '',
      lastChapterTitle: (row.chapter_title as string | null) ?? '',
      progress: Number(row.progress),
      updatedAt: String(row.updated_at)
    }))
  }
})
