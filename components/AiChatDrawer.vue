<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from '#imports'
import { useAiChat } from '~/composables/useAiChat'
import DiffViewer from '~/components/DiffViewer.vue'

const route = useRoute()
const {
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
  getEditorText,
  applyToEditor
} = useAiChat()

const inputText = ref('')
const messagesContainer = ref<HTMLDivElement | null>(null)
const showSessionList = ref(false)

// Diff 弹窗状态
const diffVisible = ref(false)
const diffOldText = ref('')
const diffNewText = ref('')

const projectId = computed((): string => {
  return currentProjectId.value || String(route.params.id || '')
})

const hasEditor = computed((): boolean => {
  return currentContextType.value !== 'general'
})

function scrollToBottom(): void {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(messages, () => {
  scrollToBottom()
}, { deep: true })

async function handleSend(): Promise<void> {
  const text = inputText.value.trim()
  if (!text || sending.value) return

  inputText.value = ''
  await sendMessage(text)
}

async function handleNewSession(): Promise<void> {
  const pid = projectId.value
  if (!pid) return

  await createSession(pid, currentContextType.value)
  showSessionList.value = false
}

async function handleSwitchSession(sessionId: string): Promise<void> {
  await switchSession(sessionId)
  showSessionList.value = false
}

async function handleDeleteSession(sessionId: string): Promise<void> {
  await deleteSession(sessionId)
}

function handleApplyToEditor(aiContent: string): void {
  diffOldText.value = getEditorText()
  diffNewText.value = aiContent
  diffVisible.value = true
}

function handleDiffApply(mergedText: string): void {
  applyToEditor(mergedText)
  diffVisible.value = false
}

function handleDiffCancel(): void {
  diffVisible.value = false
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

// 快捷键 Cmd+/
function handleGlobalKeydown(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.key === '/') {
    e.preventDefault()
    if (drawerOpen.value) {
      closeDrawer()
    } else {
      const pid = projectId.value
      if (pid) {
        openDrawer(pid, currentContextType.value)
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

const contextLabel = computed((): string => {
  const map: Record<string, string> = {
    world: '世界观',
    outline: '大纲',
    characters: '角色',
    general: '通用'
  }
  return map[currentSession.value?.contextType || ''] || '通用'
})
</script>

<template>
  <!-- 悬浮按钮 -->
  <button
    v-if="!drawerOpen"
    class="fab"
    title="打开 AI 助手 (⌘/)"
    @click="openDrawer(projectId, currentContextType)"
  >
    <span class="i-carbon-chat-bot" />
  </button>

  <!-- 遮罩 -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="drawerOpen" class="drawer-overlay" @click="closeDrawer" />
    </Transition>

    <Transition name="slide-right">
      <aside v-if="drawerOpen" class="drawer">
        <!-- 顶部 -->
        <header class="drawer-header">
          <div class="drawer-header-left">
            <span class="drawer-title">AI 对话助手</span>
            <span v-if="currentSession" class="context-tag">{{ contextLabel }}</span>
          </div>
          <div class="drawer-header-actions">
            <button
              class="btn-icon"
              title="对话列表"
              @click="showSessionList = !showSessionList"
            >
              <span class="i-carbon-list" />
            </button>
            <button
              class="btn-icon"
              title="新建对话"
              @click="handleNewSession"
            >
              <span class="i-carbon-add" />
            </button>
            <button
              v-if="currentSession"
              class="btn-icon"
              title="刷新上下文"
              @click="refreshContext"
            >
              <span class="i-carbon-renew" />
            </button>
            <button class="btn-icon" title="关闭 (⌘/)" @click="closeDrawer">
              <span class="i-carbon-close" />
            </button>
          </div>
        </header>

        <!-- 对话列表下拉 -->
        <div v-if="showSessionList" class="session-list">
          <div
            v-for="s in sessions"
            :key="s.id"
            class="session-item"
            :class="{ active: currentSession?.id === s.id }"
            @click="handleSwitchSession(s.id)"
          >
            <div class="session-item-info">
              <span class="session-item-title">{{ s.title }}</span>
              <span class="session-item-time">{{ s.updatedAt.slice(0, 10) }}</span>
            </div>
            <button
              class="btn-icon btn-icon-sm"
              title="删除"
              @click.stop="handleDeleteSession(s.id)"
            >
              <span class="i-carbon-trash-can" />
            </button>
          </div>
          <div v-if="sessions.length === 0" class="session-empty">
            暂无对话，点击 + 新建
          </div>
        </div>

        <!-- 消息区 -->
        <div ref="messagesContainer" class="messages-area">
          <template v-if="!currentSession">
            <div class="empty-state">
              <span class="i-carbon-chat-bot empty-icon" />
              <p>点击 + 新建对话，开始与 AI 助手交流</p>
            </div>
          </template>
          <template v-else-if="messages.length === 0">
            <div class="empty-state">
              <span class="i-carbon-send-alt empty-icon" />
              <p>发送消息开始对话</p>
            </div>
          </template>
          <template v-else>
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="message"
              :class="[`message-${msg.role}`]"
            >
              <div class="message-avatar">
                <span v-if="msg.role === 'user'" class="i-carbon-user" />
                <span v-else class="i-carbon-bot" />
              </div>
              <div class="message-body">
                <div class="message-content" v-text="msg.content" />
                <div v-if="msg.role === 'assistant'" class="message-actions">
                  <button
                    v-if="hasEditor"
                    class="btn btn-ghost btn-xs"
                    @click="handleApplyToEditor(msg.content)"
                  >
                    <span class="i-carbon-document-import" />
                    应用到{{ contextLabel }}
                  </button>
                  <span v-if="msg.metadata" class="message-meta">
                    {{ msg.metadata.model }} · {{ msg.metadata.latencyMs }}ms
                  </span>
                </div>
              </div>
            </div>
          </template>

          <div v-if="sending" class="message message-assistant">
            <div class="message-avatar">
              <span class="i-carbon-bot" />
            </div>
            <div class="message-body">
              <div class="typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区 -->
        <div class="input-area">
          <textarea
            v-model="inputText"
            class="chat-input"
            placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
            rows="2"
            :disabled="!currentSession || sending"
            @keydown="handleKeydown"
          />
          <button
            class="btn btn-primary btn-send"
            :disabled="!inputText.trim() || !currentSession || sending"
            @click="handleSend"
          >
            <span class="i-carbon-send-alt" />
          </button>
        </div>
      </aside>
    </Transition>

    <!-- Diff 弹窗 -->
    <Transition name="fade">
      <div v-if="diffVisible" class="diff-overlay">
        <div class="diff-modal">
          <DiffViewer
            :old-text="diffOldText"
            :new-text="diffNewText"
            @apply="handleDiffApply"
            @cancel="handleDiffCancel"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* FAB 悬浮按钮 */
.fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 900;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: var(--text-inverse);
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.fab:hover {
  transform: scale(1.08);
  box-shadow: var(--shadow-lg);
}

/* 遮罩 */
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 998;
  background: var(--overlay);
}

/* 抽屉 */
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  width: min(420px, 100vw - 48px);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
}

/* 顶部 */
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--divider);
  background: var(--surface-2);
  flex-shrink: 0;
}

.drawer-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.drawer-title {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text);
}

