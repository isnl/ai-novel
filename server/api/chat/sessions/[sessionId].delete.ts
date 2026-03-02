import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getDb } from '~/server/utils/db'
import { requireUser } from '~/server/utils/session'

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

  // 先删除消息，再删除 session（外键级联也会处理，但显式删更稳妥）
  db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(sessionId)
  db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(sessionId)

  return { ok: true }
})
