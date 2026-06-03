import { env } from "../../config/env.js";
import type { Claim, Evidence } from "../../types/analysis.js";
import type { AIProvider, CredibilityInput, CredibilityResult } from "./AIProvider.js";
import {
  buildClaimExtractionPrompt,
  buildEvidenceSearchPrompt,
  buildImageTextPrompt,
  buildVerdictPrompt,
  CredibilityResultSchema,
  emptyEvidence,
  EvidenceSearchSchema,
  ImageTextSchema,
  normalizeClaims,
  parseJsonResponse,
  readImageAsDataUrl
} from "./common.js";

interface OpenAIResponse {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
}

export class OpenAIProvider implements AIProvider {
  readonly id = "openai" as const;
  readonly model = env.openaiModel;

  async extractClaims(content: string): Promise<Claim[]> {
    const parsed = await this.generateJson(buildClaimExtractionPrompt(content), "extract claims");
    return normalizeClaims(parsed);
  }

  async generateVerdict(data: CredibilityInput): Promise<CredibilityResult> {
    const parsed = await this.generateJson(buildVerdictPrompt(data), "generate verdict");
    return CredibilityResultSchema.parse(parsed);
  }

  async searchEvidence(claims: Claim[]): Promise<Evidence[]> {
    if (claims.length === 0 || !env.openaiWebSearchEnabled) return emptyEvidence();

    const parsed = await this.generateJson(buildEvidenceSearchPrompt(claims), "search evidence", true);
    return EvidenceSearchSchema.parse(parsed).evidence;
  }

  async extractTextFromImage(imagePath: string): Promise<string> {
    const imageUrl = await readImageAsDataUrl(imagePath);
    const parsed = await this.generateJson(
      [
        {
          type: "input_text",
          text: buildImageTextPrompt()
        },
        {
          type: "input_image",
          image_url: imageUrl,
          detail: "auto"
        }
      ],
      "extract image text"
    );

    return ImageTextSchema.parse(parsed).text;
  }

  private async generateJson(input: string | unknown[], label: string, useWebSearch = false) {
    return this.withRetry(async () => {
      if (!env.openaiApiKey) {
        throw new Error("OPENAI_API_KEY is required to run OpenAI analysis");
      }

      const response = await fetch(`${env.openaiBaseUrl.replace(/\/$/, "")}/responses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.openaiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          instructions: "Return valid JSON only. Do not wrap JSON in markdown.",
          input: Array.isArray(input)
            ? [
                {
                  role: "user",
                  content: input
                }
              ]
            : input,
          text: {
            format: {
              type: "json_object"
            }
          },
          ...(useWebSearch
            ? {
                tools: [{ type: "web_search" }],
                tool_choice: "auto",
                include: ["web_search_call.action.sources"]
              }
            : {})
        })
      });

      const bodyText = await response.text();
      const body = this.parseBody(bodyText);

      if (!response.ok) {
        throw new Error(body.error?.message ?? `OpenAI request failed with status ${response.status}`);
      }

      return parseJsonResponse(this.extractText(body), "OpenAI", label);
    });
  }

  private extractText(body: OpenAIResponse) {
    if (body.output_text) return body.output_text;

    for (const item of body.output ?? []) {
      for (const content of item.content ?? []) {
        if (content.type === "output_text" && content.text) return content.text;
      }
    }

    return "";
  }

  private parseBody(bodyText: string): OpenAIResponse {
    if (!bodyText) return {};

    try {
      return JSON.parse(bodyText) as OpenAIResponse;
    } catch {
      return { error: { message: bodyText } };
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
