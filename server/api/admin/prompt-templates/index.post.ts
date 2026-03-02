import { createError, defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '~/server/utils/admin'
import { randomId } from '~/server/utils/crypto'
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<{
    categoryId?: string
    name?: string
    description?: string
    systemPrompt?: string
    userPromptTemplate?: string
    variablesJson?: string
    isActive?: number
    sortOrder?: number
  }>(event)

  const categoryId = (body.categoryId || '').trim()
  const name = (body.name || '').trim()
  const systemPrompt = (body.systemPrompt || '').trim()
  const userPromptTemplate = (body.userPromptTemplate || '').trim()

  if (!categoryId || !name || !systemPrompt || !userPromptTemplate) {
    throw createError({ statusCode: 400, statusMessage: 'categoryId/name/systemPrompt/userPromptTemplate 不能为空' })
  }

  const db = getDb()
  const cat = db.prepare('SELECT id FROM prompt_categories WHERE id = ?').get(categoryId) as { id: string } | undefined
  if (!cat) {
    throw createError({ statusCode: 400, statusMessage: '分类不存在' })
  }

  const now = new Date().toISOString()
  const id = randomId('tpl')

  db.prepare(
    `INSERT INTO prompt_templates (id, category_id, name, description, system_prompt, user_prompt_template, variables_json, is_active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    categoryId,
    name,
    body.description || '',
    systemPrompt,
    userPromptTemplate,
    body.variablesJson || '[]',
    body.isActive ?? 1,
    body.sortOrder ?? 0,
    now,
    now
  )

  return { templateId: id }
})
