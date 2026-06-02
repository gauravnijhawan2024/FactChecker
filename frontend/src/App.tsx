import { useEffect, useState } from "react";
import { AnalyzeForm } from "./components/AnalyzeForm";
import { AnalysisResult } from "./components/AnalysisResult";
import { getAnalysis } from "./services/api";
import type { Analysis } from "./types/analysis";

export default function App() {
  const [analysisId, setAnalysisId] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | undefined>();

  useEffect(() => {
    if (!analysisId) return;

    let alive = true;
    let timeout: number | undefined;

    async function poll() {
      try {
        const nextAnalysis = await getAnalysis(analysisId);
        if (!alive) return;
        setAnalysis(nextAnalysis);

        if (nextAnalysis.status !== "completed" && nextAnalysis.status !== "failed") {
          timeout = window.setTimeout(poll, 1800);
        }
      } catch {
        if (alive) timeout = window.setTimeout(poll, 2500);
      }
    }

    poll();

    return () => {
      alive = false;
      if (timeout) window.clearTimeout(timeout);
    };
  }, [analysisId]);

  function handleCreated(id: string) {
    setAnalysisId(id);
    setAnalysis(undefined);
  }

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[410px_1fr] lg:px-8">
        <aside className="rounded-md border border-line bg-white p-5 shadow-panel lg:min-h-[calc(100vh-2.5rem)]">
          <AnalyzeForm onCreated={handleCreated} />
        </aside>
        <AnalysisResult analysis={analysis} />
      </div>
    </main>
  );
}

