import { ref } from 'vue'
import { apiFetch } from '~/composables/useApi'
import type { ChatSession, ChatMessage, ChatContextType } from '~/types/domain'

const drawerOpen = ref(false)
const currentSession = ref<ChatSession | null>(null)
const sessions = ref<ChatSession[]>([])
const messages = ref<ChatMessage[]>([])
const sending = ref(false)
const currentProjectId = ref('')
const currentContextType = ref<ChatContextType>('general')

// 用于页面与 drawer 之间传递"当前编辑文本"和"应用回写"
const editorText = ref('')
const applyTextCallback = ref<((text: string) => void) | null>(null)

export function useAiChat() {
  async function loadSessions(projectId: string): Promise<void> {
    const res = await apiFetch<{ sessions: ChatSession[] }>(
      `/api/projects/${projectId}/chat/sessions`
    )
    sessions.value = res.sessions
  }

  async function loadMessages(sessionId: string): Promise<void> {
    const res = await apiFetch<{ messages: ChatMessage[] }>(
      `/api/chat/sessions/${sessionId}/messages`
    )
    messages.value = res.messages
  }

  async function openDrawer(projectId: string, contextType?: ChatContextType): Promise<void> {
    currentProjectId.value = projectId
    currentContextType.value = contextType || 'general'
    drawerOpen.value = true

    await loadSessions(projectId)

    // 如果有现有的同类型对话，自动切换到最近的
    const matchingSession = sessions.value.find(
      (s) => s.contextType === currentContextType.value
    )
    if (matchingSession) {
      await switchSession(matchingSession.id)
    } else {
      currentSession.value = null
      messages.value = []
    }
  }

  function closeDrawer(): void {
    drawerOpen.value = false
  }

  async function createSession(projectId: string, contextType: ChatContextType): Promise<void> {
    const res = await apiFetch<{ session: ChatSession }>(
      `/api/projects/${projectId}/chat/sessions`,
      {
        method: 'POST',
        body: { contextType }
      }
    )
    currentSession.value = res.session
    messages.value = []
    sessions.value.unshift(res.session)
  }

  async function switchSession(sessionId: string): Promise<void> {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (session) {
      currentSession.value = session
      await loadMessages(sessionId)
    }
  }

  async function sendMessage(content: string): Promise<void> {
    if (!currentSession.value || sending.value) return

    sending.value = true
    try {
      const res = await apiFetch<{
        userMessage: ChatMessage
        assistantMessage: ChatMessage
      }>(`/api/chat/sessions/${currentSession.value.id}/messages`, {
        method: 'POST',
        body: { content }
      })

      messages.value.push(res.userMessage)
      messages.value.push(res.assistantMessage)
    } finally {
      sending.value = false
    }
  }

  async function deleteSession(sessionId: string): Promise<void> {
    await apiFetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' })

    sessions.value = sessions.value.filter((s) => s.id !== sessionId)

    if (currentSession.value?.id === sessionId) {
      currentSession.value = null
      messages.value = []
    }
  }

  async function refreshContext(): Promise<void> {
    if (!currentSession.value) return

    const res = await apiFetch<{ systemContext: string; updatedAt: string }>(
      `/api/chat/sessions/${currentSession.value.id}/refresh-context`,
      { method: 'POST' }
    )

    currentSession.value = {
      ...currentSession.value,
      systemContext: res.systemContext,
      updatedAt: res.updatedAt
    }
  }

  function registerEditor(getText: () => string, onApply: (text: string) => void): void {
    editorText.value = getText()
    applyTextCallback.value = onApply
  }

  function unregisterEditor(): void {
    applyTextCallback.value = null
    editorText.value = ''
  }

  function getEditorText(): string {
    return editorText.value
  }

  function applyToEditor(text: string): void {
    if (applyTextCallback.value) {
      applyTextCallback.value(text)
    }
  }

  function updateEditorText(text: string): void {
    editorText.value = text
  }

  return {
    drawerOpen,
    currentSession,
    sessions,
    messages,
    sending,
    currentProjectId,
    currentContextType,
    openDrawer,
    closeDrawer,
    createSession,
    switchSession,
    sendMessage,
    deleteSession,
    refreshContext,
    loadSessions,
    registerEditor,
    unregisterEditor,
    getEditorText,
    applyToEditor,
    updateEditorText
  }
}
