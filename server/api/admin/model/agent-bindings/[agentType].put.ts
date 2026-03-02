import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAdmin } from '~/server/utils/admin'
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const agentType = getRouterParam(event, 'agentType') || ''
  const body = await readBody<{ primaryProfileId?: string; fallbackProfileId?: string; strategyJson?: string }>(event)

  const db = getDb()
  const now = new Date().toISOString()

  db.prepare(
    `INSERT INTO agent_model_bindings (agent_type, primary_profile_id, fallback_profile_id, strategy_json, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(agent_type)
     DO UPDATE SET
       primary_profile_id = excluded.primary_profile_id,
       fallback_profile_id = excluded.fallback_profile_id,
       strategy_json = excluded.strategy_json,
       updated_at = excluded.updated_at`
  ).run(
    agentType,
    body.primaryProfileId || null,
    body.fallbackProfileId || null,
    body.strategyJson || JSON.stringify({ priority: ['availability', 'stability', 'cost', 'quality'] }),
    now
  )

  return { ok: true }
})
