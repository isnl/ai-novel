import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getDb } from '~/server/utils/db'
import { requireUser } from '~/server/utils/session'
import type { ChatContextType } from '~/types/domain'

function buildSystemContext(project: Record<string, unknown>, contextType: ChatContextType): string {
  const parts: string[] = [`项目：${String(project.title)}`]

  if (contextType === 'world' || contextType === 'general') {
    const worldText = project.world_text as string | null
    if (worldText) {
      parts.push(`\n## 世界观设定\n${worldText}`)
    }
  }

  if (contextType === 'outline' || contextType === 'general') {
    const outlineText = project.outline_text as string | null
    if (outlineText) {
      parts.push(`\n## 主线大纲\n${outlineText}`)
    }
  }

  if (contextType === 'characters' || contextType === 'general') {
    const charactersJson = project.characters_json as string | null
    if (charactersJson) {
      parts.push(`\n## 角色设定\n${charactersJson}`)
    }
  }

  return parts.join('\n')
}

export default defineEventHandler((event) => {
  const user = requireUser(event)
  const sessionId = getRouterParam(event, 'sessionId') || ''

  const db = getDb()

  // 验证 session 属于当前用户的项目，并获取项目信息
  const row = db
    .prepare(
      `SELECT cs.id, cs.project_id, cs.context_type, p.title, p.world_text, p.outline_text, p.characters_json
       FROM chat_sessions cs
       INNER JOIN projects p ON p.id = cs.project_id
       WHERE cs.id = ? AND p.user_id = ?`
    )
    .get(sessionId, user.id) as Record<string, unknown> | undefined

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '对话不存在' })
  }

  const contextType = String(row.context_type) as ChatContextType
  const systemContext = buildSystemContext(row, contextType)
  const now = new Date().toISOString()

  db.prepare('UPDATE chat_sessions SET system_context = ?, updated_at = ? WHERE id = ?').run(
    systemContext,
    now,
    sessionId
  )

  return {
    systemContext,
    updatedAt: now
  }
})
