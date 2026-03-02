import type { H3Event } from 'h3'
import { createError } from 'h3'
import { requireUser } from './session'

export function requireAdmin(event: H3Event) {
  const user = requireUser(event)
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '需要管理员权限' })
  }
  return user
}
