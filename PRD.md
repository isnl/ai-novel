# AI 小说创作系统 PRD（To C / MVP）

## 1. 文档信息
- 文档版本：v1.0
- 创建日期：2026-03-01
- 适用阶段：MVP（8 周）
- 目标形态：Web（桌面优先，移动端自适应）
- 技术基线：Nuxt 3 + Vue 3 + TypeScript + Pinia + UnoCSS + SQLite

## 2. 产品定位

### 2.1 产品一句话
面向个人创作者的 AI 小说创作平台，提供从书名到连载发布的全流程辅助，并通过多 Agent 编排保证生成质量与可追溯性。

### 2.2 目标用户
1. 网文新人：需要快速起稿、缺少完整创作方法。
2. 中腰部作者：希望提效，减少卡文、设定冲突、节奏失衡。
3. AI 创作爱好者：希望体验可控的“人机共创”。

### 2.3 核心价值
1. 端到端流程化创作：从设定到发布全链路打通。
2. 可控生成：结构化上下文注入，不是一次性“盲生文”。
3. 可回溯与可重跑：每个节点可单独重试、版本可回滚。
4. 多模型可切换：支持 Claude 协议与 OpenAI 兼容协议。

## 3. 范围定义

### 3.1 MVP 范围（本期必须）
1. 账号与画像（基础）
2. 创作工作台（书名/世界观/大纲/角色/章节细纲/正文）
3. AI Agent 编排（生成、审核、润色、一致性、发布）
4. 记忆与资料库（世界观/角色状态/伏笔回收）
5. 版本与草稿（章节级历史、回滚）
6. 发布与连载（章节发布、目录、详情）
7. 阅读器与书架（收藏、继续阅读）
8. 模型网关与配置（Provider、模型、参数、路由）

### 3.2 非目标（MVP 不做）
1. 多人协作写作（协同编辑、评论协作）
2. App 原生客户端
3. 完整 RAG 检索系统（向量库）
4. 有声书、漫画化能力
5. 推荐算法重度个性化

## 4. 关键设计原则
1. 主流程 + 章节循环：全书定义一次，章节迭代多次。
2. 结构化记忆优先：先做 Story Bible，不上完整 RAG。
3. Agent 解耦：每个 Agent 独立输入输出协议。
4. 模型调用统一网关：业务层不直接耦合具体模型厂商。
5. 全链路可观测：记录 token、耗时、错误率、费用。

## 5. 业务流程

### 5.1 主流程（项目初始化）
1. 创建项目：输入书名、题材、受众、风格、篇幅、禁忌约束。
2. 生成世界观：产出规则、势力、时代背景、核心矛盾。
3. 生成主线大纲：卷纲 + 关键章纲骨架。
4. 生成角色初版：角色卡、关系网、动机、成长弧。
5. 进入章节循环。

### 5.2 章节循环（每章执行）
1. 章节细纲生成：目标、冲突、伏笔、回收点。
2. 正文生成：按细纲与上下文输出章节草稿。
3. 审核 Agent：内容安全、敏感表达、违规风险。
4. 润色 Agent：语言风格优化（不改剧情事实）。
5. 一致性 Agent：设定/时间线/人设冲突检查。
6. 作者确认：可手改、可重跑任一节点。
7. 角色状态更新：关系、能力、立场、情绪变化入库。
8. 发布 Agent：生成标题建议、摘要、标签并发布。

### 5.3 阅读与反馈流程
1. 读者进入书架或作品页。
2. 阅读章节并互动（收藏/评论预留扩展）。
3. 创作者查看基础数据（阅读量、完读率、追更率）。
4. 反馈用于下一章策略（人工 + Agent 建议）。

## 6. 功能模块需求

## 6.1 模块 A：账号与画像
### 6.1.1 功能点
1. 注册/登录（邮箱或手机号，MVP 可先邮箱）。
2. 个人资料：昵称、头像、创作偏好。
3. 创作偏好：常用题材、风格、目标字数。

### 6.1.2 验收标准
1. 可在 1 分钟内完成注册并进入工作台。
2. 偏好设置可影响默认生成参数。
3. 未登录用户不可进入创作后台。

## 6.2 模块 B：创作工作台
### 6.2.1 页面结构
1. 项目总览页
2. 世界观页
3. 主线大纲页
4. 角色设定页
5. 章节编辑页（细纲/正文/Agent 结果）

