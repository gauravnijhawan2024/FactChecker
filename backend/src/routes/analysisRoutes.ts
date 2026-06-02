import { Router } from "express";
import { analyzeImage, analyzeText, analyzeUrl, deleteAnalysis, getAnalysis } from "../controllers/analysisController.js";
import { imageUpload } from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const analysisRoutes = Router();

analysisRoutes.post("/url", asyncHandler(analyzeUrl));
analysisRoutes.post("/text", asyncHandler(analyzeText));
analysisRoutes.post("/image", imageUpload.single("image"), asyncHandler(analyzeImage));
analysisRoutes.get("/:id", asyncHandler(getAnalysis));
analysisRoutes.delete("/:id", asyncHandler(deleteAnalysis));
