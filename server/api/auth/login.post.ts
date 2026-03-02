import { createError, readBody } from 'h3'
import { getDb } from '~/server/utils/db'
import { createSession, getUserById } from '~/server/utils/session'
import { verifyPassword } from '~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event)
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: '邮箱和密码不能为空' })
  }

  const db = getDb()
  const user = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email) as
    | { id: string; password_hash: string }
    | undefined

  if (!user || !verifyPassword(password, user.password_hash)) {
    throw createError({ statusCode: 401, statusMessage: '邮箱或密码错误' })
  }

  createSession(event, user.id)
  return { user: getUserById(user.id) }
})