### 6.2.2 功能点
1. 结构化表单 + AI 生成结果并排编辑。
2. 每个节点支持“重新生成/局部改写/手动编辑”。
3. 上下文引用预览：本次调用引用了哪些记忆条目。
4. 章节侧边栏展示伏笔状态（未回收/已回收）。

### 6.2.3 验收标准
1. 新建项目到产出第一章正文 ≤ 10 分钟。
2. 任一节点重跑不影响其他节点历史版本。
3. 用户可清楚区分 AI 内容与人工改动。

## 6.3 模块 C：AI Agent 编排
### 6.3.1 Agent 列表
1. 生成 Agent（World/Outline/Chapter）
2. 审核 Agent（合规与安全）
3. 润色 Agent（风格与可读性）
4. 一致性 Agent（剧情逻辑）
5. 发布 Agent（发布元数据）

### 6.3.2 编排规则
1. 默认串行：生成 -> 审核 -> 润色 -> 一致性 -> 发布建议。
2. 支持节点级重跑（如仅重跑润色）。
3. 每个节点输入输出采用统一 JSON 协议。
4. 节点失败支持自动重试（最多 2 次）+ 人工介入。

### 6.3.3 验收标准
1. 任一 Agent 失败不导致项目整体不可用。
2. 每次调用都可追踪输入版本、模型、参数、耗时。
3. 支持切换不同模型而无需改业务代码。

## 6.4 模块 D：记忆与资料库（Story Bible）
### 6.4.1 数据对象
1. 世界观规则（硬规则/软规则）
2. 角色卡（静态设定 + 动态状态）
3. 时间线事件
4. 伏笔与回收点
5. 术语与专有名词表

### 6.4.2 注入策略（MVP）
1. 固定结构化注入：世界观摘要 + 角色状态 + 时间线最近事件。
2. 窗口注入：最近 N 章细纲 + 最近 1-2 章正文摘要。
3. 约束注入：禁忌词、风格限制、视角限制。

### 6.4.3 验收标准
1. 章节生成的人设一致性明显优于无记忆模式。
2. 可检索任意角色当前状态和变化历史。
3. 伏笔回收状态可被章节生成节点自动引用。

## 6.5 模块 E：版本与草稿
### 6.5.1 功能点
1. 章节级版本树（V1/V2/...）。
2. 文本 Diff 对比（新增/删除/替换）。
3. 一键回滚到指定版本。
4. 标记“已发布版本”和“草稿版本”。

### 6.5.2 验收标准
1. 任意章节可在 3 秒内打开历史版本。
2. 回滚操作不丢失后续版本（仅切换当前生效版本）。

## 6.6 模块 F：发布与连载
### 6.6.1 功能点
1. 章节发布/撤回。
2. 作品目录管理（排序、章节标题编辑）。
3. 作品详情页（封面、简介、标签、更新状态）。
4. 导出 TXT（MVP 必做），EPUB（可选）。

### 6.6.2 验收标准
1. 创作者可一键从草稿发布到前台可见。
2. 撤回后读者侧不可访问该章节内容。

## 6.7 模块 G：阅读器与书架
### 6.7.1 功能点
1. 阅读器：目录、上下章跳转、字体大小（基础）。
2. 书架：收藏、继续阅读、最近更新提示。
3. 作品浏览：分类筛选（基础题材维度）。

### 6.7.2 验收标准
1. 首屏阅读加载时间 ≤ 2 秒（缓存命中场景）。
2. 书架可正确记录阅读进度。

## 6.8 模块 H：模型网关与配置（新增核心模块）
### 6.8.1 定位
作为 AI 能力底座，统一管理模型提供商、模型参数、Agent 路由、调用观测与成本控制。

### 6.8.2 Provider 支持范围
1. Anthropic（Claude 协议）
2. OpenAI
3. OpenAI-Compatible（自定义 `base_url`）

### 6.8.3 配置项
1. 基础：`provider`、`model`、`api_key`、`base_url`
2. 推理参数：`temperature`、`top_p`、`max_tokens`
3. 稳定性：`timeout_ms`、`retry_count`、`retry_backoff`
4. 输出：`stream`、`response_format`（text/json）
5. 计费：`cost_input_per_1k`、`cost_output_per_1k`（可配置估算）

### 6.8.4 能力标签
1. `supports_tool_call`
2. `supports_json_mode`
3. `supports_long_context`
4. `supports_vision`
5. `latency_level`
6. `cost_level`

