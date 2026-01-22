import React, { useEffect, useMemo, useState } from 'react'
import { Chat as AIChat, useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import ReactMarkdown from 'react-markdown'
import {
  loadConversationHistory,
  saveConversationHistory,
  deleteConversationHistory
} from './utils/storage'

type Agent = {
  id: string
  modelId: string
  name: string
  systemPrompt: string
  temperature: number
}

type AgentListResponse = {
  items: Agent[]
}

function App() {
  const backendApiUrl = import.meta.env?.VITE_BACKEND_CHAT_API || '/api/chat'

  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [input, setInput] = useState('')

  // Initialize chat
  const chat = useMemo(() => {
    return new AIChat<UIMessage>({
      transport: new DefaultChatTransport({ api: backendApiUrl }),
      messages: [],
    })
  }, [backendApiUrl])

  const { messages, setMessages, sendMessage, status } = useChat({ chat })
  const isLoading = status === 'submitted' || status === 'streaming'

  // Load agents from backend
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const agentsApi = backendApiUrl.replace('/chat', '/agents')
        const response = await fetch(agentsApi)
        if (!response.ok) throw new Error('Failed to load agents')
        const data: AgentListResponse = await response.json()
        setAgents(data.items)

        // Auto-select first doubao agent
        const doubaoAgent = data.items.find((a) => a.modelId.startsWith('doubao'))
        setSelectedAgentId(doubaoAgent?.id || data.items[0]?.id || null)
      } catch (error) {
        console.error('Failed to load agents:', error)
      }
    }
    void loadAgents()
  }, [backendApiUrl])

  // Load conversation history when switching agents
  useEffect(() => {
    if (selectedAgentId) {
      const history = loadConversationHistory(selectedAgentId)
      setMessages(history.messages || [])
    }
  }, [selectedAgentId, setMessages])

  // Save messages to localStorage
  useEffect(() => {
    if (selectedAgentId && messages.length > 0) {
      saveConversationHistory(selectedAgentId, {
        messages,
        updatedAt: Date.now(),
      })
    }
  }, [messages, selectedAgentId])

  // Handle send message
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading || !selectedAgentId) return

    const modelId = agents.find((a) => a.id === selectedAgentId)?.modelId
    if (!modelId) return

    setInput('')
    void sendMessage({ text }, { body: { modelId } })
  }

  // Handle clear conversation
  const handleClear = () => {
    if (selectedAgentId) {
      deleteConversationHistory(selectedAgentId)
      setMessages([])
    }
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId)

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 border-b bg-white">
        <h1 className="text-lg font-semibold">AI Chat</h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Agent List Sidebar */}
        <aside className="w-80 border-r bg-white overflow-y-auto">
          <div className="p-4 border-b">
            <h2 className="font-semibold">可用 Agents</h2>
          </div>
          <div className="p-2 space-y-1">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  agent.id === selectedAgentId
                    ? 'bg-blue-50 border-l-4 border-blue-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-sm">{agent.name}</div>
                <div className="text-xs text-gray-500">{agent.modelId}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <main className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <div className="text-lg font-medium mb-2">
                    {selectedAgent?.name || '选择一个 Agent 开始对话'}
                  </div>
                  <div className="text-sm">
                    {selectedAgent?.systemPrompt || '从左侧选择一个 agent'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[75%] ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <ReactMarkdown>
                        {message.parts
                          .filter((p) => p.type === 'text')
                          .map((p: any) => p.text)
                          .join('')}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Input Area */}
          <footer className="border-t bg-white p-4">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
              <span>当前 Agent: {selectedAgent?.name || '未选择'}</span>
              <button
                onClick={handleClear}
                className="ml-auto text-blue-600 hover:text-blue-800"
              >
                新对话
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入消息，支持 Markdown"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isLoading ? '发送中...' : '发送'}
              </button>
            </form>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default App
