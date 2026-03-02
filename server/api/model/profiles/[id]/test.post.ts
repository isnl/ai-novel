import { getRouterParam } from 'h3'
import { runModelWithProfileId } from '~/server/utils/model-gateway'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = getRouterParam(event, 'id') || ''

  const result = await runModelWithProfileId(event, id, {
    systemPrompt: '你是连接测试助手。',
    userPrompt: '请仅输出 OK。',
    maxTokens: 16,
    temperature: 0
  })

  return {
    status: 'success',
    provider: result.metadata.provider,
    model: result.metadata.model,
    latencyMs: result.metadata.latencyMs,
    output: result.content.trim().slice(0, 64)
  }
})
