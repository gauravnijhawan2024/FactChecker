import type { OpenAIService } from "../ai/OpenAIService.js";
import type { ExtractedContent } from "../types/analysis.js";
import type { IContentExtractor } from "./IContentExtractor.js";

export class ImageExtractor implements IContentExtractor<string> {
  constructor(private openAiService: OpenAIService) {}

  async extract(imagePath: string): Promise<ExtractedContent> {
    const pageText = await this.openAiService.extractTextFromImage(imagePath);
    return { pageText };
  }
}

