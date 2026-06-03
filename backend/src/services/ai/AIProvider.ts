import type { Claim, Evidence, ExtractedContent, Verdict } from "../../types/analysis.js";

export const AI_PROVIDER_IDS = ["gemini", "openai", "ollama"] as const;
export type AIProviderId = (typeof AI_PROVIDER_IDS)[number];

export interface CredibilityInput {
  extractedContent: ExtractedContent;
  claims: Claim[];
  evidence: Evidence[];
}

export type CredibilityResult = Verdict;

export interface AIProvider {
  readonly id: AIProviderId;
  readonly model: string;
  extractClaims(content: string): Promise<Claim[]>;
  generateVerdict(data: CredibilityInput): Promise<CredibilityResult>;
  searchEvidence(claims: Claim[]): Promise<Evidence[]>;
  extractTextFromImage(imagePath: string): Promise<string>;
}

export function isAIProviderId(value: unknown): value is AIProviderId {
  return typeof value === "string" && AI_PROVIDER_IDS.includes(value as AIProviderId);
}
