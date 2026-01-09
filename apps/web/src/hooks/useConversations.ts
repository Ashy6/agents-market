import { useState, useEffect, useCallback } from 'react'
import type { UIMessage } from 'ai'
import {
  loadConversationHistory,
  saveConversationHistory,
  deleteConversationHistory,
} from '../utils/storage'

export function useConversations(agentId: string) {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load conversation history when agentId changes
  useEffect(() => {
    setIsLoading(true)
    const history = loadConversationHistory(agentId)
    setMessages(history.messages || [])
    setIsLoading(false)
  }, [agentId])

  // Save a new message to history
  const addMessage = useCallback(
    (message: UIMessage) => {
      setMessages((prev) => {
        const updated = [...prev, message]
        saveConversationHistory(agentId, {
          messages: updated,
          updatedAt: Date.now(),
        })
        return updated
      })
    },
    [agentId]
  )

  // Update messages array (used when receiving streaming responses)
  const setAndSaveMessages = useCallback(
    (newMessages: UIMessage[]) => {
      // Use the messages from the argument directly to avoid stale closure
      setMessages(newMessages)
      // Use setTimeout to defer saving to avoid infinite loops
      setTimeout(() => {
        saveConversationHistory(agentId, {
          messages: newMessages,
          updatedAt: Date.now(),
        })
      }, 0)
    },
    [agentId]
  )

  // Clear conversation history
  const clearHistory = useCallback(() => {
    setMessages([])
    deleteConversationHistory(agentId)
  }, [agentId])

  // Delete a specific message
  const deleteMessage = useCallback(
    (messageId: string) => {
      setMessages((prev) => {
        const updated = prev.filter((msg) => msg.id !== messageId)
        saveConversationHistory(agentId, {
          messages: updated,
          updatedAt: Date.now(),
        })
        return updated
      })
    },
    [agentId]
  )

  return {
    messages,
    isLoading,
    addMessage,
    setMessages: setAndSaveMessages,
    clearHistory,
    deleteMessage,
  }
}
