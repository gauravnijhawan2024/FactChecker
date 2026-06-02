import type { Claim, Evidence } from "../types/analysis.js";
import type { SearchProvider } from "./SearchProvider.js";
import { WebSearchProvider } from "./WebSearchProvider.js";

export class EvidenceService {
  constructor(private provider: SearchProvider = new WebSearchProvider()) {}

  async findEvidence(claims: Claim[]): Promise<Evidence[]> {
    const evidence = await this.provider.search(claims);
    return evidence
      .filter((item) => item.url && item.snippet)
      .sort((a, b) => b.relevanceScore + b.credibilityScore - (a.relevanceScore + a.credibilityScore));
  }
}

