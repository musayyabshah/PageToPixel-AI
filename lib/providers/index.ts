import { createGeminiProvider } from "./gemini";
import { createOpenAIProvider } from "./openai";
import { ProviderAdapter, ProviderName } from "./types";

export function getProviderAdapter(provider: ProviderName, apiKey: string): ProviderAdapter {
  if (provider === "openai") return createOpenAIProvider(apiKey);
  return createGeminiProvider(apiKey);
}
