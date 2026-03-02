import { defineEventHandler, getRouterParam } from 'h3'
import { getDb } from '~/server/utils/db'
import { requireProjectForUser } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'
import type { ChatSession } from '~/types/domain'

function toSessionResponse(row: Record<string, unknown>): ChatSession {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title),
    contextType: String(row.context_type) as ChatSession['contextType'],
    systemContext: (row.system_context as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}

export default defineEventHandler((event) => {
  const user = requireUser(event)
  const projectId = getRouterParam(event, 'id') || ''

  requireProjectForUser(projectId, user.id)

  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM chat_sessions WHERE project_id = ? ORDER BY datetime(updated_at) DESC')
    .all(projectId) as Record<string, unknown>[]

  return {
    sessions: rows.map(toSessionResponse)
  }
})
