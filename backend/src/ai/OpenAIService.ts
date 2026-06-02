import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { z } from "zod";
import { env } from "../config/env.js";
import type { Claim, Evidence, ExtractedContent, Verdict } from "../types/analysis.js";

const ClaimExtractionSchema = z.object({
  claims: z.array(
    z.object({
      text: z.string(),
      category: z.string(),
      confidence: z.number().min(0).max(1)
    })
  )
});

const EvidenceSearchSchema = z.object({
  evidence: z.array(
    z.object({
      claimText: z.string(),
      source: z.string(),
      url: z.string(),
      title: z.string().optional(),
      snippet: z.string(),
      stance: z.enum(["supporting", "contradicting", "neutral"]),
      credibilityScore: z.number().min(0).max(1),
      relevanceScore: z.number().min(0).max(1)
    })
  )
});

const VerdictSchema = z.object({
  verdict: z.enum(["True", "Likely True", "Insufficient Evidence", "Likely False", "False"]),
  confidence: z.number().min(0).max(1),
  evidenceFor: z.array(z.string()),
  evidenceAgainst: z.array(z.string()),
  summaryForHumans: z.string(),
  claims: z
    .array(
      z.object({
        text: z.string(),
        verdict: z.enum(["True", "Likely True", "Insufficient Evidence", "Likely False", "False"]),
        reasoning: z.string()
      })
    )
    .optional()
});

const ImageTextSchema = z.object({
  text: z.string()
});

export class OpenAIService {
  private client?: OpenAI;

  async extractClaims(content: ExtractedContent): Promise<Claim[]> {
    const prompt = [
      "Return JSON only. Extract verifiable factual claims from the content.",
      "Ignore opinions, rhetorical claims, vague claims, predictions, and unverifiable statements.",
      "Each confidence is your confidence that the sentence is a factual claim, not whether it is true.",
      "",
      `Title: ${content.title ?? "Untitled"}`,
      `Description: ${content.description ?? ""}`,
      `Content: ${content.pageText}`
    ].join("\n");

    const result = await this.withRetry(async () =>
      this.createJsonResponse("claim_extraction", prompt, {
        type: "object",
        additionalProperties: false,
        required: ["claims"],
        properties: {
          claims: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "category", "confidence"],
              properties: {
                text: { type: "string" },
                category: { type: "string" },
                confidence: { type: "number" }
              }
            }
          }
        }
      })
    );

    return ClaimExtractionSchema.parse(result).claims.slice(0, 8);
  }

  async searchEvidence(claims: Claim[]): Promise<Evidence[]> {
    if (claims.length === 0) return [];

    const prompt = [
      "Return JSON only. Use web search to find current, high-quality evidence for these factual claims.",
      "For each claim, include supporting, contradicting, and neutral evidence when available.",
      "Prefer primary sources, reputable newsrooms, academic sources, government data, and official documents.",
      "Do not invent URLs. Use only sources found through web search.",
      "",
      JSON.stringify({ claims }, null, 2)
    ].join("\n");

    const result = await this.withRetry(async () =>
      this.createJsonResponse(
        "evidence_search",
        prompt,
        {
          type: "object",
          additionalProperties: false,
          required: ["evidence"],
          properties: {
            evidence: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["claimText", "source", "url", "title", "snippet", "stance", "credibilityScore", "relevanceScore"],
                properties: {
                  claimText: { type: "string" },
                  source: { type: "string" },
                  url: { type: "string" },
                  title: { type: "string" },
                  snippet: { type: "string" },
                  stance: { type: "string", enum: ["supporting", "contradicting", "neutral"] },
                  credibilityScore: { type: "number" },
                  relevanceScore: { type: "number" }
                }
              }
            }
          }
        },
        true
      )
    );

    return EvidenceSearchSchema.parse(result).evidence;
  }

  async analyzeCredibility(
    content: ExtractedContent,
    claims: Claim[],
    evidence: Evidence[]
  ): Promise<Verdict & { claims?: Array<Pick<Claim, "text" | "verdict" | "reasoning">> }> {
    const prompt = [
      "Return JSON only. Generate a careful fact-check verdict using the extracted claims and evidence.",
      "Do not rely on model memory. If evidence is weak, stale, irrelevant, or unavailable, use Insufficient Evidence.",
      "Score confidence from 0 to 1.",
      "",
      JSON.stringify({ content, claims, evidence }, null, 2)
    ].join("\n");

    const result = await this.withRetry(async () =>
      this.createJsonResponse("credibility_analysis", prompt, {
        type: "object",
        additionalProperties: false,
        required: ["verdict", "confidence", "evidenceFor", "evidenceAgainst", "summaryForHumans", "claims"],
        properties: {
          verdict: { type: "string", enum: ["True", "Likely True", "Insufficient Evidence", "Likely False", "False"] },
          confidence: { type: "number" },
          evidenceFor: { type: "array", items: { type: "string" } },
          evidenceAgainst: { type: "array", items: { type: "string" } },
          summaryForHumans: { type: "string" },
          claims: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "verdict", "reasoning"],
              properties: {
                text: { type: "string" },
                verdict: { type: "string", enum: ["True", "Likely True", "Insufficient Evidence", "Likely False", "False"] },
                reasoning: { type: "string" }
              }
            }
          }
        }
      })
    );

    return VerdictSchema.parse(result);
  }

  async extractTextFromImage(imagePath: string): Promise<string> {
    const absolutePath = path.resolve(imagePath);
    const file = await fs.readFile(absolutePath);
    const extension = path.extname(absolutePath).replace(".", "") || "png";
    const dataUrl = `data:image/${extension};base64,${file.toString("base64")}`;

    const result = await this.withRetry(async () => {
      const response = await this.getClient().responses.create({
        model: env.openAiModel,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "Return JSON only with all readable text from this image in a field named text." },
              { type: "input_image", image_url: dataUrl, detail: "auto" }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "image_text",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["text"],
              properties: {
                text: { type: "string" }
              }
            }
          }
        }
      });

      return JSON.parse(response.output_text);
    });

    return ImageTextSchema.parse(result).text;
  }

  private async createJsonResponse(name: string, prompt: string, schema: Record<string, unknown>, useSearch = false) {
    const response = await this.getClient().responses.create({
      model: useSearch ? env.openAiSearchModel : env.openAiModel,
      input: prompt,
      tools: useSearch ? ([{ type: "web_search", search_context_size: "medium" }] as never) : undefined,
      tool_choice: useSearch ? "auto" : undefined,
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema
        }
      }
    });

    return JSON.parse(response.output_text);
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

  private getClient() {
    if (!env.openAiApiKey) {
      throw new Error("OPENAI_API_KEY is required to run AI analysis");
    }

    this.client ??= new OpenAI({ apiKey: env.openAiApiKey });
    return this.client;
  }
}