.context-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 600;
}

.drawer-header-actions {
  display: flex;
  gap: var(--space-1);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-xs);
  border: none;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  font-size: 18px;
  transition: background 0.15s ease, color 0.15s ease;
}

.btn-icon:hover {
  background: var(--surface-3);
  color: var(--text);
}

.btn-icon-sm {
  width: 24px;
  height: 24px;
  font-size: 14px;
}

/* 对话列表 */
.session-list {
  border-bottom: 1px solid var(--divider);
  max-height: 240px;
  overflow-y: auto;
  background: var(--surface-2);
  flex-shrink: 0;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: background 0.15s ease;
}

.session-item:hover {
  background: var(--surface-3);
}

.session-item.active {
  background: var(--primary-soft);
}

.session-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.session-item-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-item-time {
  font-size: var(--text-xs);
  color: var(--text-3);
}

.session-empty {
  padding: var(--space-4);
  text-align: center;
  color: var(--text-3);
  font-size: var(--text-sm);
}

/* 消息区 */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-3);
  gap: var(--space-2);
}

.empty-icon {
  font-size: 48px;
  opacity: 0.3;
}

.empty-state p {
  margin: 0;
  font-size: var(--text-sm);
}

/* 消息 */
.message {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
}

.message-user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.message-user .message-avatar {
  background: var(--primary-soft);
  color: var(--primary);
}

.message-assistant .message-avatar {
  background: var(--accent-soft);
  color: var(--accent);
}

.message-body {
  max-width: 85%;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.message-content {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  white-space: pre-wrap;
  word-break: break-word;
}

.message-user .message-content {
  background: var(--primary);
  color: var(--text-inverse);
  border-bottom-right-radius: var(--radius-xs);
}

.message-assistant .message-content {
  background: var(--surface-3);
  color: var(--text);
  border-bottom-left-radius: var(--radius-xs);
}

.message-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.btn-xs {
  height: 26px;
  padding: 0 var(--space-2);
  font-size: 11px;
}

.message-meta {
  font-size: 11px;
  color: var(--text-3);
}

/* 打字动画 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: var(--space-2) var(--space-3);
  background: var(--surface-3);
  border-radius: var(--radius-sm);
  border-bottom-left-radius: var(--radius-xs);
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-3);
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 输入区 */
.input-area {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--divider);
  background: var(--surface-2);
  flex-shrink: 0;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  font-family: var(--font-ui);
  resize: none;
  background: var(--surface);
  color: var(--text);
  line-height: var(--leading-normal);
  outline: none;
  transition: border-color 0.15s ease;
}

.chat-input:focus {
  border-color: var(--primary);
  box-shadow: var(--shadow-focus);
}

.chat-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-send {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

/* Diff 弹窗 */
.diff-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}

.diff-modal {
  width: min(720px, 100%);
  max-height: 90vh;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
