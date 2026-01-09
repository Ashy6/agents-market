import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Agent, AgentListResponse, CustomAgentConfig } from '../types'
import { loadCustomAgents, getAllConversationTimestamps } from '../utils/storage'

export function useAgents(backendApiUrl: string) {
  const [backendAgents, setBackendAgents] = useState<Agent[]>([])
  const [customAgents, setCustomAgents] = useState<CustomAgentConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conversationTimestamps, setConversationTimestamps] = useState<Record<string, number>>({})

  // Load backend agents from API
  useEffect(() => {
    const loadAgents = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Derive agents API URL from chat API URL
        const agentsApi = backendApiUrl.replace('/chat', '/agents')
        const response = await fetch(agentsApi)

        if (!response.ok) {
          throw new Error(`Failed to load agents: ${response.statusText}`)
        }

        const data: AgentListResponse = await response.json()
        setBackendAgents(data.items)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        console.error('Failed to load agents:', err)
      } finally {
        setIsLoading(false)
      }
    }

    void loadAgents()
  }, [backendApiUrl])

  // Load custom agents from localStorage
  useEffect(() => {
    const custom = loadCustomAgents()
    setCustomAgents(custom.map(a => ({ ...a, isCustom: true as const })))
  }, [])

  // Load conversation timestamps
  useEffect(() => {
    const timestamps = getAllConversationTimestamps()
    setConversationTimestamps(timestamps)
  }, [])

  // Reload custom agents (called after saving a custom agent)
  const reloadCustomAgents = useCallback(() => {
    const custom = loadCustomAgents()
    setCustomAgents(custom.map(a => ({ ...a, isCustom: true as const })))
  }, [])

  // Reload conversation timestamps (called after a conversation update)
  const reloadTimestamps = useCallback(() => {
    const timestamps = getAllConversationTimestamps()
    setConversationTimestamps(timestamps)
  }, [])

  // Combine and sort agents
  const allAgents = useMemo(() => {
    const combined: Agent[] = [...backendAgents, ...customAgents]

    // Sort by provider (Volcengine first) then by custom status (backend first)
    return combined.sort((a, b) => {
      // Check if volcengine/doubao model
      const aIsVolcengine = a.modelId.startsWith('doubao')
      const bIsVolcengine = b.modelId.startsWith('doubao')

      if (aIsVolcengine && !bIsVolcengine) return -1
      if (!aIsVolcengine && bIsVolcengine) return 1

      // Within same provider, backend agents come first
      const aIsCustom = 'isCustom' in a && a.isCustom
      const bIsCustom = 'isCustom' in b && b.isCustom

      if (!aIsCustom && bIsCustom) return -1
      if (aIsCustom && !bIsCustom) return 1

      // Same type, sort by name
      return a.name.localeCompare(b.name, 'zh-CN')
    })
  }, [backendAgents, customAgents])

  // Get agent by ID
  const getAgentById = (id: string): Agent | undefined => {
    return allAgents.find((agent) => agent.id === id)
  }

  // Get last conversation time for an agent
  const getAgentLastUpdate = (agentId: string): number => {
    return conversationTimestamps[agentId] || 0
  }

  return {
    agents: allAgents,
    isLoading,
    error,
    reloadCustomAgents,
    reloadTimestamps,
    getAgentById,
    getAgentLastUpdate,
  }
}
