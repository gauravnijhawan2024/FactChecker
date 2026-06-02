import type { ExtractedContent } from "../types/analysis.js";
import type { IContentExtractor } from "./IContentExtractor.js";

export class TextExtractor implements IContentExtractor<string> {
  async extract(text: string): Promise<ExtractedContent> {
    return {
      pageText: text.replace(/\s+/g, " ").trim().slice(0, 45000)
    };
  }
}

