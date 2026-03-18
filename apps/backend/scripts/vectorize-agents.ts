import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import * as dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '../.dev.vars') })

import { RagClient } from '@singulay/rag-sdk'
import { listAgents } from '../src/data/agents.js'

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error('❌ 缺少 OPENAI_API_KEY，请在 apps/backend/.dev.vars 中配置')
  process.exit(1)
}

const outputPath = resolve(__dirname, '../src/data/agents-vector-store.json')

const client = new RagClient({
  apiKey,
  baseUrl: 'https://api.openai.com/v1',
  chatModel: 'gpt-4o-mini',
  embeddingModel: 'text-embedding-3-small',
  vectorStorePath: outputPath,
})

const agents = listAgents()
console.log(`📦 开始向量化 ${agents.length} 个 Agent...`)

for (const agent of agents) {
  const text = JSON.stringify({
    topic: agent.name,
    description: agent.systemPrompt,
  })
  const result = await client.ingestText(text, {
    agentId: agent.id,
    name: agent.name,
    modelId: agent.modelId,
  })
  console.log(`  ✓ ${agent.name} (added: ${result.added}, skipped: ${result.skipped})`)
}

console.log(`\n✅ 向量库生成完毕: ${client.getStorePath()}`)
