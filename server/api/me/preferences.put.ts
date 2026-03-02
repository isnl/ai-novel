import { defineEventHandler, readBody } from 'h3'
import { getDb } from '~/server/utils/db'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const body = await readBody<{ genres?: string[]; style?: string; targetWords?: number }>(event)

  const genres = Array.isArray(body.genres) ? body.genres : []
  const style = (body.style || '').trim()
  const targetWords = Math.max(500, Math.min(10000, Number(body.targetWords || 3000)))

  const db = getDb()
  db.prepare(
    `INSERT INTO user_preferences (user_id, genres_json, style, target_words)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET genres_json = excluded.genres_json, style = excluded.style, target_words = excluded.target_words`
  ).run(user.id, JSON.stringify(genres), style, targetWords)

  return {
    preferences: {
      genres,
      style,
      targetWords
    }
  }
})
