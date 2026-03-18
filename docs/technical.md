# Agents Market 技术实现文档

## 1. 技术栈概览

| 层次               | 技术                     | 版本 |
| ------------------ | ------------------------ | ---- |
| **前端框架**       | React                    | 18.3 |
| **构建工具**       | Vite                     | 5.0  |
| **类型系统**       | TypeScript               | 5.6  |
| **样式框架**       | Tailwind CSS             | 3.4  |
| **AI SDK（前端）** | @ai-sdk/react            | 3.0  |
| **Markdown 渲染**  | react-markdown           | 9.0  |
| **后端运行时**     | Cloudflare Workers       | —    |
| **Workers 工具链** | Wrangler                 | 3.99 |
| **AI SDK（后端）** | Vercel AI SDK (ai)       | 6.0  |
| **AI Provider**    | @ai-sdk/openai           | 3.0  |
| **前端测试**       | Vitest + Testing Library | 2.1  |
| **后端测试**       | Jest + ts-jest           | 29.7 |

---

## 2. 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                      用户浏览器                           │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │               React SPA (Vite)                   │    │
│  │                                                  │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │    │
│  │  │ Agent    │  │   Chat   │  │ Agent Config  │  │    │
│  │  │ Sidebar  │  │ Window   │  │    Modal      │  │    │
│  │  └──────────┘  └──────────┘  └──────────────┘  │    │
│  │                                                  │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │        @ai-sdk/react (useChat)           │    │    │
│  │  │     DefaultChatTransport (SSE/fetch)     │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  │                                                  │    │
│  │  ┌──────────────────────────────────────────┐   │    │
│  │  │      localStorage (对话历史持久化)         │   │    │
│  │  └──────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP / SSE
                           │ POST /api/chat
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Cloudflare Workers (Edge Runtime)            │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │                   Router (index.ts)               │    │
│  │  GET /health · GET /healthcheck · GET /agents    │    │
│  │  POST /agents · GET /models · POST /chat         │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│  ┌───────────────────────▼─────────────────────────┐    │
│  │              API Handlers (api.ts)                │    │
│  │  handleAgents · handleModels · handleChat        │    │
│  │  handleCreateAgent · handleHealthcheck           │    │
│  └───────────────────────┬─────────────────────────┘    │
│                          │                               │
│  ┌───────────────────────▼─────────────────────────┐    │
│  │           Model Registry (registry.ts)           │    │
│  │    getModel(modelId) → AI SDK Model instance     │    │
│  └───────────────────────┬─────────────────────────┘    │
│                          │                               │
│  ┌───────────────────────▼─────────────────────────┐    │
│  │          Provider Factory (providers.ts)          │    │
│  │   getProviders(env) → { openai, volcengine }     │    │
│  └──────────┬──────────────────────────┬────────────┘    │
│             │                          │                  │
└─────────────┼──────────────────────────┼──────────────────┘
              │                          │
              ▼                          ▼
   ┌──────────────────┐      ┌───────────────────────┐
   │   OpenAI API     │      │   Volcengine API       │
   │  (gpt-4o, etc.)  │      │ (doubao, deepseek, etc)│
   └──────────────────┘      └───────────────────────┘
```

---

## 3. 目录结构说明

```
agents-market/
├── apps/
│   ├── web/                     # React 前端
│   │   └── src/
│   │       ├── App.tsx          # 主应用组件（含全部状态管理）
│   │       ├── components/      # 可复用 UI 组件（当前未接入 App.tsx）
│   │       │   ├── AgentList.tsx
│   │       │   ├── AgentConfigModal.tsx
│   │       │   ├── ChatWindow.tsx
│   │       │   ├── MessageInput.tsx
│   │       │   └── SettingsPanel.tsx
│   │       ├── hooks/           # 自定义 Hooks（当前未接入 App.tsx）
│   │       │   ├── useAgents.ts
│   │       │   ├── useConversations.ts
│   │       │   └── useSettings.ts
│   │       └── utils/
│   │           ├── storage.ts   # localStorage 工具函数
│   │           └── formatting.ts # 时间/文本格式化
│   │
│   └── backend/                 # Cloudflare Workers 后端
│       └── src/
│           ├── index.ts         # 路由入口
│           ├── api.ts           # 业务处理器
│           ├── types/chat.ts    # 请求/响应类型
│           ├── data/
│           │   ├── agents.ts    # Agent 数据管理（内存）
│           │   └── list.ts      # 模型目录（静态配置）
│           └── lib/ai/
│               ├── providers.ts # Provider 初始化工厂
│               └── registry.ts  # 模型注册表
```

---

## 4. 核心流程图

### 4.1 用户发送消息完整链路

```
用户输入文本
     │
     ▼
handleSubmit() [App.tsx]
     │ 校验：非空 & 已选 Agent & 非加载中
     ▼
sendMessage(text, { body: { modelId, systemPrompt, temperature } })
     │ @ai-sdk/react
     ▼
DefaultChatTransport
     │ POST /api/chat
     │ Content-Type: application/json
     │ Body: { messages: UIMessage[], modelId, systemPrompt, temperature }
     ▼
