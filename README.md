# AI 小说创作系统（MVP 基线）

基于 `Nuxt 4 + Vue 3 + TypeScript + Pinia + UnoCSS + SQLite` 的可运行实现，按 `PRD.md` 与 `theme.md` 落地第一阶段能力。

## 已实现范围

- 账号：注册 / 登录 / 退出 / 获取当前用户 / 偏好设置
- 创作台：
  - 项目创建、列表、详情
  - 世界观 / 主线大纲 / 角色设定页面（AI 生成 + 手改保存）
  - 章节创建、细纲生成、正文生成、Agent 执行、发布
- 版本：章节草稿历史、手动新增、激活版本、简化 diff
- 模型网关：Provider / Profile / Agent 绑定（含 API Key 加密存储）
- 真实模型调用：按 Agent 绑定路由到 OpenAI / Anthropic / OpenAI-Compatible，并支持失败切换与重试
- 阅读侧：作品列表、作品详情、章节阅读、书架收藏

## 本地启动

```bash
npm install --cache .npm-cache
npm run dev
```

打开 `http://localhost:3000`。

## 关键脚本

```bash
npm run typecheck
npm run build
npm run preview
```

## 数据库

- SQLite 文件：`data/app.db`
- 首次启动自动建表并预置 Provider：Anthropic / OpenAI / OpenAI Compatible
- 首次初始化自动创建系统管理员账号：`admin / 123456`（开发环境）

## 注意事项

- 请先在「模型网关配置」页面创建 Profile（填入有效 API Key），否则 Agent 调用会报未配置错误。
- `admin / 123456` 仅用于本地开发，请在生产环境替换或禁用默认播种逻辑。
