import type { Request, Response } from "express";
import { z } from "zod";
import { AnalysisService } from "../services/AnalysisService.js";
import { AI_PROVIDER_IDS } from "../services/ai/AIProvider.js";
import { HttpError } from "../utils/httpError.js";

const analysisService = new AnalysisService();

const UrlBodySchema = z.object({
  url: z.string().url(),
  aiProvider: z.enum(AI_PROVIDER_IDS).default("gemini")
});

const TextBodySchema = z.object({
  text: z.string().min(20, "Text must be at least 20 characters long"),
  aiProvider: z.enum(AI_PROVIDER_IDS).default("gemini")
});

const ImageBodySchema = z.object({
  aiProvider: z.enum(AI_PROVIDER_IDS).default("gemini")
});

export async function analyzeUrl(req: Request, res: Response) {
  const body = UrlBodySchema.parse(req.body);
  const analysis = await analysisService.createUrlAnalysis(body.url, body.aiProvider);

  res.status(202).json({
    analysisId: analysis._id,
    status: analysis.status
  });
}

export async function analyzeText(req: Request, res: Response) {
  const body = TextBodySchema.parse(req.body);
  const analysis = await analysisService.createTextAnalysis(body.text, body.aiProvider);

  res.status(202).json({
    analysisId: analysis._id,
    status: analysis.status
  });
}

export async function analyzeImage(req: Request, res: Response) {
  if (!req.file) throw new HttpError(400, "Image file is required");

  const body = ImageBodySchema.parse(req.body);
  const analysis = await analysisService.createImageAnalysis(req.file.path, body.aiProvider);

  res.status(202).json({
    analysisId: analysis._id,
    status: analysis.status
  });
}

export async function getAnalysis(req: Request, res: Response) {
  const analysis = await analysisService.getAnalysis(req.params.id);
  res.json(analysis);
}

export async function deleteAnalysis(req: Request, res: Response) {
  await analysisService.deleteAnalysis(req.params.id);
  res.status(204).send();
}
