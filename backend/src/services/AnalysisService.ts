import { Analysis } from "../models/Analysis.js";
import { ExtractorFactory } from "../playwright/ExtractorFactory.js";
import type { InputType } from "../types/analysis.js";
import { HttpError } from "../utils/httpError.js";
import { CredibilityAnalysisService } from "./CredibilityAnalysisService.js";
import { EvidenceService } from "./EvidenceService.js";
import { OpenAIService } from "../ai/OpenAIService.js";

export class AnalysisService {
  private openAiService = new OpenAIService();
  private extractorFactory = new ExtractorFactory(this.openAiService);
  private evidenceService = new EvidenceService();
  private credibilityAnalysisService = new CredibilityAnalysisService(this.openAiService);

  async createUrlAnalysis(url: string) {
    const analysis = await Analysis.create({
      inputType: "url",
      sourceUrl: url,
      status: "pending"
    });

    this.processAnalysis(String(analysis._id)).catch((error) => {
      console.error("Background URL analysis failed", error);
    });

    return analysis;
  }

  async createTextAnalysis(rawText: string) {
    const analysis = await Analysis.create({
      inputType: "text",
      rawText,
      status: "pending"
    });

    this.processAnalysis(String(analysis._id)).catch((error) => {
      console.error("Background text analysis failed", error);
    });

    return analysis;
  }

  async createImageAnalysis(imagePath: string) {
    const analysis = await Analysis.create({
      inputType: "image",
      imagePath,
      status: "pending"
    });

    this.processAnalysis(String(analysis._id)).catch((error) => {
      console.error("Background image analysis failed", error);
    });

    return analysis;
  }

  async getAnalysis(id: string) {
    const analysis = await Analysis.findById(id).lean();
    if (!analysis) throw new HttpError(404, "Analysis not found");
    return analysis;
  }

  async deleteAnalysis(id: string) {
    const analysis = await Analysis.findByIdAndDelete(id);
    if (!analysis) throw new HttpError(404, "Analysis not found");
  }

  private async processAnalysis(id: string) {
    const analysis = await Analysis.findById(id);
    if (!analysis) return;

    try {
      await analysis.updateOne({ status: "extracting" });
      const extractor = this.extractorFactory.create(analysis.inputType as InputType);
      const input = analysis.inputType === "url" ? analysis.sourceUrl : analysis.inputType === "image" ? analysis.imagePath : analysis.rawText;

      if (!input) throw new Error("Missing analysis input");

      const extractedContent = await extractor.extract(input);
      await Analysis.findByIdAndUpdate(id, { extractedContent, status: "identifying_claims" });

      const claims = await this.openAiService.extractClaims(extractedContent);
      await Analysis.findByIdAndUpdate(id, {
        claims,
        $push: {
          aiLogs: {
            type: "claim_extraction",
            model: "configured-openai-model",
            prompt: "Extract verifiable factual claims",
            response: { claims }
          }
        },
        status: "searching_evidence"
      });

      const evidence = await this.evidenceService.findEvidence(claims);
      await Analysis.findByIdAndUpdate(id, {
        evidence,
        $push: {
          aiLogs: {
            type: "evidence_search",
            model: "configured-openai-search-model",
            prompt: "Find supporting and contradicting evidence",
            response: { evidence }
          }
        },
        status: "generating_verdict"
      });

      const verdict = await this.credibilityAnalysisService.analyze(extractedContent, claims, evidence);
      const mergedClaims = claims.map((claim) => {
        const reviewedClaim = verdict.claims?.find((item) => item.text === claim.text);
        return {
          ...claim,
          verdict: reviewedClaim?.verdict,
          reasoning: reviewedClaim?.reasoning
        };
      });

      await Analysis.findByIdAndUpdate(id, {
        claims: mergedClaims,
        verdict,
        confidence: verdict.confidence,
        summaryForHumans: verdict.summaryForHumans,
        status: "completed",
        completedAt: new Date(),
        $push: {
          aiLogs: {
            type: "credibility_analysis",
            model: "configured-openai-model",
            prompt: "Generate fact-check verdict",
            response: verdict
          }
        }
      });
    } catch (error) {
      await Analysis.findByIdAndUpdate(id, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Analysis failed"
      });
    }
  }
}

