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

    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_project_id ON chapters(project_id);
    CREATE INDEX IF NOT EXISTS idx_drafts_chapter_id ON chapter_drafts(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_project_chapter ON agent_runs(project_id, chapter_id);
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
  return db
}
