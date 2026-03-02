import { defineEventHandler, getRouterParam } from 'h3'
import { getDb } from '~/server/utils/db'
import { requireProjectForUser, toChapterResponse, toProjectResponse } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler((event) => {
  const user = requireUser(event)
  const projectId = getRouterParam(event, 'id') || ''

  const project = requireProjectForUser(projectId, user.id)
  const db = getDb()
  const chapters = db
    .prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY index_no ASC')
    .all(projectId) as Record<string, unknown>[]

  return {
    project: toProjectResponse(project),
    chapters: chapters.map(toChapterResponse)
  }
})
