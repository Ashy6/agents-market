import type { UIMessage } from 'ai'

export interface AgentListItem {
  id: string
  modelId: string
  name: string
  systemPrompt: string
  temperature: number
}

export interface CustomAgentConfig {
  id: string
  baseAgentId?: string
  name: string
  modelId: string
  systemPrompt: string
  temperature: number
  maxTokens?: number
  createdAt: number
  updatedAt: number
  isCustom: true
}

export type Agent = AgentListItem | CustomAgentConfig

export interface AgentListResponse {
  items: AgentListItem[]
}

export interface HealthcheckResponse {
  status: 'ok' | 'error'
  providers: {
    volcengine: {
      configured: boolean
      models: string[]
    }
    openai: {
      configured: boolean
      models: string[]
    }
  }
  timestamp: string
}

export interface ChatError {
  error: string
  message: string
  provider?: string
  details?: unknown
}

export interface ConversationHistory {
  messages: UIMessage[]
  updatedAt: number
}

export interface UserSettings {
  openaiApiKey?: string
  defaultModelId?: string
  theme?: 'light' | 'dark'
}

export function isCustomAgent(agent: Agent): agent is CustomAgentConfig {
  return 'isCustom' in agent && agent.isCustom === true
}
