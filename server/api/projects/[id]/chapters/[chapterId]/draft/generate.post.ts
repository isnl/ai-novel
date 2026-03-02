import { defineEventHandler, getRouterParam } from 'h3'
import { buildAgentSystemPrompt, buildAgentUserPrompt, failedMetadata, saveAgentRun } from '~/server/utils/agents'
import { randomId } from '~/server/utils/crypto'
import { getDb } from '~/server/utils/db'
import { streamModelWithAgentBinding } from '~/server/utils/model-gateway'
import { requireChapterForProject, requireProjectForUser } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const projectId = getRouterParam(event, 'id') || ''
  const chapterId = getRouterParam(event, 'chapterId') || ''

  const project = requireProjectForUser(projectId, user.id)
  const chapter = requireChapterForProject(chapterId, projectId)
  const db = getDb()

  const row = db
    .prepare('SELECT COALESCE(MAX(version_no), 0) AS max_version FROM chapter_drafts WHERE chapter_id = ?')
    .get(chapterId) as { max_version: number }

  const input = { type: 'chapter_draft' }

  try {
    const { streamResult, profileId, providerName, modelName } = streamModelWithAgentBinding(event, 'generate', {
      systemPrompt: buildAgentSystemPrompt('chapter_draft'),
      userPrompt: buildAgentUserPrompt('chapter_draft', {
        projectTitle: project.title,
        chapterTitle: chapter.title,
        chapterOutline: chapter.outline_text,
        charactersJson: project.characters_json
      })
    })

    const startedAt = Date.now()
    const draftId = randomId('draft')
    const versionNo = row.max_version + 1

    // 在流结束后保存到数据库
    Promise.resolve(streamResult.text).then((content) => {
      const trimmed = content.trim()
      const now = new Date().toISOString()

      db.prepare(
        'INSERT INTO chapter_drafts (id, chapter_id, version_no, content, source, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(draftId, chapterId, versionNo, trimmed, 'ai', now)

      db.prepare('UPDATE chapters SET active_draft_id = ?, status = ?, updated_at = ? WHERE id = ?').run(
        draftId,
        'reviewing',
        now,
        chapterId
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
          chapterId,
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
        chapterId,
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
