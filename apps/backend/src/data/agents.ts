import { MODEL_LIST, type ModelCatalogItem } from "./list";
export type { ModelId } from "./list";

export type AgentConfig = {
  id: string;
  name: string;
  modelId: string;
  systemPrompt: string;
  temperature: number;
};

export const AGENT_LIST: AgentConfig[] = MODEL_LIST.map((m) => ({
  id: m.modelId,
  name: m.name,
  modelId: m.modelId,
  systemPrompt: m.systemPrompt,
  temperature: m.temperature,
}));

export function getAgentById(agentId: string): AgentConfig | undefined {
  return AGENT_LIST.find((a) => a.id === agentId);
}

export function getModelByModelId(modelId: string): ModelCatalogItem | undefined {
  return MODEL_LIST.find((m) => m.modelId === modelId);
}

export function listAvailableModelIds(): string {
  return MODEL_LIST.map((m) => m.modelId).join(", ");
}
