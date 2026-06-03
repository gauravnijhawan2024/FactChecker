import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/factchecker",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.1-mini",
  openaiWebSearchEnabled: process.env.OPENAI_WEB_SEARCH_ENABLED !== "false",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.1",
  ollamaVisionModel: process.env.OLLAMA_VISION_MODEL ?? process.env.OLLAMA_MODEL ?? "llava",
  uploadDir: process.env.UPLOAD_DIR ?? "uploads"
};
