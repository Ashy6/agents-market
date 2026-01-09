import React, { useState, useRef, useEffect } from 'react'
import type { Agent } from '../types'

interface MessageInputProps {
  onSend: (text: string) => void
  onClear: () => void
  isLoading: boolean
  selectedAgent: Agent | null
}

export function MessageInput({ onSend, onClear, isLoading, selectedAgent }: MessageInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    onSend(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
        <span>当前 Agent:</span>
        <span className="font-medium">{selectedAgent?.name || '未选择'}</span>
        {selectedAgent && (
          <span className="text-xs text-gray-400">({selectedAgent.modelId})</span>
        )}
        <button
          onClick={onClear}
          className="ml-auto text-sm text-blue-600 hover:text-blue-800"
        >
          新对话
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，支持 Markdown（Cmd/Ctrl+Enter 发送）"
          className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none min-h-[44px] max-h-[200px]"
          rows={1}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '发送中...' : '发送'}
        </button>
      </form>
      <div className="mt-2 text-xs text-gray-400">
        快捷键: Cmd/Ctrl+Enter 发送 · Cmd/Ctrl+N 新对话
      </div>
    </div>
  )
}
