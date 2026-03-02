import { getRouterParam } from 'h3'
import { buildAgentSystemPrompt, buildAgentUserPrompt, failedMetadata, saveAgentRun } from '~/server/utils/agents'
import { randomId } from '~/server/utils/crypto'
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
  const db = getDb()

  const row = db
    .prepare('SELECT COALESCE(MAX(version_no), 0) AS max_version FROM chapter_drafts WHERE chapter_id = ?')
    .get(chapterId) as { max_version: number }

  const input = { type: 'chapter_draft' }

  try {
    const modelResult = await runModelWithAgentBinding(event, 'generate', {
      systemPrompt: buildAgentSystemPrompt('chapter_draft'),
      userPrompt: buildAgentUserPrompt('chapter_draft', {
        projectTitle: project.title,
        chapterTitle: chapter.title,
        chapterOutline: chapter.outline_text,
        charactersJson: project.characters_json
      })
    })

    const content = modelResult.content.trim()
    const draftId = randomId('draft')
    const now = new Date().toISOString()

    db.prepare(
      'INSERT INTO chapter_drafts (id, chapter_id, version_no, content, source, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(draftId, chapterId, row.max_version + 1, content, 'ai', now)

    db.prepare('UPDATE chapters SET active_draft_id = ?, status = ?, updated_at = ? WHERE id = ?').run(
      draftId,
      'reviewing',
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
      metadata: modelResult.metadata,
      draft: {
        id: draftId,
        chapterId,
        versionNo: row.max_version + 1,
        content,
        source: 'ai',
        createdAt: now
      }
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
