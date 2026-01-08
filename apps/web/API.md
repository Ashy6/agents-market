# Web 调用后端 API 示例

前端使用 AI SDK 的 `DefaultChatTransport` 对接后端 `/api/chat`。

## 配置后端地址

在 Vite 环境变量里设置：

```
VITE_BACKEND_CHAT_API=https://market-api.singulay.online/api/chat
```

## 代码示例

```ts
import { Chat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'

const chat = new Chat<UIMessage>({
  transport: new DefaultChatTransport({
    api: import.meta.env.VITE_BACKEND_CHAT_API,
  }),
  messages: [],
})
```

## 请求体类型（简化）

```ts
import type { UIMessage } from 'ai'

export type ModelProvider = 'openai' | 'volcengine'

export type ChatRequestBody = {
  messages: UIMessage[]
  data?: {
    provider?: ModelProvider
    modelId?: string
    systemPrompt?: string
  }
}
```
