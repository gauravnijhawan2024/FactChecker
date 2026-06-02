import { OpenAIService } from "../ai/OpenAIService.js";
import type { Claim, Evidence, ExtractedContent } from "../types/analysis.js";

export class CredibilityAnalysisService {
  constructor(private openAiService = new OpenAIService()) {}

  analyze(content: ExtractedContent, claims: Claim[], evidence: Evidence[]) {
    return this.openAiService.analyzeCredibility(content, claims, evidence);
  }
}

