# 编码规范（Nuxt 3 / Vue 3 / TypeScript / Pinia / UnoCSS）

## 1. 技术栈约定
- 前端框架：`Nuxt 3`（Web 产品）。
- 组件语法：统一使用 `Vue 3 <script setup lang="ts">`。
- 语言：统一使用 `TypeScript`，开启严格类型检查（`strict: true`）。
- 状态管理：统一使用 `Pinia` 进行跨组件/跨页面通信。
- 样式方案：优先使用 `UnoCSS` 原子类；仅在 UnoCSS 无法合理表达时使用 `style`。
- LLM 服务：`OpenAI API`（规划模型与写作模型分离）。
- 数据库：`SQLite`（`better-sqlite3`，用于 Story Bible / Outline / SceneCard / Draft 版本化存储）。

## 2. 导入规范（强制）
- 即使 Nuxt 支持自动导入，也必须显式导入依赖，禁止直接使用未导入标识符。
- 组件、组合式函数、工具函数、store、类型定义都必须写明确 `import`。
- Vue API 必须从 `vue` 显式导入，例如 `ref`、`computed`、`watch`。
- Nuxt API 必须显式导入（如从 `#imports` / `#app`），禁止隐式可用即直接调用。
- 业务模块统一使用 `~/` 或 `@/` 别名路径，避免深层相对路径地狱。

## 3. Vue 3 组件最佳实践
- 单文件组件保持单一职责，避免“超大组件”。
- `props` 必须声明类型；有默认值时使用 `withDefaults`。
- `emits` 必须使用 `defineEmits` 声明并标注类型。
- 禁止直接修改 `props`；需要可变副本时使用本地 `ref/reactive`。
- 模板中避免复杂表达式，复杂逻辑下沉到 `computed` 或组合式函数。
- 优先使用 `computed` 派生状态；`watch` 仅用于副作用。
- 副作用（事件监听、定时器、订阅）必须在卸载时清理。
- 可复用逻辑必须抽到 `composables/useXxx.ts`，避免重复代码。

## 4. Nuxt 开发约定
- 页面数据获取优先使用 `useAsyncData` / `useFetch`，保证 SSR/缓存能力。
- 涉及浏览器对象（`window`、`document`）时必须做客户端判断（如 `import.meta.client`）。
- 页面必须处理加载态、错误态、空态，避免只处理成功分支。
- 路由参数与 query 使用前做类型收敛和空值处理。

## 5. Pinia 规范
- Store 按业务域拆分，命名统一为 `useXxxStore`。
- `state`、`getters`、`actions` 职责清晰，禁止在 getter 中做副作用。
- 异步 `actions` 必须处理异常并返回可消费结果（或抛出明确错误）。
- 跨 store 协作通过 action/composable 协调，避免直接改写他人 store 内部状态。
- 临时 UI 状态优先放组件本地，避免把所有状态都放进全局 store。

## 6. UnoCSS 与样式规范
- 样式优先使用 UnoCSS 原子类与预设规则，保持风格一致。
- 优先通过 `theme`、`shortcut`、语义化类名复用设计令牌，减少魔法值。
- 只有在以下场景允许写 `style`：
  - UnoCSS 无法表达的复杂选择器或关键帧细节；
  - 第三方组件覆盖样式确实需要更高选择器控制。
- 使用 `style` 时默认 `scoped`，并保持最小化；禁止大段全局样式堆积在页面组件中。

## 7. TypeScript 规范
- 禁止 `any`（确有必要时使用 `unknown` 并做类型收窄）。
- 导出函数/组合式函数应有明确返回类型。
- API 请求响应必须定义类型，放在 `types/` 或对应模块内集中管理。
- 枚举业务状态优先使用字面量联合类型或 `enum`（团队统一后一致执行）。

## 8. 目录与命名建议
- 目录建议：
  - `pages/` 页面路由
  - `components/` 通用组件
  - `composables/` 组合式逻辑
  - `stores/` Pinia 状态
  - `services/` 接口请求与数据访问
  - `types/` 类型定义
  - `utils/` 纯工具函数
- 命名规范：
  - 组件：`PascalCase.vue`
  - 组合式：`useXxx.ts`
  - Store：`xxx.store.ts` 或 `useXxxStore`（二选一后全局统一）
  - 常量：`UPPER_SNAKE_CASE`

## 9. 代码质量门禁
- 提交前至少通过：`lint`、`typecheck`、`test`（如项目已配置）。
- 发现类型错误或 lint 报错时，不允许以注释屏蔽替代修复（`@ts-ignore` 需极少且附原因）。
- 注释只解释“为什么”，不解释显而易见的“做了什么”。

## 10. 推荐 Nuxt 配置方向（与本规范一致）
- 建议关闭自动导入或降低其使用范围，保证“显式导入”规范可执行。
- 建议关闭全局组件自动注册，统一使用局部显式导入。
- 以上配置以项目实际 `nuxt.config.ts` 为准，但编码阶段必须遵守显式导入原则。


### 11. AI 编程需要遵守如下规则

- 始终用中文回答问题！
- 始终用中文回答问题
- 始终用中文回答问题