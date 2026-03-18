import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

type ModelCapabilities = {
  streaming: boolean
  tools: boolean
  vision: boolean
  json: boolean
}

type ModelListItem = {
  id: number
  modelId: string
  provider: 'openai' | 'volcengine'
  displayName: string
  summary: string
  recommendedFor: readonly string[]
  capabilities: ModelCapabilities
  defaultAgent: {
    name: string
    systemPrompt: string
    temperature: number
  }
}

type ModelListResponse = {
  items: ModelListItem[]
}

function App() {
  const backendApiUrl = import.meta.env?.VITE_BACKEND_CHAT_API || '/api/chat'

  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [models, setModels] = useState<ModelListItem[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createModelId, setCreateModelId] = useState('')
  const [createSystemPrompt, setCreateSystemPrompt] = useState('')
  const [createTemperature, setCreateTemperature] = useState(0.7)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isEditorExpanded, setIsEditorExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [recommendQuery, setRecommendQuery] = useState('')
  const [isRecommending, setIsRecommending] = useState(false)
  const [recommendations, setRecommendations] = useState<Array<{ agent: Agent; score: number }>>([])

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

        setSelectedAgentId(data.items[0]?.id || null)
      } catch (error) {
        console.error('Failed to load agents:', error)
      }
    }
    void loadAgents()
  }, [backendApiUrl])

  // Load models from backend
  useEffect(() => {
    const loadModels = async () => {
      try {
        const modelsApi = backendApiUrl.replace('/chat', '/models')
        const response = await fetch(modelsApi)
        if (!response.ok) throw new Error('Failed to load models')
        const data: ModelListResponse = await response.json()
        setModels(data.items)
      } catch (error) {
        console.error('Failed to load models:', error)
      }
    }
    void loadModels()
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

    const agent = agents.find((a) => a.id === selectedAgentId)
    if (!agent) return

    setInput('')
    void sendMessage(
      { text },
      {
        body: {
          modelId: agent.modelId,
          systemPrompt: agent.systemPrompt,
          temperature: agent.temperature,
        },
      }
    )
  }

  // Handle clear conversation
  const handleClear = () => {
    if (selectedAgentId) {
      deleteConversationHistory(selectedAgentId)
      setMessages([])
    }
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId)
  const selectedCreateModel = models.find((m) => m.modelId === createModelId) || null

  const openCreate = () => {
    setCreateError(null)
    setIsCreateOpen(true)
    setCreateName('')
    setCreateModelId('')
    setCreateSystemPrompt('')
    setCreateTemperature(0.7)
  }

  const closeCreate = () => {
    if (isCreating) return
    setIsCreateOpen(false)
  }

  const applyModelDefaults = (modelId: string) => {
    const m = models.find((x) => x.modelId === modelId)
    if (!m) return
    setCreateName(m.defaultAgent.name)
    setCreateSystemPrompt(m.defaultAgent.systemPrompt)
    setCreateTemperature(m.defaultAgent.temperature)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isCreating) return
    setCreateError(null)

    const name = createName.trim()
    const modelId = createModelId.trim()
    const systemPrompt = createSystemPrompt.trim()

    if (!name) return setCreateError('请输入 Agent 名称')
    if (!modelId) return setCreateError('请选择模型')
    if (!systemPrompt) return setCreateError('请输入系统提示词')

    const agentsApi = backendApiUrl.replace('/chat', '/agents')
    setIsCreating(true)
    try {
      const res = await fetch(agentsApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          modelId,
          systemPrompt,
          temperature: createTemperature,
        }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || '创建失败')
      }

      const created = (await res.json()) as Agent

      const listRes = await fetch(agentsApi)
      if (listRes.ok) {
        const data: AgentListResponse = await listRes.json()
        setAgents(data.items)
      }

      setSelectedAgentId(created.id)
      setIsCreateOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建失败'
      setCreateError(message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleRecommend = async () => {
    if (!recommendQuery.trim() || isRecommending) return
    setIsRecommending(true)
    setRecommendations([])
    try {
      const recommendApi = backendApiUrl.replace('/chat', '/agents/recommend')
      const res = await fetch(recommendApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: recommendQuery, topK: 3 }),
      })
      const data = await res.json() as { items?: Array<{ agent: Agent; score: number }> }
      setRecommendations(data.items ?? [])
    } catch (error) {
      console.error('推荐失败:', error)
    } finally {
      setIsRecommending(false)
    }
  }

  const formatText = useCallback((before: string, after: string, placeholder = '') => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = input.slice(start, end) || placeholder
    const newValue = input.slice(0, start) + before + selected + after + input.slice(end)
    setInput(newValue)
    requestAnimationFrame(() => {
      ta.focus()
      const newStart = start + before.length
      ta.setSelectionRange(newStart, newStart + selected.length)
      ta.style.height = 'auto'
      ta.style.height = `${ta.scrollHeight}px`
    })
  }, [input])

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId)
    setIsSidebarOpen(false)
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 border-b bg-white flex items-center gap-3">
        {/* Hamburger menu — mobile only */}
        <button
          className="md:hidden p-1 rounded text-gray-600 hover:bg-gray-100"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="打开菜单"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">AI Chat</h1>
        {/* Current agent name — mobile only */}
        {selectedAgent && (
          <span className="md:hidden ml-auto text-sm text-gray-500 truncate max-w-[140px]">
            {selectedAgent.name}
          </span>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile overlay backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Agent List Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-80 bg-white border-r flex flex-col
            transform transition-transform duration-200
            md:relative md:translate-x-0 md:z-auto md:flex md:flex-shrink-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">可用 Agents</h2>
              {/* Close button — mobile only */}
              <button
                className="md:hidden ml-auto text-gray-400 hover:text-gray-600 text-xl leading-none"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="关闭菜单"
              >
                ×
              </button>
              <button
                onClick={openCreate}
                className="ml-auto md:ml-0 text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                新建
              </button>
            </div>
          </div>
          {/* 智能推荐区块 */}
          <div className="p-3 border-b">
            <div className="flex gap-2">
              <input
                value={recommendQuery}
                onChange={(e) => setRecommendQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleRecommend()}
                placeholder="✨ 描述你的需求..."
                className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 min-w-0"
              />
              <button
                onClick={() => void handleRecommend()}
                disabled={isRecommending || !recommendQuery.trim()}
                className="text-sm px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 whitespace-nowrap"
              >
                {isRecommending ? '…' : '推荐'}
              </button>
            </div>
            {recommendations.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-gray-400">推荐结果</div>
                {recommendations.map(({ agent, score }) => (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent.id)}
                    className="w-full text-left px-2.5 py-2 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900 truncate">{agent.name}</span>
                      <span className="text-xs text-blue-500 ml-1 shrink-0">{(score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-blue-600 opacity-70 truncate">{agent.modelId}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleSelectAgent(agent.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${agent.id === selectedAgentId
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

        {/* Create Agent Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold">创建 Agent</h2>
                <button
                  onClick={closeCreate}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                <div className="space-y-4">
                  {createError && (
                    <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{createError}</div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">使用模型 *</label>
                    <select
                      value={createModelId}
                      onChange={(e) => {
                        const v = e.target.value
                        setCreateModelId(v)
                        setCreateError(null)
                        applyModelDefaults(v)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">选择模型...</option>
                      {models
                        .slice()
                        .sort((a, b) => a.id - b.id)
                        .map((m) => (
                          <option key={m.modelId} value={m.modelId}>
                            {m.displayName} ({m.modelId})
                          </option>
                        ))}
                    </select>

                    {selectedCreateModel && (
                      <div className="mt-2 p-3 rounded border border-gray-200 bg-gray-50 text-sm">
                        <div className="font-medium mb-1">{selectedCreateModel.summary}</div>
                        <div className="text-gray-600">
                          适合：{selectedCreateModel.recommendedFor.join(' / ')}
                        </div>
                        <div className="text-gray-600 mt-1">
                          能力：流式 {selectedCreateModel.capabilities.streaming ? '✓' : '✗'} · 工具{' '}
                          {selectedCreateModel.capabilities.tools ? '✓' : '✗'} · 视觉{' '}
                          {selectedCreateModel.capabilities.vision ? '✓' : '✗'} · JSON{' '}
                          {selectedCreateModel.capabilities.json ? '✓' : '✗'}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Agent 名称 *</label>
                    <input
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="例如：专业代码助手"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">系统提示 (System Prompt) *</label>
                    <textarea
                      value={createSystemPrompt}
                      onChange={(e) => setCreateSystemPrompt(e.target.value)}
                      placeholder="例如：你是一个专业的代码助手，擅长解决编程问题..."
                      rows={7}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      温度 (Temperature): {createTemperature.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={createTemperature}
                      onChange={(e) => setCreateTemperature(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      控制回答的随机性。0 = 更确定，2 = 更随机创造
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeCreate}
                    disabled={isCreating}
                    className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    {isCreating ? '创建中...' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <main className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <div className="text-lg font-medium mb-2">
                    {selectedAgent?.name || '选择一个 Agent 开始对话'}
                  </div>
                  <div className="text-sm">
                    {selectedAgent?.systemPrompt || '点击左上角菜单选择 Agent'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[90%] md:max-w-[75%] ${message.role === 'user'
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
          <footer className="border-t bg-white px-3 pt-2 pb-3 md:px-4 md:pb-4">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
              <span className="hidden md:inline">当前 Agent:</span>
              <span className="font-medium truncate max-w-[160px] md:max-w-none">
                {selectedAgent?.name || '未选择'}
              </span>
              <button
                onClick={handleClear}
                className="ml-auto text-blue-600 hover:text-blue-800 whitespace-nowrap"
              >
                新对话
              </button>
            </div>

            {isEditorExpanded ? (
              /* ── 展开态：工具栏 + textarea ── */
              <div className="border border-blue-400 rounded-lg transition-colors">
                {/* 工具栏 */}
                <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-200">
                  <ToolbarButton title="粗体 (Ctrl+B)" onClick={() => formatText('**', '**', '粗体文字')}>
                    <span className="font-bold text-sm">B</span>
                  </ToolbarButton>
                  <ToolbarButton title="斜体 (Ctrl+I)" onClick={() => formatText('*', '*', '斜体文字')}>
                    <span className="italic text-sm">I</span>
                  </ToolbarButton>
                  <ToolbarButton title="行内代码" onClick={() => formatText('`', '`', 'code')}>
                    <span className="font-mono text-xs">{'<>'}</span>
                  </ToolbarButton>
                  <div className="w-px h-4 bg-gray-200 mx-1" />
                  <ToolbarButton title="代码块" onClick={() => formatText('```\n', '\n```', '代码内容')}>
                    <span className="font-mono text-xs">{'```'}</span>
                  </ToolbarButton>
                  <ToolbarButton title="引用" onClick={() => formatText('> ', '', '引用内容')}>
                    <span className="text-sm">"</span>
                  </ToolbarButton>
                  <ToolbarButton title="无序列表" onClick={() => formatText('- ', '', '列表项')}>
                    <span className="text-sm">•—</span>
                  </ToolbarButton>
                  {/* 收起按钮 */}
                  <button
                    type="button"
                    title="收起"
                    onClick={() => {
                      setIsEditorExpanded(false)
                      requestAnimationFrame(() => inputRef.current?.focus())
                    }}
                    className="ml-auto p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                  </button>
                </div>
                {/* 编辑区 */}
                <form onSubmit={handleSubmit} className="flex gap-2 p-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = `${e.target.scrollHeight}px`
                    }}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault()
                        handleSubmit(e as unknown as React.FormEvent)
                      }
                      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                        e.preventDefault()
                        formatText('**', '**', '粗体文字')
                      }
                      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
                        e.preventDefault()
                        formatText('*', '*', '斜体文字')
                      }
                    }}
                    placeholder="输入消息，支持 Markdown 格式..."
                    rows={3}
                    className="flex-1 resize-none focus:outline-none text-sm md:text-base min-w-0 max-h-64 leading-relaxed"
                    disabled={isLoading}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="self-end px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap text-sm md:text-base shrink-0"
                  >
                    {isLoading ? '...' : '发送'}
                  </button>
                </form>
              </div>
            ) : (
              /* ── 收起态：单行 input + 展开图标 ── */
              <form onSubmit={handleSubmit}>
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:border-blue-500 transition-colors">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(e as unknown as React.FormEvent)
                      }
                    }}
                    placeholder="输入消息，支持 Markdown 格式..."
                    className="flex-1 focus:outline-none text-sm md:text-base min-w-0 bg-transparent"
                    disabled={isLoading}
                  />
                  {/* 展开按钮 */}
                  <button
                    type="button"
                    title="展开编辑器"
                    onClick={() => {
                      setIsEditorExpanded(true)
                    }}
                    className="shrink-0 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="shrink-0 px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                  >
                    {isLoading ? '...' : '发送'}
                  </button>
                </div>
              </form>
            )}
          </footer>
        </div>
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault() // 防止 textarea 失去焦点
        onClick()
      }}
      className="px-1.5 py-0.5 rounded text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors min-w-[24px] flex items-center justify-center"
    >
      {children}
    </button>
  )
}

export default App
