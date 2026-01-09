import { getAgentById } from '../../data/agents'
import { getModelByModelId, listAvailableModelIds, type ModelId } from '../../data/agents'
import { getProviders, type ProvidersEnv } from './providers'

export type RegistryModelId = ModelId

export type RegistryEnv = ProvidersEnv & Record<string, string | undefined>

function readEnv(env: RegistryEnv, key: string): string | undefined {
  const fromEnv = env[key]
  if (fromEnv) return fromEnv
  const processEnv = typeof process !== 'undefined' ? process.env : undefined
  return processEnv?.[key]
}

function requireEnv(env: RegistryEnv, key: string): string {
  const value = readEnv(env, key)
  if (!value) throw new Error(`Missing environment variable: ${key}`)
  return value
}

export function getModel(modelId: string, env: RegistryEnv) {
  const modelItem = getModelByModelId(modelId)
  if (!modelItem) {
    throw new Error(`Unknown modelId: ${modelId}. Available: ${listAvailableModelIds()}`)
  }

  const { openai, volcengine } = getProviders(env)

  if (modelItem.provider === 'openai') {
    return openai.chat(modelItem.model)
  }

  const endpointIdEnv = modelItem.volcengine?.endpointIdEnv
  if (!endpointIdEnv) {
    throw new Error(`Model ${modelId} is missing volcengine.endpointIdEnv in MODEL_LIST`)
  }

  const endpointId = requireEnv(env, endpointIdEnv)
  return volcengine.chat(endpointId)
}
