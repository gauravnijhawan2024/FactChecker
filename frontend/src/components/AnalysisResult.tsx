import { ExternalLink, ShieldCheck } from "lucide-react";
import type { Analysis } from "../types/analysis";
import { StatusRail } from "./StatusRail";
import { VerdictBadge } from "./VerdictBadge";

interface AnalysisResultProps {
  analysis?: Analysis;
}

export function AnalysisResult({ analysis }: AnalysisResultProps) {
  if (!analysis) {
    return (
      <section className="flex h-full min-h-[520px] items-center justify-center rounded-md border border-line bg-white p-8 shadow-panel">
        <ShieldCheck size={44} className="text-steel" />
      </section>
    );
  }

  const confidence = Math.round((analysis.confidence ?? analysis.verdict?.confidence ?? 0) * 100);

  return (
    <section className="flex h-full min-h-[520px] flex-col gap-5 rounded-md border border-line bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Analysis Result</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">{analysis.extractedContent?.title ?? "Submitted content"}</h2>
        </div>
        {analysis.verdict?.verdict && <VerdictBadge verdict={analysis.verdict.verdict} />}
      </div>

      <StatusRail status={analysis.status} />

      {analysis.status === "failed" && (
        <p className="rounded-md border border-ember/30 bg-ember/10 px-3 py-2 text-sm text-ember">{analysis.errorMessage}</p>
      )}

      {analysis.status !== "completed" && analysis.status !== "failed" && (
        <div className="h-2 overflow-hidden rounded-full bg-paper">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-steel" />
        </div>
      )}

      {analysis.status === "completed" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-line bg-paper p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">Confidence</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{confidence}%</p>
            </div>
            <div className="rounded-md border border-line bg-paper p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">Summary</p>
              <p className="mt-2 text-sm leading-6 text-ink">{analysis.summaryForHumans}</p>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-ink">Claims</h3>
            <div className="mt-3 grid gap-3">
              {analysis.claims.map((claim) => (
                <article key={claim.text} className="rounded-md border border-line p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-medium text-ink">{claim.text}</p>
                    {claim.verdict && <VerdictBadge verdict={claim.verdict} />}
                  </div>
                  <p className="mt-2 text-sm text-ink/70">{claim.reasoning ?? claim.category}</p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-ink">Evidence</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {analysis.evidence.map((item) => (
                <article key={`${item.url}-${item.claimText}`} className="rounded-md border border-line p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded bg-paper px-2 py-1 text-xs font-semibold capitalize text-ink">{item.stance}</span>
                    <span className="text-xs text-ink/60">{Math.round(item.credibilityScore * 100)} credibility</span>
                  </div>
                  <h4 className="mt-3 font-semibold text-ink">{item.title ?? item.source}</h4>
                  <p className="mt-2 text-sm leading-6 text-ink/75">{item.snippet}</p>
                  <a className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-steel" href={item.url} target="_blank" rel="noreferrer">
                    {item.source}
                    <ExternalLink size={14} />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

