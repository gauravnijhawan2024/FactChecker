import { Analysis } from "../models/Analysis.js";
import { ExtractorFactory } from "../playwright/ExtractorFactory.js";
import type { AIProviderId, InputType } from "../types/analysis.js";
import { HttpError } from "../utils/httpError.js";
import { CredibilityAnalysisService } from "./CredibilityAnalysisService.js";
import { EvidenceService } from "./EvidenceService.js";
import { WebSearchProvider } from "./WebSearchProvider.js";
import { formatAnalysisError } from "../utils/formatAnalysisError.js";
import { isAIProviderId } from "./ai/AIProvider.js";
import { createAIProvider } from "./ai/providerFactory.js";

export class AnalysisService {
  async createUrlAnalysis(url: string, aiProvider: AIProviderId = "gemini") {
    const analysis = await Analysis.create({
      inputType: "url",
      sourceUrl: url,
      aiProvider,
      status: "pending"
    });

    this.processAnalysis(String(analysis._id)).catch((error) => {
      console.error("Background URL analysis failed", error);
    });

    return analysis;
  }

  async createTextAnalysis(rawText: string, aiProvider: AIProviderId = "gemini") {
    const analysis = await Analysis.create({
      inputType: "text",
      rawText,
      aiProvider,
      status: "pending"
    });

    this.processAnalysis(String(analysis._id)).catch((error) => {
      console.error("Background text analysis failed", error);
    });

    return analysis;
  }

  async createImageAnalysis(imagePath: string, aiProvider: AIProviderId = "gemini") {
    const analysis = await Analysis.create({
      inputType: "image",
      imagePath,
      aiProvider,
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
      const providerId = isAIProviderId(analysis.aiProvider) ? analysis.aiProvider : "gemini";
      const aiProvider = createAIProvider(providerId);
      const extractorFactory = new ExtractorFactory(aiProvider);
      const evidenceService = new EvidenceService(new WebSearchProvider(aiProvider));
      const credibilityAnalysisService = new CredibilityAnalysisService(aiProvider);

      await analysis.updateOne({ status: "extracting" });
      const extractor = extractorFactory.create(analysis.inputType as InputType);
      const input = analysis.inputType === "url" ? analysis.sourceUrl : analysis.inputType === "image" ? analysis.imagePath : analysis.rawText;

      if (!input) throw new Error("Missing analysis input");

      const extractedContent = await extractor.extract(input);
      await Analysis.findByIdAndUpdate(id, { extractedContent, status: "identifying_claims" });

      const claims = await aiProvider.extractClaims(extractedContent.pageText);
      await Analysis.findByIdAndUpdate(id, {
        claims,
        $push: {
          aiLogs: {
            type: "claim_extraction",
            model: aiProvider.model,
            prompt: "Extract verifiable factual claims",
            response: { claims }
          }
        },
        status: "searching_evidence"
      });

      const evidence = await evidenceService.findEvidence(claims);
      await Analysis.findByIdAndUpdate(id, {
        evidence,
        $push: {
          aiLogs: {
            type: "evidence_search",
            model: aiProvider.model,
            prompt: "Find supporting and contradicting evidence",
            response: { evidence }
          }
        },
        status: "generating_verdict"
      });

      const verdict = await credibilityAnalysisService.analyze(extractedContent, claims, evidence);

      await Analysis.findByIdAndUpdate(id, {
        claims,
        verdict,
        confidence: verdict.confidence,
        summaryForHumans: verdict.summaryForHumans,
        status: "completed",
        completedAt: new Date(),
        $push: {
          aiLogs: {
            type: "credibility_analysis",
            model: aiProvider.model,
            prompt: "Generate fact-check verdict",
            response: verdict
          }
        }
      });
    } catch (error) {
      await Analysis.findByIdAndUpdate(id, {
        status: "failed",
        errorMessage: formatAnalysisError(error)
      });
    }
  }
}