### 6.8.5 Agent 路由策略
1. 每个 Agent 配置：主模型 + 备用模型 + 降级策略。
2. 路由优先级：可用性 > 稳定性 > 成本 > 质量（可按 Agent 自定义权重）。
3. 失败切换：主模型失败超过阈值自动切备用。
4. 灰度能力：支持 10%/50%/100% 流量切换做对比。

### 6.8.6 验收标准
1. 切换模型无需改业务代码。
2. 调用日志可追踪到 Provider、模型、参数、用量、费用。
3. 任何 API Key 均加密存储，日志不明文输出。

## 7. Agent 输入输出协议（统一）

### 7.1 通用输入结构
```json
{
  "project_id": "string",
  "chapter_id": "string",
  "agent_type": "generate|audit|polish|consistency|publish",
  "context": {
    "world_bible": "...",
    "character_states": [],
    "timeline": [],
    "foreshadowing": [],
    "recent_outline": "...",
    "recent_summary": "..."
  },
  "constraints": {
    "style": "...",
    "banned_terms": [],
    "target_length": 3000
  },
  "model_profile_id": "string"
}
```

### 7.2 通用输出结构
```json
{
  "status": "success|failed|needs_review",
  "content": "...",
  "issues": [
    {
      "type": "consistency|safety|style",
      "severity": "low|medium|high",
      "message": "...",
      "suggestion": "..."
    }
  ],
  "metadata": {
    "provider": "...",
    "model": "...",
    "latency_ms": 1200,
    "tokens_in": 1200,
    "tokens_out": 2300,
    "cost_estimate": 0.23
  }
}
```

## 8. 信息架构与页面清单
1. `/` 首页（作品推荐/最近更新）
2. `/login` 登录注册
3. `/workspace` 创作台入口
4. `/workspace/project/:id` 项目总览
5. `/workspace/project/:id/world` 世界观
6. `/workspace/project/:id/outline` 大纲
7. `/workspace/project/:id/characters` 角色
8. `/workspace/project/:id/chapters/:chapterId` 章节编辑
9. `/workspace/project/:id/settings/models` 模型网关配置
10. `/bookshelf` 书架
11. `/book/:id` 作品详情
12. `/book/:id/chapter/:chapterId` 阅读页

## 9. 数据模型（SQLite）

### 9.1 核心表
1. `users`
2. `user_preferences`
3. `projects`
4. `project_worlds`
5. `project_outlines`
6. `characters`
7. `character_states`
8. `chapters`
9. `chapter_outlines`
10. `chapter_drafts`
11. `foreshadowing_items`
12. `timeline_events`
13. `agent_runs`
14. `model_providers`
15. `model_profiles`
16. `agent_model_bindings`
17. `publish_records`
18. `bookshelf_items`

### 9.2 关键字段建议
- `projects`：`id`、`user_id`、`title`、`genre`、`style`、`target_words`、`status`
- `chapters`：`id`、`project_id`、`index_no`、`title`、`status(draft/published)`、`active_draft_id`
- `chapter_drafts`：`id`、`chapter_id`、`version_no`、`content`、`source(ai/manual/mixed)`、`created_at`
- `agent_runs`：`id`、`project_id`、`chapter_id`、`agent_type`、`input_json`、`output_json`、`status`、`latency_ms`、`tokens_in`、`tokens_out`、`cost_estimate`
- `model_profiles`：`id`、`provider_id`、`model_name`、`base_url`、`encrypted_api_key`、`params_json`、`capability_tags`

## 10. API 清单（MVP）

### 10.1 账号
1. `POST /api/auth/register`
2. `POST /api/auth/login`
3. `GET /api/me`
4. `PUT /api/me/preferences`

### 10.2 项目与创作
1. `POST /api/projects`
2. `GET /api/projects`
3. `GET /api/projects/:id`
4. `POST /api/projects/:id/world/generate`
5. `POST /api/projects/:id/outline/generate`
6. `POST /api/projects/:id/characters/generate`
7. `POST /api/projects/:id/chapters`
8. `POST /api/projects/:id/chapters/:chapterId/outline/generate`
9. `POST /api/projects/:id/chapters/:chapterId/draft/generate`
10. `POST /api/projects/:id/chapters/:chapterId/agent/:agentType/run`
11. `POST /api/projects/:id/chapters/:chapterId/publish`

