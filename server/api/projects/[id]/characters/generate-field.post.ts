import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { runModelWithAgentBinding } from '~/server/utils/model-gateway'
import { requireProjectForUser } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

const VALID_FIELDS = ['name', 'role', 'motivation', 'arc', 'traits', 'notes'] as const
type CharacterField = typeof VALID_FIELDS[number]

const FIELD_LABELS: Record<CharacterField, string> = {
  name: '角色姓名',
  role: '角色定位',
  motivation: '核心动机',
  arc: '成长弧线',
  traits: '性格特质',
  notes: '补充备注'
}

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const projectId = getRouterParam(event, 'id') || ''
  const project = requireProjectForUser(projectId, user.id)

  const body = await readBody<{
    field?: string
    existingCharacter?: Record<string, string>
    userHint?: string
  }>(event)

  const field = (body.field || '') as CharacterField
  if (!VALID_FIELDS.includes(field)) {
    throw createError({ statusCode: 400, statusMessage: `无效字段: ${field}` })
  }

  const existing = body.existingCharacter || {}
  const userHint = (body.userHint || '').trim()

  const contextParts: string[] = [
    `项目：${String(project.title)}`,
    `世界观：${String(project.world_text || '暂无')}`,
    `大纲：${String(project.outline_text || '暂无')}`
  ]

  const charParts: string[] = []
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    if (key !== field && existing[key]) {
      charParts.push(`${label}：${existing[key]}`)
    }
  }
  if (charParts.length > 0) {
    contextParts.push(`已有角色信息：\n${charParts.join('\n')}`)
  }

  if (userHint) {
    contextParts.push(`用户补充说明：${userHint}`)
  }

  contextParts.push(`任务：为这个角色生成「${FIELD_LABELS[field]}」。只输出该字段的内容，不要附加解释、不要加引号、不要加字段名前缀。`)

  const systemPrompt = '你是小说创作助手。根据项目背景和已有角色信息，生成角色的某个属性。输出简洁、具体、有创意的中文内容。不要输出任何多余说明。'
  const userPrompt = contextParts.join('\n\n')

  const result = await runModelWithAgentBinding(event, 'generate', {
    systemPrompt,
    userPrompt,
    maxTokens: 512
  })

  return { content: result.content.trim() }
})
