import type { AIProvider } from "./ai/AIProvider.js";
import type { Claim, Evidence, ExtractedContent } from "../types/analysis.js";

export class CredibilityAnalysisService {
  constructor(private aiProvider: AIProvider) {}

  analyze(content: ExtractedContent, claims: Claim[], evidence: Evidence[]) {
    return this.aiProvider.generateVerdict({
      extractedContent: content,
      claims,
      evidence
    });
  }
}
