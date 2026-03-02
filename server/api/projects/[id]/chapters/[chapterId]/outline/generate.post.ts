import { getRouterParam } from 'h3'
import { buildAgentSystemPrompt, buildAgentUserPrompt, failedMetadata, saveAgentRun } from '~/server/utils/agents'
import { getDb } from '~/server/utils/db'
import { runModelWithAgentBinding } from '~/server/utils/model-gateway'
import { requireChapterForProject, requireProjectForUser } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const projectId = getRouterParam(event, 'id') || ''
  const chapterId = getRouterParam(event, 'chapterId') || ''
  const project = requireProjectForUser(projectId, user.id)
  const chapter = requireChapterForProject(chapterId, projectId)

  const input = { type: 'chapter_outline' }

  try {
    const modelResult = await runModelWithAgentBinding(event, 'generate', {
      systemPrompt: buildAgentSystemPrompt('chapter_outline'),
      userPrompt: buildAgentUserPrompt('chapter_outline', {
        projectTitle: project.title,
        chapterTitle: chapter.title,
        outlineText: project.outline_text,
        charactersJson: project.characters_json
      })
    })

    const content = modelResult.content.trim()
    const now = new Date().toISOString()
    const db = getDb()
    db.prepare('UPDATE chapters SET outline_text = ?, status = ?, updated_at = ? WHERE id = ?').run(
      content,
      'drafting',
      now,
      chapterId
    )

    saveAgentRun({
      projectId,
      chapterId,
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
      chapterId,
      agentType: 'generate',
      input,
      output: { error: error instanceof Error ? error.message : '模型调用失败' },
      status: 'failed',
      metadata: failedMetadata()
    })
    throw error
  }
})
