import React, { useState, useEffect } from 'react'
import type { UserSettings, HealthcheckResponse } from '../types'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: UserSettings
  onUpdateSettings: (updates: Partial<UserSettings>) => void
  backendApiUrl: string
}

export function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  backendApiUrl,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'api-keys' | 'preferences' | 'about'>('api-keys')
  const [healthcheck, setHealthcheck] = useState<HealthcheckResponse | null>(null)
  const [isLoadingHealth, setIsLoadingHealth] = useState(false)
  const [openaiKey, setOpenaiKey] = useState(settings.openaiApiKey || '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadHealthcheck()
    }
  }, [isOpen])

  const loadHealthcheck = async () => {
    setIsLoadingHealth(true)
    try {
      const healthUrl = backendApiUrl.replace('/chat', '/healthcheck')
      const response = await fetch(healthUrl)
      if (response.ok) {
        const data = await response.json()
        setHealthcheck(data)
      }
    } catch (error) {
      console.error('Failed to load healthcheck:', error)
    } finally {
      setIsLoadingHealth(false)
    }
  }

  const handleSaveOpenAIKey = () => {
    setIsSaving(true)
    onUpdateSettings({ openaiApiKey: openaiKey || undefined })
    setTimeout(() => {
      setIsSaving(false)
      loadHealthcheck()
    }, 500)
  }

  const handleClearOpenAIKey = () => {
    setOpenaiKey('')
    onUpdateSettings({ openaiApiKey: undefined })
    setTimeout(() => loadHealthcheck(), 500)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">设置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex h-[calc(80vh-4rem)]">
          <div className="w-48 border-r border-gray-200 p-4">
            <button
              onClick={() => setActiveTab('api-keys')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeTab === 'api-keys' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
              }`}
            >
              API Keys
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeTab === 'preferences' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
              }`}
            >
              偏好设置
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`w-full text-left px-3 py-2 rounded-lg ${
                activeTab === 'about' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
              }`}
            >
              关于
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'api-keys' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">API Keys 配置</h3>

                  {/* Volcengine Status */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">豆包 (Volcengine)</span>
                      {isLoadingHealth ? (
                        <span className="text-sm text-gray-500">检查中...</span>
                      ) : healthcheck?.providers.volcengine.configured ? (
                        <span className="text-sm text-green-600">✓ 已配置</span>
                      ) : (
                        <span className="text-sm text-red-600">✗ 未配置</span>
                      )}
                    </div>
                    {healthcheck?.providers.volcengine.configured && (
                      <div className="text-sm text-gray-600">
                        可用模型: {healthcheck.providers.volcengine.models.length} 个
                      </div>
                    )}
                    {!healthcheck?.providers.volcengine.configured && (
                      <div className="text-sm text-gray-600 mt-2">
                        请在后端环境变量中配置 VOLCENGINE_API_KEY
                      </div>
                    )}
                  </div>

                  {/* OpenAI Configuration */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">OpenAI</span>
                      {isLoadingHealth ? (
                        <span className="text-sm text-gray-500">检查中...</span>
                      ) : healthcheck?.providers.openai.configured || openaiKey ? (
                        <span className="text-sm text-green-600">✓ 已配置</span>
                      ) : (
                        <span className="text-sm text-red-600">✗ 未配置</span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={handleSaveOpenAIKey}
                        disabled={isSaving || !openaiKey}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {isSaving ? '保存中...' : '保存'}
                      </button>
                      {openaiKey && (
                        <button
                          onClick={handleClearOpenAIKey}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                          清除
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      API Key 将保存在浏览器本地存储中，不会上传到服务器
                    </div>
                  </div>

                  <button
                    onClick={loadHealthcheck}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    🔄 重新检查连接
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div>
                <h3 className="text-lg font-medium mb-4">偏好设置</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">默认模型</label>
                    <select
                      value={settings.defaultModelId || ''}
                      onChange={(e) =>
                        onUpdateSettings({ defaultModelId: e.target.value || undefined })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">自动选择</option>
                      <option value="doubao-lite">豆包 Lite</option>
                      <option value="doubao-pro-32k">豆包 Pro 32k</option>
                    </select>
                  </div>
                  <div className="text-sm text-gray-500">
                    更多偏好设置即将推出...
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div>
                <h3 className="text-lg font-medium mb-4">关于</h3>
                <div className="space-y-4 text-sm text-gray-600">
                  <div>
                    <div className="font-medium text-gray-900 mb-1">Agents Market</div>
                    <div>版本: 1.0.0</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 mb-1">技术栈</div>
                    <div>• React + Vite</div>
                    <div>• Vercel AI SDK</div>
                    <div>• Cloudflare Workers</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 mb-1">支持的模型</div>
                    <div>• 豆包 (Volcengine): {healthcheck?.providers.volcengine.models.length || 0} 个</div>
                    <div>• OpenAI: {healthcheck?.providers.openai.models.length || 0} 个</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
