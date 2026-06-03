import type { AIProvider } from "./ai/AIProvider.js";
import type { Claim, Evidence } from "../types/analysis.js";
import type { SearchProvider } from "./SearchProvider.js";

export class WebSearchProvider implements SearchProvider {
  constructor(private aiProvider: AIProvider) {}

  search(claims: Claim[]): Promise<Evidence[]> {
    return this.aiProvider.searchEvidence(claims);
  }
}
