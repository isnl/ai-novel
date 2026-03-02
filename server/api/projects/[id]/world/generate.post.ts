import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { buildAgentSystemPrompt, buildAgentUserPrompt, failedMetadata, resolvePromptTemplate, saveAgentRun } from '~/server/utils/agents'
import { getDb } from '~/server/utils/db'
import { streamModelWithAgentBinding } from '~/server/utils/model-gateway'
import { requireProjectForUser } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const projectId = getRouterParam(event, 'id') || ''
  const project = requireProjectForUser(projectId, user.id)

  const body = await readBody<{ userInput?: string; promptTemplateId?: string }>(event).catch((): { userInput?: string; promptTemplateId?: string } => ({}))
  const userInput = (body.userInput || '').trim()
  const promptTemplateId = (body.promptTemplateId || '').trim()

  const input = { type: 'world', userInput, promptTemplateId }

  let systemPrompt: string
  let userPrompt: string

  if (promptTemplateId) {
    const resolved = resolvePromptTemplate(promptTemplateId, {
      projectTitle: String(project.title),
      userInput,
      worldText: String(project.world_text || '')
    })
    systemPrompt = resolved.systemPrompt
    userPrompt = resolved.userPrompt
  } else {
    systemPrompt = buildAgentSystemPrompt('world')
    userPrompt = buildAgentUserPrompt('world', {
      projectTitle: project.title,
      userInput
    })
  }

  try {
    const { streamResult, profileId, providerName, modelName } = streamModelWithAgentBinding(event, 'generate', {
      systemPrompt,
      userPrompt
    })

    const startedAt = Date.now()

    // 在流结束后保存到数据库
    Promise.resolve(streamResult.text).then((content) => {
      const trimmed = content.trim()
      const now = new Date().toISOString()
      const db = getDb()
      db.prepare('UPDATE projects SET world_text = ?, status = ?, updated_at = ? WHERE id = ?').run(
        trimmed,
        'world_ready',
        now,
        projectId
      )

      Promise.resolve(streamResult.usage).then((usage) => {
        const latencyMs = Date.now() - startedAt
        const metadata = {
          provider: providerName,
          model: modelName,
          latencyMs,
          tokensIn: usage.inputTokens ?? 0,
          tokensOut: usage.outputTokens ?? 0,
          costEstimate: 0
        }
        saveAgentRun({
          projectId,
          agentType: 'generate',
          input,
          output: { content: trimmed },
          status: 'success',
          metadata
        })
      }).catch(() => {
        // usage 获取失败不影响主流程
      })
    }).catch((error: unknown) => {
      saveAgentRun({
        projectId,
        agentType: 'generate',
        input,
        output: { error: error instanceof Error ? error.message : '模型调用失败' },
        status: 'failed',
        metadata: failedMetadata()
      })
    })

    return streamResult.toTextStreamResponse()
  } catch (error) {
    saveAgentRun({
      projectId,
      agentType: 'generate',
      input,
      output: { error: error instanceof Error ? error.message : '模型调用失败' },
      status: 'failed',
      metadata: failedMetadata()
    })
    throw error
  }
})
