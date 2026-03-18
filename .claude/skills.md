# Agents Market — Claude 开发行为准则

本文档规范 Claude 在此项目中的开发行为，确保代码风格、架构决策和修改方式与项目保持一致。

---

## 1. 技术栈约束

### 前端

- 使用 **React + TypeScript**，严格模式（`strict: true`）
- 样式使用 **Tailwind CSS utility classes**，不引入额外 CSS 文件
- 不引入新的 UI 组件库（如 shadcn、MUI、Ant Design），保持轻量
- Markdown 渲染使用已安装的 `react-markdown`，不另行安装
- AI 交互使用 `@ai-sdk/react` 的 `useChat`，不绕过它直接 fetch

### 后端

- 运行时是 **Cloudflare Workers**，不使用 Node.js 独有 API（除非有 `nodejs_compat` 支持）
- LLM 调用统一通过 **Vercel AI SDK**（`streamText`, `generateText`）
- 新增模型在 `apps/backend/src/data/list.ts` 中追加，不散落在其他文件
- 新增 Provider 在 `apps/backend/src/lib/ai/providers.ts` 中注册

---

## 2. 代码风格规范

### TypeScript

- 所有函数参数和返回值必须有类型标注（推断除外）
- 优先使用 `type` 而非 `interface`（项目已有先例）
- 不使用 `any`，需要宽泛类型时用 `unknown` + 类型守卫
- 异步函数中的 Promise 要么 `await` 要么加 `void` 操作符（避免 `floating promise`）

### React

- 使用函数组件 + Hooks，不使用 Class 组件
- 组件文件名使用 **PascalCase**（如 `AgentList.tsx`）
- 自定义 Hook 文件名使用 **camelCase**，以 `use` 开头（如 `useAgents.ts`）
- 状态提升遵循最小化原则，只在需要共享时提升
- `useEffect` 依赖数组必须完整，不忽略 lint 警告

### 命名

- 变量/函数：camelCase
- 组件/类型：PascalCase
- 常量：UPPER_SNAKE_CASE（仅全局配置常量）
- 文件：与导出的主体同名

---

## 3. 修改范围约束

### 读先于写

- 修改任何文件前，必须先读取该文件的完整内容
- 涉及多个文件的改动，先全部读取再动手

### 最小化改动

- 只修改与需求直接相关的代码
- 不顺带重构、不加无关注释、不调整无关格式
- Bug 修复不附带功能改进

### App.tsx 的特殊说明

`App.tsx` 目前是 monolithic 实现。`src/components/` 和 `src/hooks/` 下有更完整的组件，
但两者当前**并不互通**。修改时注意：

- 如果是小改动，直接改 `App.tsx`
- 如果是重大功能，优先考虑通过组件化实现，但不要在同一个 PR 中同时做功能和重构

---

## 4. 后端开发规范

### 路由修改

新增路由在 `apps/backend/src/index.ts` 的路由表中追加，
对应的处理函数放在 `apps/backend/src/api.ts`。

### CORS

所有响应必须通过 `getCorsHeaders(env)` 添加 CORS 头，
OPTIONS preflight 请求直接返回 204。

### 错误响应格式

```typescript
// 统一格式
return new Response(JSON.stringify({ error: '错误描述' }), {
  status: 400, // 或 404、500
  headers: { 'Content-Type': 'application/json', ...corsHeaders }
})
```

### 环境变量访问

所有环境变量通过 `env` 参数传入，不使用全局变量。
新增环境变量必须同时更新：

- `apps/backend/.dev.vars.example`
- `apps/backend/.dev.vars.md`

---

## 5. 新增模型流程

1. 在 `apps/backend/src/data/list.ts` 的 `modelList` 数组中追加条目
2. 如果是新 Provider，在 `apps/backend/src/lib/ai/providers.ts` 中注册
3. 在 `apps/backend/src/lib/ai/registry.ts` 中添加 modelId 匹配逻辑
4. 在 `.dev.vars.example` 和 `.dev.vars.md` 中添加对应环境变量说明
5. 在 `docs/requirements.md` 的模型支持表格中更新

---

## 6. 测试规范

- 修改业务逻辑后，检查是否需要更新或新增测试
- 前端测试在 `apps/web/src/App.test.tsx`，使用 Vitest + React Testing Library
- 后端测试在 `apps/backend/src/index.test.ts`，使用 Jest
- 运行测试：`npm test`（根目录）或分别运行子包

---

## 7. 文档同步

以下情况需要同步更新文档：

| 变更类型           | 需更新的文档                                                      |
| ------------------ | ----------------------------------------------------------------- |
| 新增 API 接口      | `apps/backend/src/docs/API.md`、`apps/web/API.md`                 |
| 新增环境变量       | `.dev.vars.example`、`.dev.vars.md`、`README.md`                  |
| 新增功能           | `docs/requirements.md`（功能列表）、`.claude/plan.md`（状态更新） |
| 技术架构变更       | `docs/technical.md`                                               |
| 完成 plan 中的条目 | `.claude/plan.md`（标记为已完成）                                 |

---

## 8. 禁止事项

- **不** 在前端硬编码 API Key 或敏感信息
- **不** 提交 `.dev.vars` 文件（已在 .gitignore 中）
- **不** 在 Worker 中使用 `console.log` 记录敏感数据
- **不** 修改 `wrangler.toml` 中的 `routes`（生产域名配置）
- **不** 删除 `apps/web/src/components/` 下的组件文件（即使当前未使用）
- **不** 强制 push 到主分支
