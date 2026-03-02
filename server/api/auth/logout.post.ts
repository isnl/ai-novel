import { revokeSession } from '~/server/utils/session'

export default defineEventHandler((event) => {
  revokeSession(event)
  return { ok: true }
})
