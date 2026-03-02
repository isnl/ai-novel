import { getDb } from './db'
import { randomId } from './crypto'

interface AgentRunInput {
  projectId: string
  chapterId?: string
  agentType: string
  input: unknown
  output: unknown
  status: 'success' | 'failed' | 'needs_review'
  metadata: {
    provider: string
    model: string
    latencyMs: number
    tokensIn: number
    tokensOut: number
    costEstimate: number
  }
}

interface AgentIssue {
  type: 'consistency' | 'safety' | 'style'
  severity: 'low' | 'medium' | 'high'
  message: string
  suggestion: string
}

export function saveAgentRun(run: AgentRunInput) {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO agent_runs (
      id, project_id, chapter_id, agent_type, input_json, output_json, status,
      latency_ms, tokens_in, tokens_out, cost_estimate, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomId('run'),
    run.projectId,
    run.chapterId ?? null,
    run.agentType,
    JSON.stringify(run.input ?? {}),
    JSON.stringify(run.output ?? {}),
    run.status,
    run.metadata.latencyMs,
    run.metadata.tokensIn,
    run.metadata.tokensOut,
    run.metadata.costEstimate,
    now
  )
}

export function buildAgentSystemPrompt(agentType: string) {
  if (agentType === 'audit') {
    return '你是网文审核 Agent。输出必须是 JSON，不要输出额外说明。'
  }

  if (agentType === 'polish') {
    return '你是网文润色 Agent。必须保留事实与剧情，不改设定。输出 JSON。'
  }

  if (agentType === 'consistency') {
    return '你是一致性检查 Agent。关注设定、人设、时间线冲突。输出 JSON。'
  }

  if (agentType === 'publish') {
    return '你是发布 Agent。给出章节标题建议、摘要、标签。输出 JSON。'
  }

  return '你是小说创作助手，输出简洁、可执行、中文内容。'
}

export function buildAgentUserPrompt(agentType: string, payload: Record<string, unknown>) {
  const projectTitle = String(payload.projectTitle ?? '未命名项目')
  const chapterTitle = String(payload.chapterTitle ?? '当前章节')
  const chapterOutline = String(payload.chapterOutline ?? '')
  const chapterDraft = String(payload.chapterDraft ?? '')
  const worldText = String(payload.worldText ?? '')
  const outlineText = String(payload.outlineText ?? '')
  const charactersJson = String(payload.charactersJson ?? '')

  if (agentType === 'world') {
    return [
      `项目：${projectTitle}`,
      '任务：生成世界观草案。',
      '输出要求：包含时代背景、核心矛盾、硬规则、软规则、主要势力，不要使用 Markdown 标题。'
    ].join('\n')
  }

  if (agentType === 'outline') {
    return [
      `项目：${projectTitle}`,
      `世界观：${worldText || '暂无'}`,
      '任务：生成主线大纲，至少 3 卷，每卷包含目标、冲突、回收点。'
    ].join('\n')
  }

  if (agentType === 'characters') {
    return [
      `项目：${projectTitle}`,
      `世界观：${worldText || '暂无'}`,
      `主线：${outlineText || '暂无'}`,
      '任务：输出角色设定 JSON 数组，字段包含 name/role/motive/arc。'
    ].join('\n')
  }

  if (agentType === 'chapter_outline') {
    return [
      `项目：${projectTitle}`,
      `章节：${chapterTitle}`,
      `主线：${outlineText || '暂无'}`,
      `角色：${charactersJson || '暂无'}`,
      '任务：生成章节细纲，包含目标、冲突、伏笔、回收点。'
    ].join('\n')
  }

  if (agentType === 'chapter_draft') {
    return [
      `项目：${projectTitle}`,
      `章节：${chapterTitle}`,
      `细纲：${chapterOutline || '暂无'}`,
      `角色：${charactersJson || '暂无'}`,
      '任务：生成 1200~2200 字章节正文，采用中文自然段，不要附加解释。'
    ].join('\n')
  }

  if (agentType === 'audit') {
    return [
      `章节：${chapterTitle}`,
      `正文：${chapterDraft || '暂无'}`,
      '任务：审查风险。',
      '严格输出 JSON：{"status":"success|needs_review","content":"...","issues":[{"type":"safety","severity":"low|medium|high","message":"...","suggestion":"..."}]}'
    ].join('\n')
  }

  if (agentType === 'polish') {
    return [
      `章节：${chapterTitle}`,
      `正文：${chapterDraft || '暂无'}`,
      '任务：给出润色后正文或润色建议。',
      '严格输出 JSON：{"status":"success","content":"...","issues":[]}'
    ].join('\n')
  }

  if (agentType === 'consistency') {
    return [
      `章节：${chapterTitle}`,
      `世界观：${worldText || '暂无'}`,
      `角色：${charactersJson || '暂无'}`,
      `正文：${chapterDraft || '暂无'}`,
      '任务：检查一致性问题。',
      '严格输出 JSON：{"status":"success|needs_review","content":"...","issues":[{"type":"consistency","severity":"low|medium|high","message":"...","suggestion":"..."}]}'
    ].join('\n')
  }

  if (agentType === 'publish') {
    return [
      `项目：${projectTitle}`,
      `章节：${chapterTitle}`,
      `正文：${chapterDraft || '暂无'}`,
      '任务：生成发布建议。',
      '严格输出 JSON：{"status":"success","content":"标题建议+摘要+标签","issues":[]}'
    ].join('\n')
  }

  return JSON.stringify(payload)
}

