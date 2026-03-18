# CLAUDE.md — Agents Market

本文件由 Claude 自动加载，包含项目上下文和开发规范。

## 项目简介

**Agents Market** 是一个前后端分离的多 Agent AI 对话应用：

- **前端**：React + Vite + TypeScript + Tailwind CSS，部署为静态站点
- **后端**：Cloudflare Workers + Vercel AI SDK，部署到 `market-api.singulay.online`
- **AI 提供商**：火山引擎（豆包/DeepSeek）和 OpenAI，均通过 Vercel AI SDK 统一调用

## 快速导航

| 文档     | 路径                                                         | 说明                         |
| -------- | ------------------------------------------------------------ | ---------------------------- |
| 需求文档 | [docs/requirements.md](docs/requirements.md)                 | 产品功能需求、界面规范       |
| 技术文档 | [docs/technical.md](docs/technical.md)                       | 架构图、数据流、API 规范     |
| 开发计划 | [.claude/plan.md](.claude/plan.md)                           | 已完成和待完成功能列表       |
| 开发准则 | [.claude/skills.md](.claude/skills.md)                       | 代码规范、修改约束、禁止事项 |
| 后端 API | [apps/backend/src/docs/API.md](apps/backend/src/docs/API.md) | 完整 API 参考                |
| 环境变量 | [apps/backend/.dev.vars.md](apps/backend/.dev.vars.md)       | 环境变量配置说明             |

## 关键文件

| 文件                                   | 用途                             |
| -------------------------------------- | -------------------------------- |
| `apps/web/src/App.tsx`                 | 前端主组件（含全部状态管理逻辑） |
| `apps/backend/src/index.ts`            | Worker 路由入口                  |
| `apps/backend/src/api.ts`              | 所有 API 处理函数                |
| `apps/backend/src/data/list.ts`        | 模型目录（新增模型在此）         |
| `apps/backend/src/lib/ai/providers.ts` | Provider 初始化                  |
| `apps/backend/src/lib/ai/registry.ts`  | 模型注册表                       |

## 本地启动

```bash
npm install              # 安装依赖
npm run dev:backend      # 启动后端（localhost:3300）
npm run dev:web          # 启动前端（localhost:5173）
npm test                 # 运行所有测试
```

> 开始前需在 `apps/backend/.dev.vars` 中配置 API Key，参考 `.dev.vars.example`。

## 开发规范摘要

> 完整规范见 [.claude/skills.md](.claude/skills.md)

1. **修改前必须读文件** — 不猜测，先阅读
2. **最小化改动** — 只改需求相关代码，不附带重构
3. **App.tsx 是 monolithic 的** — 小改直接改它，大功能考虑组件化
4. **新增模型** — 只需改 `data/list.ts` + `providers.ts` + `registry.ts`
5. **不提交 `.dev.vars`** — 含密钥，已在 .gitignore 中
6. **完成功能后更新 plan.md** — 标记对应条目为已完成
7. 每次提需求后 -> 同步更新需求文档
8. 完成大功能后 -> 同步更新 readme
