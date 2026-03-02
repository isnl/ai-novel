import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { getDb } from '~/server/utils/db'
import { randomId } from '~/server/utils/crypto'
import { requireProjectForUser } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'
import type { ChatContextType, ChatSession } from '~/types/domain'

const VALID_CONTEXT_TYPES: ChatContextType[] = ['world', 'outline', 'characters', 'general']

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

function defaultTitle(contextType: ChatContextType): string {
  const map: Record<ChatContextType, string> = {
    world: '世界观对话',
    outline: '大纲对话',
    characters: '角色对话',
    general: '通用对话'
  }
  return map[contextType]
}

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const projectId = getRouterParam(event, 'id') || ''

  const project = requireProjectForUser(projectId, user.id)

  const body = await readBody<{ contextType?: string; title?: string }>(event)
  const contextType = (body.contextType || 'general') as ChatContextType

  if (!VALID_CONTEXT_TYPES.includes(contextType)) {
    throw createError({ statusCode: 400, statusMessage: `无效的上下文类型: ${contextType}` })
  }

  const title = body.title?.trim() || defaultTitle(contextType)
  const systemContext = buildSystemContext(project, contextType)
  const now = new Date().toISOString()
  const id = randomId('chat')

  const db = getDb()
  db.prepare(
    `INSERT INTO chat_sessions (id, project_id, title, context_type, system_context, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, projectId, title, contextType, systemContext, now, now)

  const session: ChatSession = {
    id,
    projectId,
    title,
    contextType,
    systemContext,
    createdAt: now,
    updatedAt: now
  }

  return { session }
})
