# 最简单的聊天功能实现文档

## 目标

- 在 `apps/web` 提供一个最简单的聊天窗口，支持 Markdown 展示与本地回复。
- 在 `apps/agents` 描述最小可行的聊天实现思路，为后续接入真实模型或 API 做准备。

## 架构概览

- 前端：`apps/web` 使用 React + TypeScript + Tailwind + react-markdown。
- 交互协议（最简）：前端在本地调用一个 `chat(prompt) -> reply` 函数，后续可替换为 HTTP API。

## 消息数据结构

- `Msg = { role: 'user' | 'assistant', content: string }`
- 前端维护 `messages: Msg[]`，发送时追加用户消息，收到回复后再追加助手消息。

## 最简实现

1. 本地函数 `mockChat(prompt: string): Promise<string>` 返回演示文本（复述输入）。
2. 发送流程：
   - 读取输入，追加到消息列表；
   - 调用 `mockChat` 获取回复；
   - 将回复以助手消息形式追加到列表。

对应前端位置：`apps/web/src/App.tsx`。

## 与真实后端对接（后续步骤）

- 将 `mockChat` 替换为：
  - HTTP 接口：`POST /api/chat`，请求体 `{ messages: Msg[] }` 或 `{ prompt: string }`；
  - 流式传输：使用 `ReadableStream`/SSE/WebSocket 渐进式渲染回复。
- 响应体最简：`{ content: string }`，必要时携带 `id`、`model`、`finish_reason` 等。

## 示例 API 设计（占位）

```
POST /api/chat
{
  "prompt": "你好"
}

200 OK
{
  "content": "你说：你好\n\n这是一个演示回复。"
}
```

## 扩展建议

- 消息持久化：本地缓存或后端存储会话。
- 角色系统：支持 system 指令与工具调用。
- Markdown 增强：代码高亮、表格、任务列表等。

## 关联代码位置

- 前端入口：`apps/web/src/main.tsx`
- 聊天界面：`apps/web/src/App.tsx`
- Tailwind 配置：`apps/web/tailwind.config.ts`
- 构建与开发脚本：根目录 `package.json`

> 下一步：我可以按你的指导接入真实模型或 API，并实现后端服务与流式回复。