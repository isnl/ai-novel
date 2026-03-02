import { createError, defineEventHandler, readBody } from 'h3'
import { hashPassword, randomId } from '~/server/utils/crypto'
import { getDb } from '~/server/utils/db'
import { createSession, getUserById } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string; nickname?: string }>(event)
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  const nickname = (body.nickname || '').trim()

  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, statusMessage: '邮箱格式不正确' })
  }
  if (password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: '密码至少 6 位' })
  }
  if (!nickname) {
    throw createError({ statusCode: 400, statusMessage: '昵称不能为空' })
  }

  const db = getDb()
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined
  if (exists) {
    throw createError({ statusCode: 409, statusMessage: '邮箱已注册' })
  }

  const userId = randomId('user')
  const now = new Date().toISOString()

  db.prepare(
    'INSERT INTO users (id, email, password_hash, nickname, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, email, hashPassword(password), nickname, null, now)

  db.prepare('INSERT INTO user_preferences (user_id, genres_json, style, target_words) VALUES (?, ?, ?, ?)').run(
    userId,
    JSON.stringify([]),
    '克制叙事',
    3000
  )

  createSession(event, userId)
  const user = getUserById(userId)

  return { user }
})
