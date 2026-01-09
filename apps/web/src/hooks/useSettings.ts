import { useState, useEffect, useCallback } from 'react'
import type { UserSettings } from '../types'
import { loadSettings, updateSettings as saveSettingsUpdate } from '../utils/storage'

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>({})
  const [isLoading, setIsLoading] = useState(true)

  // Load settings on mount
  useEffect(() => {
    const loaded = loadSettings()
    setSettings(loaded)
    setIsLoading(false)
  }, [])

  // Update settings
  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...updates }
      saveSettingsUpdate(updates)
      return updated
    })
  }, [])

  // Clear specific setting
  const clearSetting = useCallback((key: keyof UserSettings) => {
    setSettings((prev) => {
      const updated = { ...prev }
      delete updated[key]
      saveSettingsUpdate({ [key]: undefined })
      return updated
    })
  }, [])

  return {
    settings,
    isLoading,
    updateSettings,
    clearSetting,
  }
}
