import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { env } from "../../config/env.js";
import type { Claim, Evidence, ExtractedContent, Verdict } from "../../types/analysis.js";
import type { AIProvider } from "./AIProvider.js";

const ClaimExtractionSchema = z.object({
  explicitClaims: z.array(
    z.object({
      text: z.string().min(1),
      category: z.string().min(1),
      confidence: z.number().min(0).max(1)
    })
  ),
  impliedClaims: z.array(
    z.object({
      text: z.string().min(1),
      category: z.string().min(1),
      confidence: z.number().min(0).max(1)
    })
  )
});

const CredibilityResultSchema = z.object({
  verdict: z.enum(["True", "Likely True", "Insufficient Evidence", "Likely False", "False"]),
  confidence: z.number().min(0).max(1),
  evidenceFor: z.array(z.string()),
  evidenceAgainst: z.array(z.string()),
  summaryForHumans: z.string().min(1)
});

const EvidenceSearchSchema = z.object({
  evidence: z.array(
    z.object({
      claimText: z.string().min(1),
      source: z.string().min(1),
      url: z.string().url(),
      title: z.string().optional(),
      snippet: z.string().min(1),
      stance: z.enum(["supporting", "contradicting", "neutral"]),
      credibilityScore: z.number().min(0).max(1),
      relevanceScore: z.number().min(0).max(1)
    })
  )
});

const ImageTextSchema = z.object({
  text: z.string()
});

export interface CredibilityInput {
  extractedContent: ExtractedContent;
  claims: Claim[];
  evidence: Evidence[];
}

export type CredibilityResult = Verdict;

export class GeminiProvider implements AIProvider {
  readonly id = "gemini" as const;
  readonly model = env.geminiModel;

  private client?: GoogleGenAI;

