import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { buildAgentSystemPrompt, buildAgentUserPrompt, failedMetadata, resolvePromptTemplate, saveAgentRun } from '~/server/utils/agents'
import { getDb } from '~/server/utils/db'
import { runModelWithAgentBinding } from '~/server/utils/model-gateway'
import { requireProjectForUser } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const projectId = getRouterParam(event, 'id') || ''
  const project = requireProjectForUser(projectId, user.id)

  const body = await readBody<{ userInput?: string; promptTemplateId?: string }>(event).catch(() => ({}))
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
    const modelResult = await runModelWithAgentBinding(event, 'generate', {
      systemPrompt,
      userPrompt
    })

    const content = modelResult.content.trim()
    const now = new Date().toISOString()
    const db = getDb()
    db.prepare('UPDATE projects SET world_text = ?, status = ?, updated_at = ? WHERE id = ?').run(
      content,
      'world_ready',
      now,
      projectId
    )

    saveAgentRun({
      projectId,
      agentType: 'generate',
      input,
      output: { content },
      status: 'success',
      metadata: modelResult.metadata
    })

    return {
      status: 'success',
      content,
      issues: [],
      metadata: modelResult.metadata
    }
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