Cloudflare Worker: index.ts
     │ 路由匹配 POST /chat
     ▼
handleChat(request, env) [api.ts]
     │ 解析 Body
     │ 校验 messages & systemPrompt
     ▼
getModel(modelId, env) [registry.ts]
     │ 在 modelList 中查找配置
     │ 调用 getProviders(env) 获取对应 Provider
     ▼
streamText({ model, messages, system, temperature })
     │ Vercel AI SDK
     │ 调用对应 LLM API（OpenAI / Volcengine）
     ▼
toUIMessageStreamResponse()
     │ 转换为 SSE 流
     │ 响应头: x-vercel-ai-ui-message-stream: v1
     ▼
前端 DefaultChatTransport 接收 SSE
     │ 解析 UI message stream
     ▼
useChat → messages 状态更新
     │ React 重渲染
     ▼
ReactMarkdown 渲染消息内容（流式逐字显示）
```

### 4.2 Agent 创建流程

```
用户点击「新建」
     │
     ▼
openCreate() → isCreateOpen = true
     │
     ▼
用户填写表单（模型选择触发 applyModelDefaults()）
     │
     ▼
handleCreate() [App.tsx]
     │ 校验字段非空
     ▼
POST /api/agents
     │ Body: { name, modelId, systemPrompt, temperature }
     ▼
handleCreateAgent(request, env) [api.ts]
     │ 校验 modelId 存在于 modelList
     │ 生成 id（crypto.randomUUID）
     │ 存入内存数组 customAgents[]
     ▼
返回 201 + Agent 对象
     │
     ▼
前端重新 GET /api/agents 刷新列表
     │
     ▼
setSelectedAgentId(created.id)
     │
     ▼
加载新 Agent 对话历史（空）→ 进入对话
```

### 4.3 对话历史持久化流程

```
切换 Agent（selectedAgentId 变化）
     │
     ▼
useEffect → loadConversationHistory(agentId)
     │ 读取 localStorage['chat_history_{agentId}']
     │ 解析 JSON → UIMessage[]
     ▼
setMessages(history.messages || [])
     │
     ─────────────────────────────
     │ 用户发送/接收消息
     ▼
messages 状态变化
     │
     ▼
useEffect → saveConversationHistory(agentId, { messages, updatedAt })
     │ 序列化 JSON
     │ 写入 localStorage
     │ 超出 5MB 时 warn
     ▼
下次切换回此 Agent 时恢复
```

### 4.4 模型注册与 Provider 选择

```
getModel(modelId, env) [registry.ts]
     │
     ├─ 在 modelList 中查找 model
     │  └─ 未找到 → throw Error("Model not found")
     │
     ├─ model.provider === 'openai'
     │     │
     │     ▼
     │   providers.openai(model.modelId)
     │     │ createOpenAI({ apiKey: env.OPENAI_API_KEY })
     │     └─ 返回 OpenAI chat model instance
     │
     └─ model.provider === 'volcengine'
           │
           ▼
         providers.volcengine(endpointId)
           │ createOpenAI({
           │   apiKey: env.VOLCENGINE_API_KEY || env.VOLC_API_KEY,
           │   baseURL: env.VOLCENGINE_BASE_URL
           │ })
           │ endpointId = env[model.envKey]（如 ep-xxxx）
           └─ 返回 Volcengine chat model instance（OpenAI 兼容协议）
```

---

## 5. 数据模型

### 5.1 Agent

```typescript
type Agent = {
  id: string           // UUID（内置 Agent: modelId-derived，自定义: crypto.randomUUID()）
  name: string         // 显示名称
  modelId: string      // 对应模型目录中的 modelId
  systemPrompt: string // 系统提示词（角色定义）
  temperature: number  // 0~2，默认 0.7
}
```

### 5.2 对话消息（UIMessage）

由 Vercel AI SDK 的 `ai` 包定义，核心字段：

```typescript
type UIMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  parts: Array<
    | { type: 'text'; text: string }
    | { type: 'tool-call'; ... }
    | { type: 'tool-result'; ... }
  >
  createdAt?: string | number
}
```

### 5.3 模型目录项（ModelListItem）

```typescript
type ModelListItem = {
  id: number
  modelId: string            // 唯一标识，传给后端
  provider: 'openai' | 'volcengine'
  displayName: string
  summary: string
  recommendedFor: string[]
  capabilities: {
    streaming: boolean
    tools: boolean
    vision: boolean
    json: boolean
  }
  defaultAgent: {
    name: string
    systemPrompt: string
    temperature: number
  }
}
```

### 5.4 localStorage 存储结构

```
Key: chat_history_{agentId}
Value: JSON {
  messages: UIMessage[],
  updatedAt: number  // Unix timestamp ms
}

Key: custom_agents
Value: JSON Agent[]

Key: user_settings
Value: JSON { theme?: string, ... }
```

---

## 6. API 接口规范

### 基础信息

| 属性         | 值                                       |
| ------------ | ---------------------------------------- |
| 本地地址     | `http://localhost:3300/api`              |
| 生产地址     | `https://market-api.singulay.online/api` |
| Content-Type | `application/json`                       |
| 跨域         | 由 `CORS_ORIGIN` 环境变量控制            |

