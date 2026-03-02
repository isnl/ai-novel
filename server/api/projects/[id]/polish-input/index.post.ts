import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { buildPolishInputPrompt, failedMetadata, saveAgentRun } from '~/server/utils/agents'
import { runModelWithAgentBinding } from '~/server/utils/model-gateway'
import { requireProjectForUser } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const projectId = getRouterParam(event, 'id') || ''
  requireProjectForUser(projectId, user.id)

  const body = await readBody<{ rawInput?: string }>(event).catch((): { rawInput?: string } => ({}))
  const rawInput = (body.rawInput || '').trim()

  if (!rawInput) {
    throw createError({ statusCode: 400, statusMessage: '请输入需要润色的内容' })
  }

  const { systemPrompt, userPrompt } = buildPolishInputPrompt(rawInput)

  try {
    const modelResult = await runModelWithAgentBinding(event, 'polish', {
      systemPrompt,
      userPrompt
    })

    saveAgentRun({
      projectId,
      agentType: 'polish',
      input: { type: 'polish_input', rawInput },
      output: { content: modelResult.content },
      status: 'success',
      metadata: modelResult.metadata
    })

    return {
      status: 'success',
      content: modelResult.content.trim()
    }
  } catch (error) {
    saveAgentRun({
      projectId,
      agentType: 'polish',
      input: { type: 'polish_input', rawInput },
      output: { error: error instanceof Error ? error.message : '润色失败' },
      status: 'failed',
      metadata: failedMetadata()
    })
    throw error
  }
})
