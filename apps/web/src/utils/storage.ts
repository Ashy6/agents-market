import type { UIMessage } from 'ai'

const STORAGE_KEY_PREFIX = 'agents-market-conversation-'
const CUSTOM_AGENTS_KEY = 'agents-market-custom-agents'
const SETTINGS_KEY = 'agents-market-settings'

export interface ConversationHistory {
  messages: UIMessage[]
  updatedAt: number
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
}

export interface UserSettings {
  openaiApiKey?: string
  defaultModelId?: string
  theme?: 'light' | 'dark'
}

// Conversation History Functions
export function saveConversationHistory(
  agentId: string,
  history: ConversationHistory
): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${agentId}`
    localStorage.setItem(key, JSON.stringify(history))
  } catch (error) {
    console.error('Failed to save conversation:', error)
    // If localStorage is full, cleanup old conversations
    cleanupOldConversations()
    // Try again after cleanup
    try {
      const key = `${STORAGE_KEY_PREFIX}${agentId}`
      localStorage.setItem(key, JSON.stringify(history))
    } catch (retryError) {
      console.error('Failed to save conversation after cleanup:', retryError)
    }
  }
}

export function loadConversationHistory(
  agentId: string
): ConversationHistory {
  try {
    const key = `${STORAGE_KEY_PREFIX}${agentId}`
    const data = localStorage.getItem(key)
    if (!data) return { messages: [], updatedAt: Date.now() }
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load conversation:', error)
    return { messages: [], updatedAt: Date.now() }
  }
}

export function deleteConversationHistory(agentId: string): void {
  const key = `${STORAGE_KEY_PREFIX}${agentId}`
  localStorage.removeItem(key)
}

export function getAllConversationTimestamps(): Record<string, number> {
  const timestamps: Record<string, number> = {}

  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_KEY_PREFIX))
      .forEach(key => {
        const agentId = key.replace(STORAGE_KEY_PREFIX, '')
        try {
          const history = JSON.parse(localStorage.getItem(key) || '{}')
          timestamps[agentId] = history.updatedAt || 0
        } catch (error) {
          console.error(`Failed to parse conversation for ${agentId}:`, error)
        }
      })
  } catch (error) {
    console.error('Failed to get conversation timestamps:', error)
  }

  return timestamps
}

export function cleanupOldConversations(): void {
  // Delete conversations older than 30 days
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  const now = Date.now()

  try {
    const keysToDelete: string[] = []

    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_KEY_PREFIX))
      .forEach(key => {
        try {
          const history = JSON.parse(localStorage.getItem(key) || '{}')
          if (now - history.updatedAt > THIRTY_DAYS) {
            keysToDelete.push(key)
          }
        } catch (error) {
          // If we can't parse it, it's corrupted, so delete it
          keysToDelete.push(key)
        }
      })

    keysToDelete.forEach(key => localStorage.removeItem(key))

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} old conversations`)
    }
  } catch (error) {
    console.error('Failed to cleanup old conversations:', error)
  }
}

// Custom Agents Functions
export function saveCustomAgents(agents: CustomAgentConfig[]): void {
  try {
    localStorage.setItem(CUSTOM_AGENTS_KEY, JSON.stringify(agents))
  } catch (error) {
    console.error('Failed to save custom agents:', error)
  }
}

export function loadCustomAgents(): CustomAgentConfig[] {
  try {
    const data = localStorage.getItem(CUSTOM_AGENTS_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load custom agents:', error)
    return []
  }
}

export function saveCustomAgent(agent: CustomAgentConfig): void {
  const agents = loadCustomAgents()
  const existingIndex = agents.findIndex(a => a.id === agent.id)

  if (existingIndex >= 0) {
    agents[existingIndex] = agent
  } else {
    agents.push(agent)
  }

  saveCustomAgents(agents)
}

export function deleteCustomAgent(agentId: string): void {
  const agents = loadCustomAgents()
  const filtered = agents.filter(a => a.id !== agentId)
  saveCustomAgents(filtered)
}

// Settings Functions
export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

export function loadSettings(): UserSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY)
    if (!data) return {}
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load settings:', error)
    return {}
  }
}

export function updateSettings(updates: Partial<UserSettings>): void {
  const current = loadSettings()
  const updated = { ...current, ...updates }
  saveSettings(updated)
}

// Storage Usage Functions
export function getStorageUsage(): { used: number; total: number; percentage: number } {
  let used = 0

  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length
      }
    }
  } catch (error) {
    console.error('Failed to calculate storage usage:', error)
  }

  // Most browsers limit localStorage to ~5-10MB (we'll use 5MB as conservative estimate)
  const total = 5 * 1024 * 1024 // 5MB in bytes
  const percentage = Math.round((used / total) * 100)

  return { used, total, percentage }
}