### 接口列表

| 方法 | 路径           | 描述                          |
| ---- | -------------- | ----------------------------- |
| GET  | `/health`      | 存活探针，返回 `{ ok: true }` |
| GET  | `/healthcheck` | 检查 Provider 配置状态        |
| GET  | `/agents`      | 获取 Agent 列表               |
| POST | `/agents`      | 创建自定义 Agent              |
| GET  | `/models`      | 获取模型目录                  |
| POST | `/chat`        | 流式对话（SSE）               |

### POST /chat 详细说明

**请求体：**

```json
{
  "messages": [UIMessage],
  "modelId": "doubao-pro-32k",
  "systemPrompt": "你是一个...",
  "temperature": 0.7
}
```

**响应：**

- `200 text/event-stream`，响应头包含 `x-vercel-ai-ui-message-stream: v1`
- 错误：`400 | 404 | 500` JSON `{ "error": "..." }`

**Seedream 模型特殊处理：**
发送对话请求给图像生成模型时，返回一条文字消息说明该模型不支持对话，而非报错。

---

## 7. 环境变量配置

| 变量名                                 | 用途                       | 必填                      |
| -------------------------------------- | -------------------------- | ------------------------- |
| `VOLCENGINE_API_KEY` 或 `VOLC_API_KEY` | 火山引擎 API 密钥          | 二选一                    |
| `VOLCENGINE_BASE_URL`                  | 火山方舟 API 地址          | 否（有默认值）            |
| `VOLCENGINE_MODEL_DOUBAO_PRO`          | 豆包 Pro 的 Endpoint ID    | 按需                      |
| `VOLCENGINE_MODEL_DEEPSEEK_R1`         | DeepSeek R1 的 Endpoint ID | 按需                      |
| `VOLCENGINE_MODEL_DEEPSEEK_V3`         | DeepSeek V3 的 Endpoint ID | 按需                      |
| `VOLCENGINE_MODEL_DOUBAO_SEEDREAM`     | Seedream 的 Endpoint ID    | 按需                      |
| `OPENAI_API_KEY`                       | OpenAI API 密钥            | 二选一                    |
| `OPENAI_MODEL_ID`                      | OpenAI 默认模型            | 否（默认 gpt-4o-mini）    |
| `CORS_ORIGIN`                          | 允许的前端域名             | 否（默认 localhost:5173） |
| `VITE_BACKEND_CHAT_API`                | 前端覆盖后端地址           | 否                        |

**本地开发：** 配置 `apps/backend/.dev.vars`（Wrangler 自动读取，不提交到 Git）
**生产部署：** 使用 `wrangler secret put <KEY>` 或 Cloudflare Dashboard

---

## 8. 前端代理配置

开发时 Vite 将 `/api/*` 代理到 `http://localhost:3300`：

```typescript
// apps/web/vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3300',
      changeOrigin: true,
    }
  }
}
```

生产构建时前端通过 `VITE_BACKEND_CHAT_API` 环境变量指向真实 API 地址。

---

## 9. 部署架构

```
                     ┌─────────────────────┐
                     │  静态文件托管（CDN） │
                     │  Vite build → dist/  │
                     │  singulay.online     │
                     └──────────┬──────────┘
                                │ 用户访问
                                ▼
                     ┌─────────────────────┐
                     │  Cloudflare Workers  │
                     │  market-api.singulay │
                     │  .online             │
                     │                     │
                     │  wrangler.toml:      │
                     │  pattern = market-  │
                     │  api.singulay.online │
                     └──────────┬──────────┘
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
   ┌───────────────────┐             ┌──────────────────────┐
   │   OpenAI API      │             │   Volcengine API      │
   │   api.openai.com  │             │ ark.cn-beijing.volces │
   │                   │             │ .com/api/v3           │
   └───────────────────┘             └──────────────────────┘
```

---

## 10. 技术决策说明

### 为什么选择 Cloudflare Workers？

- **边缘计算**：低延迟，全球节点分布
- **无服务器**：无需维护服务器，按需付费
- **Node.js 兼容**：通过 `nodejs_compat` 标志支持 Node API
- **原生流支持**：支持 SSE 流式响应

### 为什么使用 Vercel AI SDK？

- **统一接口**：屏蔽不同 LLM Provider 的 API 差异
- **流式支持**：内置 SSE / UI message stream 处理
- **UI 绑定**：`@ai-sdk/react` 的 `useChat` 直接绑定 React 状态
- **OpenAI 兼容**：火山引擎兼容 OpenAI 协议，可复用 `@ai-sdk/openai`

### 为什么 Agent 存储在内存中（后端）？

当前后端在 Worker 中用内存数组存储自定义 Agent，每次重部署后清空。
这是 MVP 阶段的简化实现，后续计划迁移到 KV Storage 或数据库持久化。

### 前端组件与 App.tsx 的关系

`src/components/` 目录下有功能更丰富的组件（搜索、编辑、克隆等），
但当前 `App.tsx` 采用了内联实现。两套代码并存是历史原因，
后续重构时应将 `App.tsx` 迁移到使用组件化架构。
