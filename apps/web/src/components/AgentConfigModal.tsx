import React, { useState, useEffect } from 'react'
import type { Agent, CustomAgentConfig } from '../types'
import { saveCustomAgent, deleteCustomAgent } from '../utils/storage'
import { generateId } from '../utils/formatting'
import { isCustomAgent } from '../types'

interface AgentConfigModalProps {
  isOpen: boolean
  onClose: () => void
  agent: Agent | null
  mode: 'edit' | 'clone' | 'create'
  allAgents: Agent[]
  onSave: () => void
}

export function AgentConfigModal({
  isOpen,
  onClose,
  agent,
  mode,
  allAgents,
  onSave,
}: AgentConfigModalProps) {
  const [name, setName] = useState('')
  const [modelId, setModelId] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState<number | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen && agent) {
      if (mode === 'clone') {
        setName(`${agent.name} (副本)`)
      } else {
        setName(agent.name)
      }
      setModelId(agent.modelId)
      setSystemPrompt(agent.systemPrompt)
      setTemperature(agent.temperature)
      if ('maxTokens' in agent) {
        setMaxTokens(agent.maxTokens)
      }
    } else if (isOpen && mode === 'create') {
      // Reset form for new agent
      setName('')
      setModelId(allAgents[0]?.modelId || '')
      setSystemPrompt('')
      setTemperature(0.7)
      setMaxTokens(undefined)
    }
  }, [isOpen, agent, mode, allAgents])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !modelId || !systemPrompt.trim()) return

    setIsSaving(true)

    const config: CustomAgentConfig = {
      id: mode === 'edit' && agent && isCustomAgent(agent) ? agent.id : generateId(),
      baseAgentId: mode === 'clone' && agent ? agent.id : undefined,
      name: name.trim(),
      modelId,
      systemPrompt: systemPrompt.trim(),
      temperature,
      maxTokens: maxTokens || undefined,
      createdAt: mode === 'edit' && agent && isCustomAgent(agent) ? agent.createdAt : Date.now(),
      updatedAt: Date.now(),
      isCustom: true,
    }

    saveCustomAgent(config)

    setTimeout(() => {
      setIsSaving(false)
      onSave()
      onClose()
    }, 300)
  }

  const handleDelete = () => {
    if (!agent || !isCustomAgent(agent)) return
    if (!confirm(`确定要删除自定义 Agent "${agent.name}" 吗？`)) return

    deleteCustomAgent(agent.id)
    onSave()
    onClose()
  }

  const handleReset = () => {
    if (!agent) return
    if (!confirm('确定要重置为默认配置吗？')) return

    setName(agent.name)
    setModelId(agent.modelId)
    setSystemPrompt(agent.systemPrompt)
    setTemperature(agent.temperature)
    setMaxTokens('maxTokens' in agent ? agent.maxTokens : undefined)
  }

  if (!isOpen) return null

  // Get available models (distinct modelIds)
  const availableModels = Array.from(new Set(allAgents.map((a) => a.modelId)))

  const title =
    mode === 'edit'
      ? '编辑 Agent'
      : mode === 'clone'
      ? '克隆 Agent'
      : '创建 Agent'

  const canDelete = mode === 'edit' && agent && isCustomAgent(agent)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Agent 名称 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如: 专业代码助手"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">使用模型 *</label>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">选择模型...</option>
                {availableModels.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <div className="text-sm text-gray-500 mt-1">
                选择此 Agent 使用的底层模型
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">系统提示 (System Prompt) *</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="例如: 你是一个专业的代码助手，擅长解决编程问题..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                required
              />
              <div className="text-sm text-gray-500 mt-1">
                定义 Agent 的行为和角色
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                温度 (Temperature): {temperature.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.0 (精确)</span>
                <span>1.0 (平衡)</span>
                <span>2.0 (创意)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                最大 Tokens (可选)
              </label>
              <input
                type="number"
                value={maxTokens || ''}
                onChange={(e) =>
                  setMaxTokens(e.target.value ? parseInt(e.target.value) : undefined)
                }
                placeholder="留空使用模型默认值"
                min="1"
                max="128000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <div className="text-sm text-gray-500 mt-1">
                限制单次回复的最大长度
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
                >
                  删除
                </button>
              )}
              {mode === 'edit' && !canDelete && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  重置为默认
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSaving || !name.trim() || !modelId || !systemPrompt.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
