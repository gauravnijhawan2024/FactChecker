interface GeminiErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{
      "@type"?: string;
      retryDelay?: string;
    }>;
  };
}

export function formatAnalysisError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const parsed = parseGeminiError(rawMessage);

  if (parsed?.error?.status === "RESOURCE_EXHAUSTED" || parsed?.error?.code === 429) {
    const retryDelay = parsed.error.details?.find((detail) => typeof detail.retryDelay === "string")?.retryDelay;
    const retryText = retryDelay ? ` Try again in about ${retryDelay.replace("s", " seconds")}.` : " Please try again shortly.";

    return `Gemini is temporarily rate limited for this project.${retryText}`;
  }

  if (parsed?.error?.status === "UNAVAILABLE" || parsed?.error?.code === 503) {
    return "Gemini is currently busy. Please try again in a few moments.";
  }

  if (rawMessage.includes("GEMINI_API_KEY")) {
    return "Gemini API key is missing or not configured. Add GEMINI_API_KEY in backend/.env and restart the server.";
  }

  if (rawMessage.includes("OPENAI_API_KEY")) {
    return "OpenAI API key is missing or not configured. Add OPENAI_API_KEY in backend/.env and restart the server.";
  }

  if (rawMessage.toLowerCase().includes("ollama")) {
    return `Ollama analysis failed. Make sure Ollama is running and the configured model is available. ${rawMessage}`;
  }

  return rawMessage.startsWith("{") ? "Analysis failed because the AI provider returned an unexpected error. Please try again." : rawMessage;
}

function parseGeminiError(message: string): GeminiErrorBody | undefined {
  try {
    return JSON.parse(message) as GeminiErrorBody;
  } catch {
    return undefined;
  }
}
