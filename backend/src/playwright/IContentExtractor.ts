import type { ExtractedContent } from "../types/analysis.js";

export interface IContentExtractor<TInput = string> {
  extract(input: TInput): Promise<ExtractedContent>;
}

