import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { getDb } from '~/server/utils/db'
import { randomId } from '~/server/utils/crypto'
import { requireUser } from '~/server/utils/session'
import { runModelWithAgentBinding } from '~/server/utils/model-gateway'
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

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const sessionId = getRouterParam(event, 'sessionId') || ''

  const db = getDb()

  // 验证 session 属于当前用户的项目
  const session = db
    .prepare(
      `SELECT cs.id, cs.system_context, cs.context_type FROM chat_sessions cs
       INNER JOIN projects p ON p.id = cs.project_id
       WHERE cs.id = ? AND p.user_id = ?`
    )
    .get(sessionId, user.id) as { id: string; system_context: string | null; context_type: string } | undefined

  if (!session) {
    throw createError({ statusCode: 404, statusMessage: '对话不存在' })
  }

  const body = await readBody<{ content?: string }>(event)
  const content = body.content?.trim()

  if (!content) {
    throw createError({ statusCode: 400, statusMessage: '消息内容不能为空' })
  }

  const now = new Date().toISOString()

  // 保存用户消息
  const userMsgId = randomId('msg')
  db.prepare(
    'INSERT INTO chat_messages (id, session_id, role, content, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userMsgId, sessionId, 'user', content, null, now)

  // 获取历史消息用于组装 prompt
  const historyRows = db
    .prepare('SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY datetime(created_at) ASC')
    .all(sessionId) as Array<{ role: string; content: string }>

  // 组装系统提示词
  const systemPromptParts: string[] = [
    '你是一位专业的小说创作助手。请根据上下文与用户进行多轮对话，帮助用户优化和迭代创作内容。',
    '回复时使用中文，保持专业且有创意。如果用户要求修改内容，请给出完整的修改后文本。'
  ]

  if (session.system_context) {
    systemPromptParts.push(`\n以下是当前项目的创作上下文：\n${session.system_context}`)
  }

  const systemPrompt = systemPromptParts.join('\n')

  // 将历史消息组装为 user prompt（交替拼接）
  const conversationParts: string[] = []
  for (const msg of historyRows) {
    const prefix = msg.role === 'user' ? '用户' : '助手'
    conversationParts.push(`[${prefix}]: ${msg.content}`)
  }
  const userPrompt = conversationParts.join('\n\n')

  // 调用模型
  const result = await runModelWithAgentBinding(event, 'chat', {
    systemPrompt,
    userPrompt,
    maxTokens: 4096,
    temperature: 0.7
  })

  // 保存 AI 回复
  const assistantMsgId = randomId('msg')
  const assistantNow = new Date().toISOString()
  const metadata = {
    tokensIn: result.metadata.tokensIn,
    tokensOut: result.metadata.tokensOut,
    model: result.metadata.model,
    latencyMs: result.metadata.latencyMs
  }

  db.prepare(
    'INSERT INTO chat_messages (id, session_id, role, content, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(assistantMsgId, sessionId, 'assistant', result.content, JSON.stringify(metadata), assistantNow)

  // 更新 session 的 updated_at
  db.prepare('UPDATE chat_sessions SET updated_at = ? WHERE id = ?').run(assistantNow, sessionId)

  // 返回用户消息和 AI 回复
  const userMessage: ChatMessage = {
    id: userMsgId,
    sessionId,
    role: 'user',
    content,
    metadata: null,
    createdAt: now
  }

  const assistantMessage: ChatMessage = {
    id: assistantMsgId,
    sessionId,
    role: 'assistant',
    content: result.content,
    metadata,
    createdAt: assistantNow
  }

  return {
    userMessage,
    assistantMessage
  }
})
