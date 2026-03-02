import type { H3Event } from 'h3'
import { createError, deleteCookie, getCookie, setCookie } from 'h3'
import { getDb } from './db'
import { randomId } from './crypto'

const SESSION_COOKIE = 'ai_novel_session'
const SESSION_DAYS = 30

function queryUserById(userId: string) {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.nickname, u.avatar_url, p.genres_json, p.style, p.target_words, u.role
       FROM users u
       LEFT JOIN user_preferences p ON p.user_id = u.id
       WHERE u.id = ?`
    )
    .get(userId) as Record<string, unknown> | undefined

  return serializeUser(row)
}

function getExpiryISO() {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS)
  return expiresAt.toISOString()
}

function serializeUser(row: Record<string, unknown> | undefined) {
  if (!row) return null

  const genresJson = String(row.genres_json ?? '[]')
  const genres = JSON.parse(genresJson) as string[]
  return {
    id: String(row.id),
    email: String(row.email),
    nickname: String(row.nickname),
    role: String(row.role ?? 'author'),
    avatarUrl: (row.avatar_url as string | null) ?? null,
    preferences: {
      genres,
      style: String(row.style ?? ''),
      targetWords: Number(row.target_words ?? 3000)
    }
  }
}

export function createSession(event: H3Event, userId: string) {
  const db = getDb()
  const token = randomId('sess')
  const now = new Date().toISOString()
  const expiresAt = getExpiryISO()

  db.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    expiresAt,
    now
  )

  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt)
  })
}

export function revokeSession(event: H3Event) {
  const db = getDb()
  const token = getCookie(event, SESSION_COOKIE)
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  }
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export function getCurrentUser(event: H3Event) {
  const db = getDb()
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) {
    return null
  }

  const session = db.prepare('SELECT token, user_id, expires_at FROM sessions WHERE token = ?').get(token) as
    | { token: string; user_id: string; expires_at: string }
    | undefined

  if (!session) {
    return null
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return null
  }

  return queryUserById(session.user_id)
}

export function requireUser(event: H3Event) {
  const user = getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '未登录或登录已过期' })
  }
  return user
}

export function getUserById(userId: string) {
  return queryUserById(userId)
}
