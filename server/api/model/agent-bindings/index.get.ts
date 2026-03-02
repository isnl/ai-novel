import { defineEventHandler } from 'h3'
import { getDb } from '~/server/utils/db'
import { requireUser } from '~/server/utils/session'

export default defineEventHandler((event) => {
  requireUser(event)
  const db = getDb()
  const rows = db.prepare('SELECT * FROM agent_model_bindings ORDER BY agent_type ASC').all() as Record<string, unknown>[]

  return {
    bindings: rows.map((row) => ({
      agentType: String(row.agent_type),
      primaryProfileId: (row.primary_profile_id as string | null) ?? '',
      fallbackProfileId: (row.fallback_profile_id as string | null) ?? '',
      strategyJson: String(row.strategy_json || '{}'),
      updatedAt: String(row.updated_at)
    }))
  }
})
