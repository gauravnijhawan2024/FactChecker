import { Schema, model, type InferSchemaType } from "mongoose";

const ClaimSchema = new Schema(
  {
    text: { type: String, required: true },
    category: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    claimKind: { type: String, enum: ["explicit", "implied"], required: true, default: "explicit" },
    verdict: {
      type: String,
      enum: ["True", "Likely True", "Insufficient Evidence", "Likely False", "False"]
    },
    reasoning: String
  },
  { _id: false }
);

const EvidenceSchema = new Schema(
  {
    claimText: { type: String, required: true },
    source: { type: String, required: true },
    url: { type: String, required: true },
    title: String,
    snippet: { type: String, required: true },
    stance: {
      type: String,
      enum: ["supporting", "contradicting", "neutral"],
      required: true
    },
    credibilityScore: { type: Number, required: true, min: 0, max: 1 },
    relevanceScore: { type: Number, required: true, min: 0, max: 1 }
  },
  { _id: false }
);

const AiLogSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["claim_extraction", "evidence_search", "credibility_analysis", "image_extraction"],
      required: true
    },
    model: { type: String, required: true },
    prompt: { type: String, required: true },
    response: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const AnalysisSchema = new Schema(
  {
    inputType: { type: String, enum: ["url", "text", "image"], required: true },
    aiProvider: { type: String, enum: ["gemini", "openai", "ollama"], required: true, default: "gemini" },
    status: {
      type: String,
      enum: ["pending", "extracting", "identifying_claims", "searching_evidence", "generating_verdict", "completed", "failed"],
      default: "pending",
      index: true
    },
    sourceUrl: String,
    rawText: String,
    imagePath: String,
    extractedContent: {
      title: String,
      description: String,
      pageText: String,
      author: String,
      publishDate: String,
      images: [String]
    },
    claims: { type: [ClaimSchema], default: [] },
    evidence: { type: [EvidenceSchema], default: [] },
    verdict: {
      verdict: {
        type: String,
        enum: ["True", "Likely True", "Insufficient Evidence", "Likely False", "False"]
      },
      confidence: Number,
      evidenceFor: [String],
      evidenceAgainst: [String],
      summaryForHumans: String
    },
    confidence: { type: Number, min: 0, max: 1 },
    summaryForHumans: String,
    aiLogs: { type: [AiLogSchema], default: [] },
    errorMessage: String,
    completedAt: Date
  },
  { timestamps: true }
);

export type AnalysisDocument = InferSchemaType<typeof AnalysisSchema>;
export const Analysis = model("Analysis", AnalysisSchema);
