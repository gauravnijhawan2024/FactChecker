import { OpenAIService } from "../ai/OpenAIService.js";
import type { InputType } from "../types/analysis.js";
import type { IContentExtractor } from "./IContentExtractor.js";
import { ImageExtractor } from "./ImageExtractor.js";
import { NewsExtractor } from "./NewsExtractor.js";
import { TextExtractor } from "./TextExtractor.js";

export class ExtractorFactory {
  constructor(private openAiService = new OpenAIService()) {}

  create(inputType: InputType): IContentExtractor<string> {
    if (inputType === "url") return new NewsExtractor();
    if (inputType === "image") return new ImageExtractor(this.openAiService);
    return new TextExtractor();
  }
}

