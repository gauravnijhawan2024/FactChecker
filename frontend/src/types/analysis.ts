export type InputMode = "url" | "text" | "image";
export type AIProviderId = "gemini" | "openai" | "ollama";
export type AnalysisStatus = "pending" | "extracting" | "identifying_claims" | "searching_evidence" | "generating_verdict" | "completed" | "failed";
export type ClaimVerdict = "True" | "Likely True" | "Insufficient Evidence" | "Likely False" | "False";
export type ClaimKind = "explicit" | "implied";

export interface Claim {
  text: string;
  category: string;
  confidence: number;
  claimKind: ClaimKind;
  verdict?: ClaimVerdict;
  reasoning?: string;
}

export interface Evidence {
  claimText: string;
  source: string;
  url: string;
  title?: string;
  snippet: string;
  stance: "supporting" | "contradicting" | "neutral";
  credibilityScore: number;
  relevanceScore: number;
}

export interface Analysis {
  _id: string;
  inputType: InputMode;
  aiProvider?: AIProviderId;
  status: AnalysisStatus;
  sourceUrl?: string;
  rawText?: string;
  extractedContent?: {
    title?: string;
    description?: string;
    pageText?: string;
    author?: string;
    publishDate?: string;
    images?: string[];
  };
  claims: Claim[];
  evidence: Evidence[];
  verdict?: {
    verdict: ClaimVerdict;
    confidence: number;
    evidenceFor: string[];
    evidenceAgainst: string[];
    summaryForHumans: string;
  };
  confidence?: number;
  summaryForHumans?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
