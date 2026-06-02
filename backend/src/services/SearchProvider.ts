import type { Claim, Evidence } from "../types/analysis.js";

export interface SearchProvider {
  search(claims: Claim[]): Promise<Evidence[]>;
}

