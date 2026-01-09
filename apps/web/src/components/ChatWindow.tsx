import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { UIMessage } from 'ai'
import type { Agent } from '../types'
import { extractMessageText, formatTime, copyToClipboard } from '../utils/formatting'

interface ChatWindowProps {
  messages: UIMessage[]
  isLoading: boolean
  selectedAgent: Agent | null
  onDeleteMessage: (messageId: string) => void
  onRegenerateMessage: (messageId: string) => void
}

export function ChatWindow({
  messages,
  isLoading,
  selectedAgent,
  onDeleteMessage,
  onRegenerateMessage,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!selectedAgent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">请选择一个 Agent 开始对话</div>
          <div className="text-sm">从左侧列表中选择一个 Agent</div>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="max-w-2xl text-center p-8">
          <h2 className="text-2xl font-bold mb-2">{selectedAgent.name}</h2>
          <p className="text-gray-600 mb-6">{selectedAgent.systemPrompt}</p>
          <div className="text-left bg-white rounded-lg p-6 shadow-sm">
            <h3 className="font-medium mb-3">开始对话吧!</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>• 输入消息后按回车或点击发送</div>
              <div>• 支持 Markdown 格式</div>
              <div>• Cmd/Ctrl+Enter 快捷发送</div>
              <div>• Cmd/Ctrl+N 开始新对话</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onDelete={() => onDeleteMessage(message.id)}
            onRegenerate={() => onRegenerateMessage(message.id)}
          />
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-xs">AI</span>
            </div>
            <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

interface MessageBubbleProps {
  message: UIMessage
  onDelete: () => void
  onRegenerate: () => void
}

function MessageBubble({ message, onDelete, onRegenerate }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false)
  const [copied, setCopied] = useState(false)

  const isUser = message.role === 'user'
  const text = extractMessageText(message.parts)
  const createdAt = (message as UIMessage & { createdAt?: string | number }).createdAt
  const timestamp = createdAt ? new Date(createdAt).getTime() : Date.now()

  const handleCopy = async () => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
        <span className="text-xs">{isUser ? '我' : 'AI'}</span>
      </div>
      <div className={`flex-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`rounded-lg p-4 max-w-3xl ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200'
          }`}
        >
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          <span>{formatTime(timestamp)}</span>
          {showActions && (
            <>
              <button
                onClick={handleCopy}
                className="hover:text-gray-600 transition-colors"
              >
                {copied ? '✓ 已复制' : '📋 复制'}
              </button>
              {!isUser && (
                <button
                  onClick={onRegenerate}
                  className="hover:text-gray-600 transition-colors"
                >
                  🔄 重新生成
                </button>
              )}
              <button
                onClick={onDelete}
                className="hover:text-red-600 transition-colors"
              >
                🗑️ 删除
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
