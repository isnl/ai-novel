export interface User {
  id: string
  email: string
  nickname: string
  role?: string
  avatarUrl?: string | null
  preferences?: UserPreference | null
}

export interface UserPreference {
  genres: string[]
  style: string
  targetWords: number
}

export interface Project {
  id: string
  title: string
  genre: string
  style: string
  targetWords: number
  status: 'init' | 'world_ready' | 'outline_ready' | 'writing' | 'completed'
  worldText?: string | null
  outlineText?: string | null
  charactersJson?: string | null
  createdAt: string
  updatedAt: string
}

export interface Chapter {
  id: string
  projectId: string
  indexNo: number
  title: string
  status: 'planned' | 'drafting' | 'reviewing' | 'ready_to_publish' | 'published' | 'withdrawn'
  activeDraftId?: string | null
  outlineText?: string | null
  createdAt: string
  updatedAt: string
}

export interface ChapterDraft {
  id: string
  chapterId: string
  versionNo: number
  content: string
  source: 'ai' | 'manual' | 'mixed'
  createdAt: string
}

export interface ModelProvider {
  id: string
  name: string
  type: 'anthropic' | 'openai' | 'openai_compatible'
  baseUrl?: string | null
}

export interface ModelProfile {
  id: string
  providerId: string
  modelName: string
  baseUrl?: string | null
  maskedApiKey?: string | null
  paramsJson: string
  capabilityTags: string
  isDefault: number
}

export interface AgentRun {
  id: string
  projectId: string
  chapterId: string
  agentType: string
  status: 'success' | 'failed' | 'needs_review'
  content: string
  metadata: {
    provider: string
    model: string
    latencyMs: number
    tokensIn: number
    tokensOut: number
    costEstimate: number
  }
}

export interface PromptCategory {
  id: string
  name: string
  description?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface PromptTemplate {
  id: string
  categoryId: string
  name: string
  description?: string | null
  systemPrompt: string
  userPromptTemplate: string
  variablesJson: string
  isActive: number
  sortOrder: number
  createdAt: string
  updatedAt: string
  categoryName?: string
}

export type ChatContextType = 'world' | 'outline' | 'characters' | 'general'

export interface ChatSession {
  id: string
  projectId: string
  title: string
  contextType: ChatContextType
  systemContext?: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  metadata?: {
    tokensIn?: number
    tokensOut?: number
    model?: string
    latencyMs?: number
  } | null
  createdAt: string
}
