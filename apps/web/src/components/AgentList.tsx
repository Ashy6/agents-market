import React, { useState } from 'react'
import type { Agent } from '../types'
import { formatRelativeTime } from '../utils/formatting'
import { isCustomAgent } from '../types'

interface AgentListProps {
  agents: Agent[]
  selectedAgentId: string | null
  onSelectAgent: (agentId: string) => void
  onEditAgent: (agentId: string) => void
  onCloneAgent: (agentId: string) => void
  getAgentLastUpdate: (agentId: string) => number
  isLoading: boolean
  error: string | null
}

export function AgentList({
  agents,
  selectedAgentId,
  onSelectAgent,
  onEditAgent,
  onCloneAgent,
  getAgentLastUpdate,
  isLoading,
  error,
}: AgentListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedProvider, setExpandedProvider] = useState<string | null>('doubao')

  // Filter agents by search query
  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.modelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.systemPrompt.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group agents by provider
  const groupedAgents = {
    doubao: filteredAgents.filter((agent) => agent.modelId.startsWith('doubao')),
    openai: filteredAgents.filter((agent) => !agent.modelId.startsWith('doubao')),
  }

  const toggleProvider = (provider: string) => {
    setExpandedProvider(expandedProvider === provider ? null : provider)
  }

  if (isLoading) {
    return (
      <div className="w-80 border-r border-gray-200 bg-gray-50 p-4">
        <div className="text-center text-gray-600">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-80 border-r border-gray-200 bg-gray-50 p-4">
        <div className="text-center text-red-600">
          <div className="font-medium">加载失败</div>
          <div className="text-sm mt-2">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold mb-3">可用 Agents</h2>
        <input
          type="text"
          placeholder="搜索 Agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Doubao Group */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleProvider('doubao')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">豆包模型</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                默认
              </span>
            </div>
            <span className="text-gray-400">
              {expandedProvider === 'doubao' ? '▼' : '▶'}
            </span>
          </button>
          {expandedProvider === 'doubao' && (
            <div className="pb-2">
              {groupedAgents.doubao.map((agent) => (
                <AgentItem
                  key={agent.id}
                  agent={agent}
                  isSelected={agent.id === selectedAgentId}
                  onSelect={() => onSelectAgent(agent.id)}
                  onEdit={() => onEditAgent(agent.id)}
                  onClone={() => onCloneAgent(agent.id)}
                  lastUpdate={getAgentLastUpdate(agent.id)}
                />
              ))}
              {groupedAgents.doubao.length === 0 && (
                <div className="px-4 py-2 text-sm text-gray-500">无匹配结果</div>
              )}
            </div>
          )}
        </div>

        {/* OpenAI Group */}
        <div>
          <button
            onClick={() => toggleProvider('openai')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium">OpenAI 模型</span>
            <span className="text-gray-400">
              {expandedProvider === 'openai' ? '▼' : '▶'}
            </span>
          </button>
          {expandedProvider === 'openai' && (
            <div className="pb-2">
              {groupedAgents.openai.map((agent) => (
                <AgentItem
                  key={agent.id}
                  agent={agent}
                  isSelected={agent.id === selectedAgentId}
                  onSelect={() => onSelectAgent(agent.id)}
                  onEdit={() => onEditAgent(agent.id)}
                  onClone={() => onCloneAgent(agent.id)}
                  lastUpdate={getAgentLastUpdate(agent.id)}
                />
              ))}
              {groupedAgents.openai.length === 0 && (
                <div className="px-4 py-2 text-sm text-gray-500">无匹配结果</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface AgentItemProps {
  agent: Agent
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onClone: () => void
  lastUpdate: number
}

function AgentItem({ agent, isSelected, onSelect, onEdit, onClone, lastUpdate }: AgentItemProps) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={`px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
      }`}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{agent.name}</span>
            {isCustomAgent(agent) && (
              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                自定义
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mb-1">{agent.modelId}</div>
          <div className="text-xs text-gray-400 line-clamp-2">{agent.systemPrompt}</div>
          {lastUpdate > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              {formatRelativeTime(lastUpdate)}
            </div>
          )}
        </div>
        {showActions && (
          <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onEdit}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              编辑
            </button>
            <button
              onClick={onClone}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              克隆
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
