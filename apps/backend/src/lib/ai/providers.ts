import { createOpenAI } from '@ai-sdk/openai'

export type ProvidersEnv = {
  DEEPSEEK_API_KEY?: string
  DEEPSEEK_BASE_URL?: string
  OPENAI_API_KEY?: string
  VOLCENGINE_API_KEY?: string
  VOLC_API_KEY?: string
  VOLCENGINE_BASE_URL?: string
}

type Providers = {
  deepseek: () => ReturnType<typeof createOpenAI>
  openai: () => ReturnType<typeof createOpenAI>
  volcengine: () => ReturnType<typeof createOpenAI>
}

const cachedProvidersByKey = new Map<
  string,
  {
    deepseek?: ReturnType<typeof createOpenAI>
    openai?: ReturnType<typeof createOpenAI>
    volcengine?: ReturnType<typeof createOpenAI>
  }
>()

function readEnv(env: ProvidersEnv, key: keyof ProvidersEnv & string): string | undefined {
  const fromEnv = env[key]
  if (fromEnv) return fromEnv
  const processEnv = typeof process !== 'undefined' ? process.env : undefined
  return processEnv?.[key]
}

function requireEnv(env: ProvidersEnv, key: keyof ProvidersEnv & string): string {
  const value = readEnv(env, key)
  if (!value) {
    // Provide user-friendly error messages
    let message = `Missing environment variable: ${key}`
    if (key === 'OPENAI_API_KEY') {
      message = 'OpenAI API Key 未配置。请在环境变量中设置 OPENAI_API_KEY。'
    } else if (key === 'DEEPSEEK_API_KEY') {
      message = 'DeepSeek API Key 未配置。请在环境变量中设置 DEEPSEEK_API_KEY。'
    } else if (key === 'VOLCENGINE_API_KEY' || key === 'VOLC_API_KEY') {
      message = '豆包 API Key 未配置。请在环境变量中设置 VOLCENGINE_API_KEY 或 VOLC_API_KEY。'
    }
    throw new Error(message)
  }
  return value
}

export function checkProviderConfiguration(env: ProvidersEnv): {
  deepseek: { configured: boolean; error?: string }
  volcengine: { configured: boolean; error?: string }
  openai: { configured: boolean; error?: string }
} {
  return {
    deepseek: {
      configured: !!readEnv(env, 'DEEPSEEK_API_KEY'),
      error: readEnv(env, 'DEEPSEEK_API_KEY') ? undefined : 'DeepSeek API Key 未配置',
    },
    volcengine: {
      configured: !!(readEnv(env, 'VOLCENGINE_API_KEY') || readEnv(env, 'VOLC_API_KEY')),
      error: (readEnv(env, 'VOLCENGINE_API_KEY') || readEnv(env, 'VOLC_API_KEY')) ? undefined : '豆包 API Key 未配置',
    },
    openai: {
      configured: !!readEnv(env, 'OPENAI_API_KEY'),
      error: readEnv(env, 'OPENAI_API_KEY') ? undefined : 'OpenAI API Key 未配置',
    },
  }
}

export function getProviders(env: ProvidersEnv): Providers {
  const deepseekBaseURL = readEnv(env, 'DEEPSEEK_BASE_URL') || 'https://api.deepseek.com/v1'
  const deepseekKey = readEnv(env, 'DEEPSEEK_API_KEY') || ''
  const openaiKey = readEnv(env, 'OPENAI_API_KEY') || ''
  const volcBaseURL = readEnv(env, 'VOLCENGINE_BASE_URL') || 'https://ark.cn-beijing.volces.com/api/v3'
  const volcKey = readEnv(env, 'VOLCENGINE_API_KEY') || readEnv(env, 'VOLC_API_KEY') || ''
  const cacheKey = `${deepseekBaseURL}::${deepseekKey}::${openaiKey}::${volcBaseURL}::${volcKey}`
  const cached = cachedProvidersByKey.get(cacheKey)
  const cacheEntry = cached ?? {}
  if (!cached) cachedProvidersByKey.set(cacheKey, cacheEntry)

  return {
    deepseek: () => {
      if (!cacheEntry.deepseek) {
        cacheEntry.deepseek = createOpenAI({
          baseURL: deepseekBaseURL,
          apiKey: requireEnv(env, 'DEEPSEEK_API_KEY'),
        })
      }
      return cacheEntry.deepseek
    },
    openai: () => {
      if (!cacheEntry.openai) {
        cacheEntry.openai = createOpenAI({ apiKey: requireEnv(env, 'OPENAI_API_KEY') })
      }
      return cacheEntry.openai
    },
    volcengine: () => {
      if (!cacheEntry.volcengine) {
        cacheEntry.volcengine = createOpenAI({
          baseURL: volcBaseURL,
          apiKey: requireEnv(
            env,
            (readEnv(env, 'VOLCENGINE_API_KEY') ? 'VOLCENGINE_API_KEY' : 'VOLC_API_KEY') as
              | 'VOLCENGINE_API_KEY'
              | 'VOLC_API_KEY',
          ),
        })
      }
      return cacheEntry.volcengine
    },
  }
}
