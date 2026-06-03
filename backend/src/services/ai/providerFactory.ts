import { GeminiProvider } from "./GeminiService.js";
import { OllamaProvider } from "./OllamaProvider.js";
import { OpenAIProvider } from "./OpenAIProvider.js";
import type { AIProvider, AIProviderId } from "./AIProvider.js";

export function createAIProvider(providerId: AIProviderId): AIProvider {
  if (providerId === "openai") return new OpenAIProvider();
  if (providerId === "ollama") return new OllamaProvider();
  return new GeminiProvider();
}
