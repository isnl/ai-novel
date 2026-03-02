import { getDb } from '~/server/utils/db'

export default defineEventHandler(() => {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT p.id, p.title, p.genre, p.style, p.status, p.updated_at,
              COUNT(c.id) AS published_chapters
       FROM projects p
       LEFT JOIN chapters c ON c.project_id = p.id AND c.status = 'published'
       GROUP BY p.id
       ORDER BY datetime(p.updated_at) DESC`
    )
    .all() as Record<string, unknown>[]

  return {
    books: rows
      .filter((row) => Number(row.published_chapters) > 0)
      .map((row) => ({
        id: String(row.id),
        title: String(row.title),
        genre: String(row.genre),
        style: String(row.style),
        status: String(row.status),
        publishedChapters: Number(row.published_chapters),
        updatedAt: String(row.updated_at)
      }))
  }
})
