import { defineEventHandler } from 'h3'
import { getDb } from '~/server/utils/db'
import { toProjectResponse } from '~/server/utils/project'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler((event) => {
  const user = requireUser(event)
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY datetime(updated_at) DESC')
    .all(user.id) as Record<string, unknown>[]

  return {
    projects: rows.map(toProjectResponse)
  }
})