function stripJsonFences(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
}

export function parseStructuredAgentResult(raw: string) {
  const fallback = {
    status: 'success' as 'success' | 'failed' | 'needs_review',
    content: raw,
    issues: [] as AgentIssue[]
  }

  const clean = stripJsonFences(raw)

  try {
    const parsed = JSON.parse(clean) as {
      status?: 'success' | 'failed' | 'needs_review'
      content?: string
      issues?: AgentIssue[]
    }

    return {
      status: parsed.status || 'success',
      content: parsed.content || raw,
      issues: Array.isArray(parsed.issues) ? parsed.issues : []
    }
  } catch {
    return fallback
  }
}

export function failedMetadata() {
  return {
    provider: 'n/a',
    model: 'n/a',
    latencyMs: 0,
    tokensIn: 0,
    tokensOut: 0,
    costEstimate: 0
  }
}

export function resolvePromptTemplate(
  templateId: string,
  variables: Record<string, string>
): { systemPrompt: string; userPrompt: string } {
  const db = getDb()
  const row = db
    .prepare('SELECT system_prompt, user_prompt_template FROM prompt_templates WHERE id = ? AND is_active = 1')
    .get(templateId) as { system_prompt: string; user_prompt_template: string } | undefined

  if (!row) {
    throw new Error(`提示词模板不存在或已禁用: ${templateId}`)
  }

  let userPrompt = row.user_prompt_template
  for (const [key, value] of Object.entries(variables)) {
    userPrompt = userPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
  }

  return {
    systemPrompt: row.system_prompt,
    userPrompt
  }
}

export function buildPolishInputPrompt(rawInput: string): { systemPrompt: string; userPrompt: string } {
  const db = getDb()
  const row = db
    .prepare("SELECT system_prompt, user_prompt_template FROM prompt_templates WHERE id = 'tpl_polish_input' AND is_active = 1")
    .get() as { system_prompt: string; user_prompt_template: string } | undefined

  if (row) {
    const userPrompt = row.user_prompt_template.replace(/\{\{userInput\}\}/g, rawInput)
    return { systemPrompt: row.system_prompt, userPrompt }
  }

  return {
    systemPrompt: '你是一位文字润色助手。将用户提供的粗略描述润色为清晰、具体、结构化的需求描述。保持原意不变，不要添加用户没有表达的内容。只输出润色后的文本，不要附加解释。',
    userPrompt: `请润色以下描述：\n\n${rawInput}`
  }
}
