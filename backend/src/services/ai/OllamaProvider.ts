import { env } from "../../config/env.js";
import type { Claim, Evidence } from "../../types/analysis.js";
import type { AIProvider, CredibilityInput, CredibilityResult } from "./AIProvider.js";
import {
  buildClaimExtractionPrompt,
  buildImageTextPrompt,
  buildVerdictPrompt,
  CredibilityResultSchema,
  emptyEvidence,
  ImageTextSchema,
  normalizeClaims,
  parseJsonResponse,
  readImageAsBase64
} from "./common.js";

interface OllamaResponse {
  message?: {
    content?: string;
  };
  error?: string;
}

export class OllamaProvider implements AIProvider {
  readonly id = "ollama" as const;
  readonly model = env.ollamaModel;

  async extractClaims(content: string): Promise<Claim[]> {
    const parsed = await this.generateJson(this.model, buildClaimExtractionPrompt(content), "extract claims");
    return normalizeClaims(parsed);
  }

  async generateVerdict(data: CredibilityInput): Promise<CredibilityResult> {
    const parsed = await this.generateJson(this.model, buildVerdictPrompt(data), "generate verdict");
    return CredibilityResultSchema.parse(parsed);
  }

  async searchEvidence(_claims: Claim[]): Promise<Evidence[]> {
    return emptyEvidence();
  }

  async extractTextFromImage(imagePath: string): Promise<string> {
    const image = await readImageAsBase64(imagePath);
    const parsed = await this.generateJson(env.ollamaVisionModel, buildImageTextPrompt(), "extract image text", [image]);
    return ImageTextSchema.parse(parsed).text;
  }

  private async generateJson(model: string, prompt: string, label: string, images?: string[]) {
    return this.withRetry(async () => {
      const response = await fetch(`${env.ollamaBaseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          stream: false,
          format: "json",
          messages: [
            {
              role: "system",
              content: "Return valid JSON only. Do not wrap JSON in markdown."
            },
            {
              role: "user",
              content: prompt,
              ...(images ? { images } : {})
            }
          ],
          options: {
            temperature: 0.1
          }
        })
      });

      const bodyText = await response.text();
      const body = this.parseBody(bodyText);

      if (!response.ok) {
        throw new Error(body.error ?? `Ollama request failed with status ${response.status}`);
      }

      return parseJsonResponse(body.message?.content ?? "", "Ollama", label);
    });
  }

  private parseBody(bodyText: string): OllamaResponse {
    if (!bodyText) return {};

    try {
      return JSON.parse(bodyText) as OllamaResponse;
    } catch {
      return { error: bodyText };
    }
  }

  private async withRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }
    }

    throw lastError;
  }
}