  async extractClaims(content: string): Promise<Claim[]> {
    const prompt = [
      "You are a social media fact-checking claim extraction service.",
      "",
      "Your job is NOT only to find explicit factual claims.",
      "",
      "You must also identify implied factual claims that a reasonable reader would infer.",
      "",
      "Social media content often uses:",
      "",
      "Questions",
      "Clickbait headlines",
      "Rhetorical language",
      "Sensational wording",
      '"Breaking News" labels',
      "Leading questions",
      "",
      "These often imply factual claims even when they are not stated directly.",
      "",
      "Examples:",
      "",
      "Input:",
      '"Did Modi and Trump clash inside the UN? #BreakingNews"',
      "",
      "Output:",
      "",
      "{",
      '"explicitClaims": [],',
      '"impliedClaims": [',
      "{",
      '"text": "Modi and Trump may have clashed inside the UN.",',
      '"category": "Politics",',
      '"confidence": 0.95',
      "}",
      "]",
      "}",
      "",
      "Input:",
      '"Was India removed from the UN?"',
      "",
      "Output:",
      "",
      "{",
      '"explicitClaims": [],',
      '"impliedClaims": [',
      "{",
      '"text": "India may have been removed from the UN.",',
      '"category": "Politics",',
      '"confidence": 0.95',
      "}",
      "]",
      "}",
      "",
      "Input:",
      '"Breaking: Trump expels India from the UN."',
      "",
      "Output:",
      "",
      "{",
      '"explicitClaims": [',
      "{",
      '"text": "Trump expelled India from the UN.",',
      '"category": "Politics",',
      '"confidence": 0.99',
      "}",
      "],",
      '"impliedClaims": []',
      "}",
      "",
      "Rules:",
      "",
      "Extract explicit factual claims.",
      "Extract implied factual claims.",
      "Questions may imply factual claims.",
      "Clickbait headlines may imply factual claims.",
      "Return JSON only.",
      "Do not return markdown.",
      "Confidence means confidence that a claim is being communicated or implied.",
      "",
      "Expected JSON:",
      "",
      "{",
      '"explicitClaims": [],',
      '"impliedClaims": []',
      "}",
      "",
      `Content:\n${content.slice(0, 45000)}`
    ].join("\n");

    const parsed = await this.generateJson(
      prompt,
      {
        type: Type.OBJECT,
        properties: {
          explicitClaims: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                category: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: ["text", "category", "confidence"]
            }
          },
          impliedClaims: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                category: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: ["text", "category", "confidence"]
            }
          }
        },
        required: ["explicitClaims", "impliedClaims"]
      },
      "extract claims"
    );

    const result = ClaimExtractionSchema.parse(parsed);
    const explicitClaims = result.explicitClaims.map((claim) => ({ ...claim, claimKind: "explicit" as const }));
    const impliedClaims = result.impliedClaims.map((claim) => ({ ...claim, claimKind: "implied" as const }));

    return [...explicitClaims, ...impliedClaims].slice(0, 10);
  }

  async generateVerdict(data: CredibilityInput): Promise<CredibilityResult> {
    const prompt = [
      "You are a careful fact-checking verdict service.",
      "Return JSON only. Do not wrap JSON in markdown.",
      "Use only the supplied extracted content, claims, and evidence.",
      "Do not rely on memory. If evidence is weak, stale, irrelevant, or unavailable, use Insufficient Evidence.",
      "Confidence must be a number from 0 to 1.",
      "",
      "Expected JSON shape:",
      '{"verdict":"Insufficient Evidence","confidence":0,"evidenceFor":[],"evidenceAgainst":[],"summaryForHumans":""}',
      "",
      JSON.stringify(data, null, 2)
    ].join("\n");

    const parsed = await this.generateJson(
      prompt,
      {
        type: Type.OBJECT,
        properties: {
          verdict: {
            type: Type.STRING,
            enum: ["True", "Likely True", "Insufficient Evidence", "Likely False", "False"]
          },
          confidence: { type: Type.NUMBER },
          evidenceFor: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          evidenceAgainst: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          summaryForHumans: { type: Type.STRING }
        },
        required: ["verdict", "confidence", "evidenceFor", "evidenceAgainst", "summaryForHumans"]
      },
      "generate verdict"
    );

    return CredibilityResultSchema.parse(parsed);
  }

  async searchEvidence(claims: Claim[]): Promise<Evidence[]> {
    if (claims.length === 0) return [];

    const prompt = [
      "You are a fact-checking evidence search service.",
      "Return JSON only. Do not wrap JSON in markdown.",
      "Use Google Search grounding to find supporting, contradicting, and neutral evidence for the claims.",
      "Prefer primary sources, reputable newsrooms, academic sources, government data, and official documents.",
      "Do not invent URLs.",
      "",
      "Expected JSON shape:",
      '{"evidence":[{"claimText":"","source":"","url":"https://example.com","title":"","snippet":"","stance":"neutral","credibilityScore":0,"relevanceScore":0}]}',
      "",
      JSON.stringify({ claims }, null, 2)
    ].join("\n");

    const parsed = await this.generateJson(
      prompt,
      {
        type: Type.OBJECT,
        properties: {
          evidence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                claimText: { type: Type.STRING },
                source: { type: Type.STRING },
                url: { type: Type.STRING },
                title: { type: Type.STRING },
                snippet: { type: Type.STRING },
                stance: {
                  type: Type.STRING,
                  enum: ["supporting", "contradicting", "neutral"]
                },
                credibilityScore: { type: Type.NUMBER },
                relevanceScore: { type: Type.NUMBER }
              },
              required: ["claimText", "source", "url", "title", "snippet", "stance", "credibilityScore", "relevanceScore"]
            }
          }
        },
        required: ["evidence"]
      },
      "search evidence",
      true
    );

    return EvidenceSearchSchema.parse(parsed).evidence;
  }

  async extractTextFromImage(imagePath: string): Promise<string> {
    const absolutePath = path.resolve(imagePath);
    const file = await fs.readFile(absolutePath);
    const mimeType = this.getMimeType(absolutePath);

    const parsed = await this.withRetry(async () => {
      const response = await this.getClient().models.generateContent({
        model: env.geminiModel,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "Return JSON only. Do not wrap JSON in markdown.",
                  "Extract all readable text from this image.",
                  'Expected JSON shape: {"text":""}'
                ].join("\n")
              },
              {
                inlineData: {
                  mimeType,
                  data: file.toString("base64")
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING }
            },
            required: ["text"]
          }
        }
      });

      return this.parseJsonResponse(response.text ?? "", "extract image text");
    });

    return ImageTextSchema.parse(parsed).text;
  }

  private async generateJson(prompt: string, responseSchema: Record<string, unknown>, label: string, useGoogleSearch = false) {
    return this.withRetry(async () => {
      const response = await this.getClient().models.generateContent({
        model: env.geminiModel,
        contents: prompt,
        config: useGoogleSearch
          ? {
              tools: [{ googleSearch: {} }]
            }
          : {
              responseMimeType: "application/json",
              responseSchema
            }
      });

      return this.parseJsonResponse(response.text ?? "", label);
    });
  }

  private parseJsonResponse(text: string, label: string) {
    const trimmed = text.trim();

    if (!trimmed) {
      throw new Error(`Gemini returned an empty response while trying to ${label}`);
    }

    const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    const candidate = start >= 0 && end >= start ? withoutFence.slice(start, end + 1) : withoutFence;

    try {
      return JSON.parse(candidate);
    } catch (error) {
      throw new Error(`Gemini returned invalid JSON while trying to ${label}: ${error instanceof Error ? error.message : "parse failed"}`);
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

  private getClient() {
    if (!env.geminiApiKey) {
      throw new Error("GEMINI_API_KEY is required to run Gemini analysis");
    }

    this.client ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
    return this.client;
  }

  private getMimeType(filePath: string) {
    const extension = path.extname(filePath).toLowerCase();

    if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
    if (extension === ".webp") return "image/webp";
    if (extension === ".gif") return "image/gif";
    return "image/png";
  }
}
