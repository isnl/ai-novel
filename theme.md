# AI 小说系统 Theme 规范（v1）

## 1. 主题定位
- 主题名：纸墨青
- 风格方向：纸感内容产品 + 轻科技感
- 关键词：沉浸阅读、创作效率、克制表达
- 适用范围：To C Web MVP（桌面优先，移动端自适应）

## 2. 设计原则
- 长时间阅读优先：正文区减少高饱和色和高对比噪声。
- 创作效率优先：按钮层级清晰，关键操作始终可见。
- 统一 Token 驱动：颜色、间距、圆角、阴影全部使用变量。
- 低成本扩展：先浅色主题，暗色作为后续扩展层。

## 3. Design Tokens

```css
:root {
  /* Color: Base */
  --bg: #F8F5EE;
  --bg-soft: #F3EEE4;
  --surface: #FFFFFF;
  --surface-2: #FCFAF6;
  --surface-3: #F1ECE2;

  --text: #1F2933;
  --text-2: #3B4754;
  --text-3: #5B6572;
  --text-inverse: #F8FAFC;

  --primary: #1F6B75;
  --primary-hover: #195A62;
  --primary-active: #144B51;
  --primary-soft: #E3F1F3;

  --secondary: #C9792B;
  --secondary-hover: #A86423;
  --secondary-soft: #F8EBDD;

  --accent: #2F9E83;
  --accent-soft: #E3F5EF;

  --success: #2E7D32;
  --warning: #B7791F;
  --danger: #C53030;
  --info: #2563EB;

  --border: #D9D3C7;
  --border-2: #C9C2B6;
  --divider: #E8E2D8;
  --overlay: rgba(22, 26, 29, 0.45);

  /* Color: Status Surface */
  --success-bg: #EAF7EC;
  --warning-bg: #FFF4E5;
  --danger-bg: #FDECEC;
  --info-bg: #EAF1FF;

  /* Radius */
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-pill: 999px;

  /* Shadow */
  --shadow-xs: 0 1px 2px rgba(18, 24, 30, 0.06);
  --shadow-sm: 0 3px 10px rgba(18, 24, 30, 0.08);
  --shadow-md: 0 8px 24px rgba(18, 24, 30, 0.10);
  --shadow-lg: 0 14px 40px rgba(18, 24, 30, 0.12);
  --shadow-focus: 0 0 0 3px rgba(31, 107, 117, 0.22);

  /* Space (4pt system) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Typography */
  --font-ui: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-reading: "Noto Serif SC", "Source Han Serif SC", "STSong", serif;
  --font-mono: "JetBrains Mono", "SFMono-Regular", "Menlo", monospace;

  --text-xs: 12px;
  --text-sm: 14px;
  --text-md: 16px;
  --text-lg: 18px;
  --text-xl: 22px;
  --text-2xl: 28px;

  --leading-tight: 1.35;
  --leading-normal: 1.55;
  --leading-loose: 1.8;

  /* Motion */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasis: cubic-bezier(0.2, 0, 0, 1.1);
  --dur-fast: 120ms;
  --dur-normal: 200ms;
  --dur-slow: 320ms;

  /* Layer */
  --z-dropdown: 1000;
  --z-sticky: 1100;
  --z-modal: 1300;
  --z-toast: 1500;
}
```

## 4. 色彩使用规则
- 主色 `--primary` 仅用于关键 CTA（生成、发布、保存）。
- 强调色 `--secondary` 用于进度、章节高亮、轻提醒。
- 状态色只用于状态反馈，不用于主视觉背景。
- 页面配色比例：70% 中性色 + 20% 主色 + 10% 强调色。

## 5. 字体与排版
- 管理后台和创作台使用 `--font-ui`。
- 阅读正文使用 `--font-reading`。
- 代码、token、调试信息使用 `--font-mono`。
- 正文字号建议 `18px`，行高 `1.9`，每行 28-34 个汉字。
- 内容列最大宽度建议 `760px`，避免阅读疲劳。

