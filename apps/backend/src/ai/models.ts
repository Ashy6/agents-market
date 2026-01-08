import { createOpenAI } from '@ai-sdk/openai'

export type ModelProvider = 'openai' | 'volcengine'

export type Env = {
  OPENAI_API_KEY?: string
  OPENAI_MODEL_ID?: string
  VOLCENGINE_BASE_URL?: string
  VOLCENGINE_API_KEY?: string
  VOLCENGINE_MODEL_DOUBAO_PRO?: string
  VOLCENGINE_MODEL_DOUBAO_LITE?: string
}

export type GetModelParams = {
  provider: ModelProvider
  modelId: string
  env: Env
}

export const DEFAULT_MODEL_PROVIDER: ModelProvider = 'volcengine'

function requireEnv(env: Env, name: keyof Env & string): string {
  const value = env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export function getDefaultModelId(provider: ModelProvider, env: Env): string {
  if (provider === 'volcengine') {
    return (
      env.VOLCENGINE_MODEL_DOUBAO_PRO ||
      env.VOLCENGINE_MODEL_DOUBAO_LITE ||
      'ep-你自己的模型，这里我期望是角色扮演类的模型'
    )
  }

  return env.OPENAI_MODEL_ID || 'gpt-4o-mini'
}

const cachedOpenAIByKey = new Map<string, ReturnType<typeof createOpenAI>>()
const cachedVolcengineByKey = new Map<string, ReturnType<typeof createOpenAI>>()

function getOpenAIClient(env: Env) {
  const apiKey = requireEnv(env, 'OPENAI_API_KEY')
  const cached = cachedOpenAIByKey.get(apiKey)
  if (cached) return cached
  const client = createOpenAI({ apiKey })
  cachedOpenAIByKey.set(apiKey, client)
  return client
}

function getVolcengineClient(env: Env) {
  const baseURL = requireEnv(env, 'VOLCENGINE_BASE_URL')
  const apiKey = requireEnv(env, 'VOLCENGINE_API_KEY')
  const cacheKey = `${baseURL}::${apiKey}`
  const cached = cachedVolcengineByKey.get(cacheKey)
  if (cached) return cached
  const client = createOpenAI({ baseURL, apiKey })
  cachedVolcengineByKey.set(cacheKey, client)
  return client
}

export function getModel({ provider, modelId, env }: GetModelParams) {
  switch (provider) {
    case 'openai':
      return getOpenAIClient(env)(modelId)
    case 'volcengine':
      return getVolcengineClient(env).chat(modelId)
    default: {
      const exhaustive: never = provider
      throw new Error(`Unsupported provider: ${exhaustive}`)
    }
  }
}
