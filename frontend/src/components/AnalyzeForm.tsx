import { Loader2, Play, Upload } from "lucide-react";
import { useState } from "react";
import { submitImage, submitText, submitUrl } from "../services/api";
import type { AIProviderId, InputMode } from "../types/analysis";
import { ModeTabs } from "./ModeTabs";

interface AnalyzeFormProps {
  onCreated: (analysisId: string) => void;
}

export function AnalyzeForm({ onCreated }: AnalyzeFormProps) {
  const [mode, setMode] = useState<InputMode>("url");
  const [aiProvider, setAiProvider] = useState<AIProviderId>("gemini");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result =
        mode === "url"
          ? await submitUrl(url, aiProvider)
          : mode === "text"
            ? await submitText(text, aiProvider)
            : image
              ? await submitImage(image, aiProvider)
              : null;

      if (!result) {
        setError("Choose an image first.");
        return;
      }

      onCreated(result.analysisId);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Analysis could not start.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">FactChecker</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">Evidence-first claim analysis</h1>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-ink">AI provider</span>
        <select
          value={aiProvider}
          onChange={(event) => setAiProvider(event.target.value as AIProviderId)}
          className="h-12 w-full rounded-md border border-line bg-white px-4 text-base shadow-sm"
        >
          <option value="gemini">Gemini</option>
          <option value="openai">OpenAI</option>
          <option value="ollama">Ollama</option>
        </select>
      </label>

      <ModeTabs mode={mode} onChange={setMode} />

      {mode === "url" && (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink">Article URL</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/story"
            className="h-12 w-full rounded-md border border-line bg-white px-4 text-base shadow-sm"
          />
        </label>
      )}

      {mode === "text" && (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink">Raw text</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={12}
            className="w-full resize-none rounded-md border border-line bg-white p-4 text-base shadow-sm"
          />
        </label>
      )}

      {mode === "image" && (
        <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-line bg-white p-6 text-center shadow-sm">
          <Upload className="mb-3 text-steel" size={28} />
          <span className="text-sm font-medium text-ink">{image?.name ?? "Select image"}</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
          />
        </label>
      )}

      {error && <p className="rounded-md border border-ember/30 bg-ember/10 px-3 py-2 text-sm text-ember">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-auto flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-4 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
        Analyze
      </button>
    </form>
  );
}
