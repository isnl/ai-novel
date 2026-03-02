import { defineEventHandler } from 'h3'
import { revokeSession } from '~/server/utils/session'

export default defineEventHandler((event) => {
  revokeSession(event)
  return { ok: true }
})
