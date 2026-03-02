import { getRouterParam } from 'h3'
import { buildAgentSystemPrompt, buildAgentUserPrompt, failedMetadata, saveAgentRun } from '~/server/utils/agents'
import { getDb } from '~/server/utils/db'
import { runModelWithAgentBinding } from '~/server/utils/model-gateway'
import { requireProjectForUser } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const projectId = getRouterParam(event, 'id') || ''
  const project = requireProjectForUser(projectId, user.id)

  const input = { type: 'characters' }

  try {
    const modelResult = await runModelWithAgentBinding(event, 'generate', {
      systemPrompt: buildAgentSystemPrompt('characters'),
      userPrompt: buildAgentUserPrompt('characters', {
        projectTitle: project.title,
        worldText: project.world_text,
        outlineText: project.outline_text
      }),
      responseFormat: 'json'
    })

    const content = modelResult.content.trim()
    const now = new Date().toISOString()
    const db = getDb()
    db.prepare('UPDATE projects SET characters_json = ?, status = ?, updated_at = ? WHERE id = ?').run(
      content,
      'writing',
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
