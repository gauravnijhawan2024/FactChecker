import type { Claim, Evidence } from "../types/analysis.js";
import type { SearchProvider } from "./SearchProvider.js";

export class EvidenceService {
  constructor(private provider: SearchProvider) {}

  async findEvidence(claims: Claim[]): Promise<Evidence[]> {
    const evidence = await this.provider.search(claims);
    return evidence
      .filter((item) => item.url && item.snippet)
      .sort((a, b) => b.relevanceScore + b.credibilityScore - (a.relevanceScore + a.credibilityScore));
  }
}
