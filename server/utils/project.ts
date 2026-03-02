import { createError } from 'h3'
import { getDb } from './db'

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function requireProjectForUser(projectId: string, userId: string) {
  const db = getDb()
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as
    | Record<string, unknown>
    | undefined

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: '项目不存在' })
  }

  return project
}

export function requireChapterForProject(chapterId: string, projectId: string) {
  const db = getDb()
  const chapter = db.prepare('SELECT * FROM chapters WHERE id = ? AND project_id = ?').get(chapterId, projectId) as
    | Record<string, unknown>
    | undefined

  if (!chapter) {
    throw createError({ statusCode: 404, statusMessage: '章节不存在' })
  }

  return chapter
}

export function toProjectResponse(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title),
    genre: String(row.genre),
    style: String(row.style),
    targetWords: Number(row.target_words),
    status: String(row.status),
    worldText: (row.world_text as string | null) ?? null,
    outlineText: (row.outline_text as string | null) ?? null,
    charactersJson: (row.characters_json as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}

export function toChapterResponse(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    indexNo: Number(row.index_no),
    title: String(row.title),
    status: String(row.status),
    activeDraftId: (row.active_draft_id as string | null) ?? null,
    outlineText: (row.outline_text as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}
