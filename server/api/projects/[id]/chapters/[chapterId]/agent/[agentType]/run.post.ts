import { createError, defineEventHandler, getRouterParam } from 'h3'
import {
  buildAgentSystemPrompt,
  buildAgentUserPrompt,
  failedMetadata,
  parseStructuredAgentResult,
  saveAgentRun
} from '~/server/utils/agents'
import { getDb } from '~/server/utils/db'
import { runModelWithAgentBinding } from '~/server/utils/model-gateway'
import { requireChapterForProject, requireProjectForUser } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

const ALLOWED_TYPES = ['audit', 'polish', 'consistency', 'publish'] as const

type AgentType = (typeof ALLOWED_TYPES)[number]

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const projectId = getRouterParam(event, 'id') || ''
  const chapterId = getRouterParam(event, 'chapterId') || ''
  const agentType = (getRouterParam(event, 'agentType') || '') as AgentType

  if (!ALLOWED_TYPES.includes(agentType)) {
    throw createError({ statusCode: 400, statusMessage: '不支持的 Agent 类型' })
  }

  const project = requireProjectForUser(projectId, user.id)
  requireChapterForProject(chapterId, projectId)

  const db = getDb()
  const chapter = db.prepare('SELECT title, active_draft_id FROM chapters WHERE id = ?').get(chapterId) as {
    title: string
    active_draft_id: string | null
  }

  const draft = chapter.active_draft_id
    ? (db.prepare('SELECT content FROM chapter_drafts WHERE id = ?').get(chapter.active_draft_id) as { content: string } | undefined)
    : undefined

  const input = { chapterId, agentType }

  try {
    const modelResult = await runModelWithAgentBinding(event, agentType, {
      systemPrompt: buildAgentSystemPrompt(agentType),
      userPrompt: buildAgentUserPrompt(agentType, {
        projectTitle: project.title,
        chapterTitle: chapter.title,
        chapterDraft: draft?.content || '',
        worldText: project.world_text,
        charactersJson: project.characters_json
      }),
      responseFormat: 'json'
    })

    const structured = parseStructuredAgentResult(modelResult.content)
    const output = {
      status: structured.status,
      content: structured.content,
      issues: structured.issues,
      metadata: modelResult.metadata
    }

    saveAgentRun({
      projectId,
      chapterId,
      agentType,
      input,
      output,
      status: structured.status === 'needs_review' ? 'needs_review' : 'success',
      metadata: modelResult.metadata
    })

    return output
  } catch (error) {
    saveAgentRun({
      projectId,
      chapterId,
      agentType,
      input,
      output: { error: error instanceof Error ? error.message : '模型调用失败' },
      status: 'failed',
      metadata: failedMetadata()
    })
    throw error
  }
})