## 6. 阴影、圆角与边框
- 小卡片：`--radius-sm` + `--shadow-xs`
- 常规卡片：`--radius-md` + `--shadow-sm`
- 弹窗抽屉：`--radius-lg` + `--shadow-lg`
- 焦点态统一 `--shadow-focus`
- 默认边框色 `--border`，分隔线使用 `--divider`

## 7. 核心组件规范

### 7.1 Button
- 尺寸：`36px`（常规）/`44px`（主操作）
- 圆角：`--radius-sm`
- 主按钮：`--primary` 背景 + `--text-inverse` 文字
- 次按钮：`--surface` 背景 + `--border` 边框 + `--text`
- 危险按钮：`--danger` 背景

### 7.2 Input / Select / Textarea
- 高度：输入与下拉 `40px`，文本域最小 `96px`
- 圆角：`--radius-sm`
- 边框：`1px solid var(--border)`
- focus：边框切 `--primary` + `--shadow-focus`

### 7.3 Card
- 背景：`--surface`
- 圆角：`--radius-md`
- 内边距：`24px`
- hover：阴影 `--shadow-xs` 升级到 `--shadow-sm`

### 7.4 Modal / Drawer
- 遮罩：`--overlay`
- 容器圆角：`--radius-lg`
- 容器阴影：`--shadow-lg`
- 头部、正文、底部按钮区要有明确分隔

### 7.5 Tag / Badge
- 高度：`24px`
- 圆角：`--radius-pill`
- 字号：`12px`
- 推荐场景：Agent 状态、章节状态、审核风险等级

### 7.6 Table / List
- 行高：`44px`
- 分割线：`--divider`
- hover 行背景：`--surface-3`

## 8. 状态与交互
- Hover：颜色加深 6%-10%，阴影升 1 级
- Active：再压深 8%，可加轻微缩放 `scale(0.99)`
- Focus：统一 focus ring，不移除 outline
- Disabled：透明度 `0.45`，禁用阴影与 hover
- Loading：保持按钮宽度稳定，显示 spinner + 原文案
- Skeleton：底色 `--surface-3`，1.2s 呼吸动画

## 9. 布局规范
- 页面最大宽度：`1200px`
- 桌面 gutter：`24px`
- 移动端 gutter：`16px`
- 桌面栅格：12 列
- 移动端栅格：4 列
- 间距仅允许使用 Space Token

## 10. 页面级建议

### 10.1 创作工作台
- 左侧章节导航：固定宽度，状态标签可视化
- 中间主编辑区：细纲/正文可切换
- 右侧辅助区：Agent 结果、上下文引用、一致性告警

### 10.2 阅读页
- 以正文为中心，减少非必要控件
- 顶部工具条可收起，避免阅读干扰
- 目录侧栏支持快速跳章与阅读进度显示

### 10.3 模型配置页
- Provider 卡片化展示
- API Key 显示脱敏状态
- 测试连接、默认模型、Agent 绑定在同页完成

## 11. 无障碍与可用性
- 文字与背景对比度不低于 4.5:1
- 大字号文本可放宽至 3:1
- 可点击区域不小于 `40x40px`
- 状态表达不能只靠颜色，需配图标或文案
- 键盘可操作主流程（创建、生成、发布）

## 12. 实施顺序（建议）
1. 先落全局 Token（`app.vue` 或全局样式）
2. 重构基础组件（Button/Input/Card/Tag）
3. 套用到创作工作台和阅读页
4. 最后统一微交互与动效时长

## 13. 验收清单
- 所有页面仅使用 Token，不出现硬编码颜色。
- 主操作颜色和状态颜色无冲突。
- 组件在桌面与移动端视觉一致、层级明确。
- 关键页面（创作、发布、阅读）均通过对比度检查。

