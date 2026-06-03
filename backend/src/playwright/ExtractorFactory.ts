import type { AIProvider } from "../services/ai/AIProvider.js";
import type { InputType } from "../types/analysis.js";
import type { IContentExtractor } from "./IContentExtractor.js";
import { ImageExtractor } from "./ImageExtractor.js";
import { NewsExtractor } from "./NewsExtractor.js";
import { TextExtractor } from "./TextExtractor.js";

export class ExtractorFactory {
  constructor(private aiProvider: AIProvider) {}

  create(inputType: InputType): IContentExtractor<string> {
    if (inputType === "url") return new NewsExtractor();
    if (inputType === "image") return new ImageExtractor(this.aiProvider);
    return new TextExtractor();
  }
}
