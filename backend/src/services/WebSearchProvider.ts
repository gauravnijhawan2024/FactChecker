import { OpenAIService } from "../ai/OpenAIService.js";
import type { Claim, Evidence } from "../types/analysis.js";
import type { SearchProvider } from "./SearchProvider.js";

export class WebSearchProvider implements SearchProvider {
  constructor(private openAiService = new OpenAIService()) {}

  search(claims: Claim[]): Promise<Evidence[]> {
    return this.openAiService.searchEvidence(claims);
  }
}

