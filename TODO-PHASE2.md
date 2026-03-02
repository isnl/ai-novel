# 第二期：全局 AI 对话助手

> 第一期（后台管理 + 提示词管理 + 创作页重做）已完成，本文档记录第二期待实施内容。

---

## 概述

实现全局 AI 对话助手，支持多轮对话、System Prompt 上下文注入、Diff 合并回写，让用户能以对话方式迭代优化世界观/大纲/角色等创作内容。

---

## 1. 数据库变更

**文件**: `server/utils/db.ts`

新增两张表：

```sql
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  context_type TEXT NOT NULL,  -- 'world' | 'outline' | 'characters' | 'general'
  system_context TEXT,          -- 注入的世界观/大纲等上下文快照
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,           -- 'user' | 'assistant'
  content TEXT NOT NULL,
  metadata_json TEXT,           -- { tokensIn, tokensOut, model, latencyMs }
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
```

---

## 2. 对话助手 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/projects/[id]/chat/sessions` | 获取项目下的对话列表 |
| `POST` | `/api/projects/[id]/chat/sessions` | 新建对话（含 context_type，自动注入上下文快照） |
| `GET` | `/api/chat/sessions/[sessionId]/messages` | 获取对话消息历史 |
| `POST` | `/api/chat/sessions/[sessionId]/messages` | 发送消息（返回 AI 回复，流式） |
| `DELETE` | `/api/chat/sessions/[sessionId]` | 删除对话 |
| `POST` | `/api/chat/sessions/[sessionId]/refresh-context` | 刷新上下文（重新注入最新世界观/大纲） |

### API 细节

- **新建对话** (`POST /api/projects/[id]/chat/sessions`)
  - 请求体：`{ contextType: 'world' | 'outline' | 'characters' | 'general', title?: string }`
  - 自动将当前项目对应字段（worldText / outlineText / charactersJson）作为 `system_context` 快照存入
  - 返回新建的 session 对象

- **发送消息** (`POST /api/chat/sessions/[sessionId]/messages`)
  - 请求体：`{ content: string }`
  - 将用户消息存入 `chat_messages`
  - 组装 system prompt（包含 `system_context`）+ 历史消息，调用模型
  - 将 AI 回复存入 `chat_messages`，返回回复内容和 metadata

- **刷新上下文** (`POST /api/chat/sessions/[sessionId]/refresh-context`)
  - 重新读取项目最新的 worldText/outlineText/charactersJson
  - 更新 session 的 `system_context` 字段

---

## 3. 对话上下文注入策略

采用 **System Prompt 注入**方案：

- 新建对话时，将当前世界观/大纲/角色内容作为 `system_context` 快照存入 `chat_sessions`
- 每次调用模型时，`system_context` 作为 system prompt 的一部分发送
- 用户聊天消息只包含用户输入，不重复发送上下文
- "刷新上下文"按钮更新 `system_context` 为最新版本

---

## 4. 前端组件

### 4.1 `composables/useAiChat.ts`

对话助手状态管理 composable：

```ts
// 核心状态
drawerOpen: Ref<boolean>
currentSession: Ref<ChatSession | null>
sessions: Ref<ChatSession[]>
messages: Ref<ChatMessage[]>
sending: Ref<boolean>

// 核心方法
openDrawer(projectId: string, contextType?: string): void
closeDrawer(): void
createSession(projectId: string, contextType: string): Promise<void>
switchSession(sessionId: string): Promise<void>
sendMessage(content: string): Promise<void>
deleteSession(sessionId: string): Promise<void>
refreshContext(): Promise<void>
```

### 4.2 `components/AiChatDrawer.vue`

右侧抽屉组件（Drawer），全局可用：

- **呼出方式**：快捷键 `Cmd+/` 或底部悬浮按钮
- **顶部区域**：
  - 对话列表下拉切换
  - 新建对话按钮
  - 刷新上下文按钮
  - 关闭按钮
