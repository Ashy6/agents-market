# Agents Market — 开发计划

## 已完成功能

### 核心对话功能

- [x] 基于 Vercel AI SDK 的流式对话（SSE）
- [x] 消息 Markdown 渲染（react-markdown）
- [x] 对话历史本地持久化（localStorage，按 agentId 隔离）
- [x] 自动清理 30 天前的历史记录
- [x] 切换 Agent 自动加载/保存对应历史
- [x] 新对话（清空当前会话）
- [x] 发送中加载状态（三点动画）

### Agent 管理

- [x] 内置 Agent 列表（从后端加载）
- [x] 自定义 Agent 创建（名称、模型、系统提示词、温度）
- [x] 选择模型时自动填充默认配置
- [x] 表单校验与错误提示

### 模型支持

- [x] 豆包 Pro 32k（火山引擎）
- [x] DeepSeek R1（火山引擎）
- [x] DeepSeek V3（火山引擎）
- [x] 豆包 Seedream（图像生成，对话时返回提示说明）
- [x] GPT-4o（OpenAI）
- [x] GPT-4o mini（OpenAI）

### 后端 API

- [x] GET /api/health — 存活探针
- [x] GET /api/healthcheck — Provider 配置状态检查
- [x] GET /api/agents — 获取 Agent 列表
- [x] POST /api/agents — 创建自定义 Agent
- [x] GET /api/models — 获取模型目录
- [x] POST /api/chat — 流式对话
- [x] CORS 配置（支持多域名白名单）

### 部署

- [x] Cloudflare Workers 部署（market-api.singulay.online）
- [x] Vite 生产构建配置
- [x] 环境变量管理文档（.dev.vars.md）
- [x] 轻量 API Client SDK（src/docs/api.ts）

### 测试

- [x] 前端单元测试（Vitest）
- [x] 后端单元测试（Jest）

---

## 进行中 / 待完成功能

### P0 — 核心体验

- [x] **移动端响应式适配**
  当前布局为桌面优先（固定 w-320px 侧边栏），移动端体验极差。
  需要实现：
  - 汉堡菜单控制侧边栏显示/隐藏
  - 移动端侧边栏以 overlay 形式覆盖（遮罩层 + 滑入动画）
  - 点击遮罩/选择 Agent 后自动关闭侧边栏
  - 消息区域全屏，输入区自适应
  - 消息气泡 max-width 从 75% 调整为 90%（移动端更合适）
  - 弹窗（创建 Agent）移动端全屏或接近全屏
  - **状态：✅ 已完成（2026-03）**

- [ ] **Agent 后端持久化**
  自定义 Agent 当前仅存储在 Worker 内存，重部署后丢失。
  需要迁移到 Cloudflare KV 或 D1 数据库。

### P1 — 功能完善

- [ ] **编辑 Agent**
  支持修改已有 Agent 的名称、模型、系统提示词、温度。
  组件 `AgentConfigModal.tsx` 已存在但未与主 App 连接。

- [ ] **克隆 Agent**
  以现有 Agent 为模板创建新 Agent，组件 `AgentList.tsx` 中已有 UI 入口。

- [ ] **删除 Agent**
  删除自定义 Agent 及其对话历史。

- [ ] **搜索 Agent**
  `AgentList.tsx` 中已实现搜索逻辑，但未接入 `App.tsx`。

- [ ] **组件化重构**
  `App.tsx` 当前为 monolithic 实现，`src/components/` 下已有拆分好的组件，
  需要将 App.tsx 迁移到使用 AgentList、ChatWindow、MessageInput 等组件。

- [ ] **重新生成消息**
  `ChatWindow.tsx` 有 UI 入口，需要在 App 层实现重新生成逻辑。

- [ ] **删除消息**
  `ChatWindow.tsx` 有 UI 入口，需要在 App 层实现删除逻辑。

- [ ] **多轮对话 Token 统计**
  展示当前对话消耗的 Token 数量。

### P2 — 扩展能力

- [ ] **深色模式**
  `SettingsPanel.tsx` 已存在，需要实现主题切换逻辑。

- [ ] **对话导出**
  支持导出为 Markdown 或 PDF 格式。

- [ ] **图片生成能力（Seedream）**
  Seedream 模型支持图片生成，目前仅返回提示说明，
  后续可实现真正的图片生成并展示图片。

- [ ] **Function Calling 可视化**
  当模型调用工具时，在 UI 中展示工具调用详情。

- [ ] **Agent 云端同步与分享**
  支持分享自定义 Agent 配置（分享链接或导入/导出 JSON）。

- [ ] **用户认证**
  多账户支持，用户数据隔离。

- [ ] **国际化（i18n）**
  支持英文界面。

---

## 技术债务

- [ ] 将 `App.tsx` 内联逻辑迁移到 `src/components/` 和 `src/hooks/`
- [ ] `apps/agents/` workspace 暂无内容，评估是否需要或清理
- [ ] 后端 `src/ai/models.ts` 是遗留文件，评估是否可删除
- [ ] 测试覆盖率不足，需补充集成测试
