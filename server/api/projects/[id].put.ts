import { getRouterParam, readBody } from 'h3'
import { getDb } from '~/server/utils/db'
import { requireProjectForUser, toProjectResponse } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const id = getRouterParam(event, 'id') || ''
  requireProjectForUser(id, user.id)

  const body = await readBody<{
    title?: string
    genre?: string
    style?: string
    targetWords?: number
    worldText?: string
    outlineText?: string
    charactersJson?: string
    status?: string
  }>(event)

  const db = getDb()
  const now = new Date().toISOString()

  db.prepare(
    `UPDATE projects
     SET title = COALESCE(?, title),
         genre = COALESCE(?, genre),
         style = COALESCE(?, style),
         target_words = COALESCE(?, target_words),
         world_text = COALESCE(?, world_text),
         outline_text = COALESCE(?, outline_text),
         characters_json = COALESCE(?, characters_json),
         status = COALESCE(?, status),
         updated_at = ?
     WHERE id = ?`
  ).run(
    body.title || null,
    body.genre || null,
    body.style || null,
    body.targetWords === undefined ? null : body.targetWords,
    body.worldText || null,
    body.outlineText || null,
    body.charactersJson || null,
    body.status || null,
    now,
    id
  )

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown>
  return { project: toProjectResponse(project) }
})
