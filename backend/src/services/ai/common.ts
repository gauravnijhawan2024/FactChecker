import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Claim, Evidence } from "../../types/analysis.js";
import type { CredibilityInput } from "./AIProvider.js";

export const ClaimExtractionSchema = z.object({
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

export const CredibilityResultSchema = z.object({
  verdict: z.enum(["True", "Likely True", "Insufficient Evidence", "Likely False", "False"]),
  confidence: z.number().min(0).max(1),
  evidenceFor: z.array(z.string()),
  evidenceAgainst: z.array(z.string()),
  summaryForHumans: z.string().min(1)
});

export const EvidenceSearchSchema = z.object({
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

export const ImageTextSchema = z.object({
  text: z.string()
});

export function buildClaimExtractionPrompt(content: string) {
  return [
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
}

export function buildVerdictPrompt(data: CredibilityInput) {
  return [
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
}

export function buildEvidenceSearchPrompt(claims: Claim[]) {
  return [
    "You are a fact-checking evidence search service.",
    "Return JSON only. Do not wrap JSON in markdown.",
    "Use web search if available to find supporting, contradicting, and neutral evidence for the claims.",
    "Prefer primary sources, reputable newsrooms, academic sources, government data, and official documents.",
    "Do not invent URLs. If you cannot verify a URL from search results, omit that item.",
    "",
    "Expected JSON shape:",
    '{"evidence":[{"claimText":"","source":"","url":"https://example.com","title":"","snippet":"","stance":"neutral","credibilityScore":0,"relevanceScore":0}]}',
    "",
    JSON.stringify({ claims }, null, 2)
  ].join("\n");
}

export function buildImageTextPrompt() {
  return [
    "Return JSON only. Do not wrap JSON in markdown.",
    "Extract all readable text from this image.",
    'Expected JSON shape: {"text":""}'
  ].join("\n");
}

export function parseJsonResponse(text: string, provider: string, label: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error(`${provider} returned an empty response while trying to ${label}`);
  }

  const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  const candidate = start >= 0 && end >= start ? withoutFence.slice(start, end + 1) : withoutFence;

  try {
    return JSON.parse(candidate);
  } catch (error) {
    throw new Error(`${provider} returned invalid JSON while trying to ${label}: ${error instanceof Error ? error.message : "parse failed"}`);
  }
}

export function normalizeClaims(parsed: unknown): Claim[] {
  const result = ClaimExtractionSchema.parse(parsed);
  const explicitClaims = result.explicitClaims.map((claim) => ({ ...claim, claimKind: "explicit" as const }));
  const impliedClaims = result.impliedClaims.map((claim) => ({ ...claim, claimKind: "implied" as const }));

  return [...explicitClaims, ...impliedClaims].slice(0, 10);
}

export function getMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  return "image/png";
}

export async function readImageAsDataUrl(imagePath: string) {
  const absolutePath = path.resolve(imagePath);
  const file = await fs.readFile(absolutePath);
  return `data:${getMimeType(absolutePath)};base64,${file.toString("base64")}`;
}

export async function readImageAsBase64(imagePath: string) {
  const absolutePath = path.resolve(imagePath);
  const file = await fs.readFile(absolutePath);
  return file.toString("base64");
}

export function emptyEvidence(): Evidence[] {
  return [];
}
