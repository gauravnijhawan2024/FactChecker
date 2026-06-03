import type { AIProvider } from "../services/ai/AIProvider.js";
import type { ExtractedContent } from "../types/analysis.js";
import type { IContentExtractor } from "./IContentExtractor.js";

export class ImageExtractor implements IContentExtractor<string> {
  constructor(private aiProvider: Pick<AIProvider, "extractTextFromImage">) {}

  async extract(imagePath: string): Promise<ExtractedContent> {
    const pageText = await this.aiProvider.extractTextFromImage(imagePath);
    return { pageText };
  }
}