### 10.3 版本
1. `GET /api/chapters/:chapterId/drafts`
2. `POST /api/chapters/:chapterId/drafts`
3. `POST /api/chapters/:chapterId/drafts/:draftId/activate`
4. `GET /api/chapters/:chapterId/drafts/diff?from=x&to=y`

### 10.4 模型网关
1. `GET /api/model/providers`
2. `POST /api/model/providers`
3. `GET /api/model/profiles`
4. `POST /api/model/profiles`
5. `PUT /api/model/profiles/:id`
6. `POST /api/model/profiles/:id/test`
7. `GET /api/model/agent-bindings`
8. `PUT /api/model/agent-bindings/:agentType`

### 10.5 阅读侧
1. `GET /api/books`
2. `GET /api/books/:id`
3. `GET /api/books/:id/chapters/:chapterId`
4. `POST /api/bookshelf`
5. `GET /api/bookshelf`

## 11. 状态机设计

### 11.1 项目状态
`init -> world_ready -> outline_ready -> writing -> completed`

### 11.2 章节状态
`planned -> drafting -> reviewing -> ready_to_publish -> published -> withdrawn`

### 11.3 Agent 任务状态
`queued -> running -> success|failed|manual_review`

## 12. 非功能需求

### 12.1 性能
1. 普通生成请求首 token 响应（stream）≤ 5 秒。
2. 常规章节（3000 字）端到端（生成+审核+润色）≤ 90 秒。
3. 阅读页首屏时间 ≤ 2 秒（缓存命中）。

### 12.2 稳定性
1. Agent 任务失败可重试，失败率监控。
2. 外部模型服务异常时触发降级模型。
3. 核心接口可用性目标：99.5%（MVP）。

### 12.3 安全
1. API Key 加密存储（服务端不可明文回显）。
2. 用户数据隔离：用户只能访问自身项目。
3. 审计日志保留关键操作（发布、撤回、模型配置变更）。

### 12.4 合规
1. 审核 Agent 对敏感内容给出风险等级。
2. 发布前必须通过最低安全检查阈值。

## 13. 埋点与核心指标

### 13.1 创作漏斗
1. 新建项目数
2. 生成世界观完成率
3. 第一章生成完成率
4. 首次发布完成率

### 13.2 质量指标
1. 章节重跑率
2. 一致性问题率
3. 审核拦截率

### 13.3 商业与留存先行指标
1. D1/D7 留存
2. 人均周生成字数
3. 周活跃创作者数

## 14. 8 周里程碑
1. 第 1-2 周：账号、项目、数据库、基础页面框架。
2. 第 3-4 周：世界观/大纲/章节生成主链路。
3. 第 5 周：Story Bible（角色状态、时间线、伏笔）。
4. 第 6 周：审核/润色/一致性 Agent + 发布流程。
5. 第 7 周：模型网关配置 + Agent 绑定 + 版本回滚。
6. 第 8 周：联调、压测、灰度上线、监控告警。

## 15. MVP 验收标准（上线门槛）
1. 用户可在单次会话内完成：创建项目 -> 生成第一章 -> 发布 -> 前台可读。
2. 任一章节可查看历史版本并回滚。
3. 至少支持 2 类模型接入（Claude 协议 + OpenAI 兼容）。
4. Agent 调用日志可查（模型、tokens、耗时、费用估算）。
5. 内容发布链路包含基础审核拦截。

## 16. 风险与应对
1. 风险：模型输出不稳定。
   应对：固定 Prompt 模板 + 输出 JSON 校验 + 失败重试。
2. 风险：长篇一致性下降。
   应对：结构化记忆强约束 + 一致性 Agent 必经。
3. 风险：成本不可控。
   应对：模型分级路由、token 限额、高成本任务告警。
4. 风险：审核误杀或漏检。
   应对：规则 + Agent 双层，支持人工复核。

## 17. RAG 决策说明
MVP 阶段不做完整向量 RAG，采用“结构化记忆 + 章节上下文注入”。
进入中期（单书超长、跨书检索需求明显）后再引入向量检索层，作为增强而非替代。

## 18. 后续扩展（非本期）
1. 完整 RAG（向量库 + 语义召回 + 重排）。
2. 多人协作写作。
3. 评论互动、打赏、会员体系。
4. 多端（小程序/App）与离线阅读。