- **中间区域**：
  - 消息列表（用户消息 + AI 回复）
  - AI 回复支持 markdown 渲染
  - AI 回复旁边显示"应用到世界观/大纲"按钮
- **底部区域**：
  - 输入框 + 发送按钮

### 4.3 `components/DiffViewer.vue`

Diff 对比视图组件：

- **Props**: `oldText: string`, `newText: string`
- **Events**: `@apply(mergedText: string)`, `@cancel`
- 使用 `diff` npm 包计算文本差异
- 渲染并排对比或行内对比视图
- 差异部分高亮标注（增/删/改）
- 支持逐块 accept/reject
- 确认后触发 `@apply` 事件，将合并结果回写

### "应用"功能交互流程

1. 用户点击 AI 回复旁的"应用到世界观"按钮
2. 弹出 DiffViewer 弹窗
3. 左侧显示当前世界观内容，右侧显示 AI 建议内容
4. 用户逐段选择接受或拒绝
5. 确认后内容写入编辑器并调用保存 API

---

## 5. 集成改造

### 5.1 `layouts/default.vue`

在 layout 中引入 `AiChatDrawer` 组件（仅在 `/workspace` 路径下渲染）。

### 5.2 创作页增加入口

修改 `pages/workspace/project/[id]/world.vue` 和 `outline.vue`：

- 在编辑器区域增加"打开 AI 对话"快捷入口按钮
- 点击后以当前页面内容类型为上下文打开对话抽屉

---

## 6. 需要新增的文件

| 文件 | 说明 |
|------|------|
| `composables/useAiChat.ts` | 对话助手状态管理 |
| `components/AiChatDrawer.vue` | 右侧对话抽屉 |
| `components/DiffViewer.vue` | Diff 对比视图 |
| `server/api/projects/[id]/chat/sessions.get.ts` | 获取项目对话列表 |
| `server/api/projects/[id]/chat/sessions.post.ts` | 新建对话 |
| `server/api/chat/sessions/[sessionId]/messages.get.ts` | 获取消息历史 |
| `server/api/chat/sessions/[sessionId]/messages.post.ts` | 发送消息 |
| `server/api/chat/sessions/[sessionId].delete.ts` | 删除对话 |
| `server/api/chat/sessions/[sessionId]/refresh-context.post.ts` | 刷新上下文 |

## 7. 需要修改的文件

| 文件 | 改动 |
|------|------|
| `server/utils/db.ts` | 新增 `chat_sessions` + `chat_messages` 表 |
| `types/domain.ts` | 新增 `ChatSession` + `ChatMessage` 类型 |
| `layouts/default.vue` | 引入 `AiChatDrawer`（仅 workspace 路径） |
| `pages/workspace/project/[id]/world.vue` | 增加"AI 对话"入口按钮 |
| `pages/workspace/project/[id]/outline.vue` | 增加"AI 对话"入口按钮 |
| `package.json` | 新增 `diff` 依赖 |

---

## 8. 实施顺序

1. DB：新增 `chat_sessions` + `chat_messages` 表
2. 类型：`types/domain.ts` 增加 ChatSession / ChatMessage
3. Server：对话 CRUD API（sessions + messages）
4. Server：刷新上下文 API
5. 依赖：安装 `diff` npm 包
6. 前端：`composables/useAiChat.ts`
7. 前端：`components/DiffViewer.vue`
8. 前端：`components/AiChatDrawer.vue`
9. 前端：集成到 `layouts/default.vue`
10. 前端：创作页增加"AI 对话"入口

---

## 9. 验证方案

1. 在世界观/大纲页面点击"AI 对话"按钮，右侧抽屉弹出
2. 对话以当前世界观/大纲为上下文，能进行多轮对话
3. AI 回复旁边显示"应用"按钮，点击后弹出 Diff 对比视图
4. 可以逐块选择接受/拒绝差异，确认后内容回写到编辑器
5. 关闭抽屉后重新打开，对话历史保留
6. "刷新上下文"按钮能更新对话中的上下文为最新版本
7. 快捷键 `Cmd+/` 能正常呼出/关闭抽屉
