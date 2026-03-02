import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getDb } from '~/server/utils/db'
import { requireUser } from '~/server/utils/session'
import type { ChatMessage } from '~/types/domain'

function toMessageResponse(row: Record<string, unknown>): ChatMessage {
  let metadata: ChatMessage['metadata'] = null
  if (row.metadata_json) {
    try {
      metadata = JSON.parse(String(row.metadata_json)) as ChatMessage['metadata']
    } catch {
      metadata = null
    }
  }

  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    role: String(row.role) as 'user' | 'assistant',
    content: String(row.content),
    metadata,
    createdAt: String(row.created_at)
  }
}

export default defineEventHandler((event) => {
  const user = requireUser(event)
  const sessionId = getRouterParam(event, 'sessionId') || ''

  const db = getDb()

  // 验证 session 属于当前用户的项目
  const session = db
    .prepare(
      `SELECT cs.id FROM chat_sessions cs
       INNER JOIN projects p ON p.id = cs.project_id
       WHERE cs.id = ? AND p.user_id = ?`
    )
    .get(sessionId, user.id) as Record<string, unknown> | undefined

  if (!session) {
    throw createError({ statusCode: 404, statusMessage: '对话不存在' })
  }

  const rows = db
    .prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY datetime(created_at) ASC')
    .all(sessionId) as Record<string, unknown>[]

  return {
    messages: rows.map(toMessageResponse)
  }
})
