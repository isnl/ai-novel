import BetterSqlite3 from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { hashPassword, randomId } from './crypto'

let db: BetterSqlite3.Database | null = null

function ensureDataDir() {
  const dir = join(process.cwd(), 'data')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function initSchema(database: BetterSqlite3.Database) {
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'author',
      avatar_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      genres_json TEXT NOT NULL DEFAULT '[]',
      style TEXT NOT NULL DEFAULT '',
      target_words INTEGER NOT NULL DEFAULT 3000,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      genre TEXT NOT NULL,
      style TEXT NOT NULL,
      target_words INTEGER NOT NULL,
      status TEXT NOT NULL,
      world_text TEXT,
      outline_text TEXT,
      characters_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      index_no INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      active_draft_id TEXT,
      outline_text TEXT,
      summary_text TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chapter_drafts (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      version_no INTEGER NOT NULL,
      content TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      chapter_id TEXT,
      agent_type TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT NOT NULL,
      status TEXT NOT NULL,
      latency_ms INTEGER NOT NULL,
      tokens_in INTEGER NOT NULL,
      tokens_out INTEGER NOT NULL,
      cost_estimate REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS model_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      base_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS model_profiles (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      model_name TEXT NOT NULL,
      base_url TEXT,
      encrypted_api_key TEXT,
      params_json TEXT NOT NULL,
      capability_tags TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (provider_id) REFERENCES model_providers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agent_model_bindings (
      agent_type TEXT PRIMARY KEY,
      primary_profile_id TEXT,
      fallback_profile_id TEXT,
      strategy_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publish_records (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      status TEXT NOT NULL,
      published_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookshelf_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      last_chapter_id TEXT,
      progress REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS prompt_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prompt_templates (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      system_prompt TEXT NOT NULL,
      user_prompt_template TEXT NOT NULL,
      variables_json TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES prompt_categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      context_type TEXT NOT NULL,
      system_context TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_project_id ON chapters(project_id);
    CREATE INDEX IF NOT EXISTS idx_drafts_chapter_id ON chapter_drafts(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_project_chapter ON agent_runs(project_id, chapter_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category_id);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_project ON chat_sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
  `)
}

function ensureUserRoleColumn(database: BetterSqlite3.Database) {
  const columns = database.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>
  const hasRole = columns.some((column) => column.name === 'role')
  if (!hasRole) {
    database.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'author'`)
  }
}

function seedProviders(database: BetterSqlite3.Database) {
  const count = database.prepare('SELECT COUNT(1) as count FROM model_providers').get() as { count: number }
  if (count.count > 0) {
    return
  }

  const now = new Date().toISOString()
  const insert = database.prepare(
    'INSERT INTO model_providers (id, name, type, base_url, created_at) VALUES (?, ?, ?, ?, ?)'
  )

  insert.run('provider_anthropic', 'Anthropic', 'anthropic', 'https://api.anthropic.com', now)
  insert.run('provider_openai', 'OpenAI', 'openai', 'https://api.openai.com/v1', now)
  insert.run('provider_compatible', 'OpenAI Compatible', 'openai_compatible', '', now)
}

function seedAdminUser(database: BetterSqlite3.Database) {
  const now = new Date().toISOString()
  const admin = database.prepare('SELECT id FROM users WHERE email = ?').get('admin') as { id: string } | undefined

  if (admin) {
    database.prepare('UPDATE users SET password_hash = ?, nickname = ?, role = ? WHERE id = ?').run(
      hashPassword('123456'),
      'admin',
      'admin',
      admin.id
    )
  } else {
    const userId = randomId('user')
    database
      .prepare(
        'INSERT INTO users (id, email, password_hash, nickname, role, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(userId, 'admin', hashPassword('123456'), 'admin', 'admin', null, now)

    database
      .prepare('INSERT INTO user_preferences (user_id, genres_json, style, target_words) VALUES (?, ?, ?, ?)')
      .run(userId, JSON.stringify(['玄幻']), '克制叙事', 3000)
  }
}

function seedPromptData(database: BetterSqlite3.Database) {
  const count = database.prepare('SELECT COUNT(1) as count FROM prompt_categories').get() as { count: number }
  if (count.count > 0) {
    return
  }

  const now = new Date().toISOString()
  const insertCat = database.prepare(
    'INSERT INTO prompt_categories (id, name, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const insertTpl = database.prepare(
    `INSERT INTO prompt_templates (id, category_id, name, description, system_prompt, user_prompt_template, variables_json, is_active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  )

  const categories = [
    { id: 'cat_world', name: '世界观生成', desc: '用于生成和优化小说世界观设定', sort: 0 },
    { id: 'cat_outline', name: '大纲生成', desc: '用于生成和优化小说主线大纲', sort: 1 },
    { id: 'cat_characters', name: '角色生成', desc: '用于生成和优化角色设定', sort: 2 },
    { id: 'cat_chapter', name: '章节生成', desc: '用于章节细纲和正文生成', sort: 3 },
    { id: 'cat_review', name: '润色/审核', desc: '用于内容审核、润色和一致性检查', sort: 4 },
    { id: 'cat_general', name: '通用', desc: '通用辅助提示词，如输入润色', sort: 5 }
  ]

  for (const cat of categories) {
    insertCat.run(cat.id, cat.name, cat.desc, cat.sort, now, now)
  }

  const templates = [
    {
      id: 'tpl_world_default',
      categoryId: 'cat_world',
      name: '标准世界观生成',
      desc: '根据用户描述生成完整世界观，包含时代背景、核心矛盾、硬规则、软规则、主要势力。',
      systemPrompt: '你是一位专业的网文世界观架构师。根据用户的需求描述，生成结构完整、逻辑自洽的世界观设定。输出应包含：时代背景、核心矛盾、硬规则（不可违反的基础法则）、软规则（可灵活调整的社会规范）、主要势力及其关系。使用纯文本，不要使用 Markdown 标题。',
      userTemplate: '项目：{{projectTitle}}\n\n用户需求：{{userInput}}\n\n现有世界观（如有）：{{worldText}}\n\n请根据以上信息生成或优化世界观设定。',
      variables: '["projectTitle","userInput","worldText"]',
      sort: 0
    },
    {
      id: 'tpl_outline_default',
      categoryId: 'cat_outline',
      name: '标准大纲生成',
      desc: '根据世界观和用户描述生成主线大纲，包含卷纲结构。',
      systemPrompt: '你是一位资深的网文大纲策划师。根据世界观设定和用户需求，生成结构清晰的主线大纲。大纲应包含至少 3 卷，每卷包含目标、核心冲突、关键转折和回收点。使用纯文本，层级用缩进表示。',
      userTemplate: '项目：{{projectTitle}}\n\n世界观：{{worldText}}\n\n用户需求：{{userInput}}\n\n现有大纲（如有）：{{outlineText}}\n\n请根据以上信息生成或优化主线大纲。',
      variables: '["projectTitle","userInput","worldText","outlineText"]',
      sort: 0
    },
    {
      id: 'tpl_characters_default',
      categoryId: 'cat_characters',
      name: '标准角色生成',
      desc: '根据世界观和大纲生成角色设定卡片。',
      systemPrompt: '你是一位专业的角色设计师。根据世界观和大纲，生成有深度的角色设定。每个角色应包含：姓名、角色定位（主角/配角/反派等）、核心动机、性格特点、成长弧线。输出严格使用 JSON 数组格式，字段为 name/role/motive/personality/arc。',
      userTemplate: '项目：{{projectTitle}}\n\n世界观：{{worldText}}\n\n主线大纲：{{outlineText}}\n\n用户需求：{{userInput}}\n\n现有角色（如有）：{{charactersJson}}\n\n请根据以上信息生成或优化角色设定，输出 JSON 数组。',
      variables: '["projectTitle","userInput","worldText","outlineText","charactersJson"]',
      sort: 0
    },
    {
      id: 'tpl_polish_input',
      categoryId: 'cat_general',
      name: '输入润色',
      desc: '润色用户的输入描述，使其更清晰、更具体，便于 AI 理解和生成。',
      systemPrompt: '你是一位文字润色助手。将用户提供的粗略描述润色为清晰、具体、结构化的需求描述。保持原意不变，不要添加用户没有表达的内容。只输出润色后的文本，不要附加解释。',
      userTemplate: '请润色以下描述：\n\n{{userInput}}',
      variables: '["userInput"]',
      sort: 0
    }
  ]

  for (const tpl of templates) {
    insertTpl.run(tpl.id, tpl.categoryId, tpl.name, tpl.desc, tpl.systemPrompt, tpl.userTemplate, tpl.variables, tpl.sort, now, now)
  }
}

export function getDb() {
  if (db) {
    return db
  }

  const dir = ensureDataDir()
  const file = join(dir, 'app.db')
  db = new BetterSqlite3(file)
  initSchema(db)
  ensureUserRoleColumn(db)
  seedProviders(db)
  seedAdminUser(db)
  seedPromptData(db)
  return db
}
