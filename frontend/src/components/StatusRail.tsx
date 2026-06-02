import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import type { AnalysisStatus } from "../types/analysis";

const steps: AnalysisStatus[] = ["pending", "extracting", "identifying_claims", "searching_evidence", "generating_verdict", "completed"];

const labels: Record<AnalysisStatus, string> = {
  pending: "Queued",
  extracting: "Extracting",
  identifying_claims: "Claims",
  searching_evidence: "Evidence",
  generating_verdict: "Verdict",
  completed: "Complete",
  failed: "Failed"
};

export function StatusRail({ status }: { status: AnalysisStatus }) {
  if (status === "failed") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-ember/30 bg-ember/10 px-3 py-2 text-sm font-medium text-ember">
        <XCircle size={17} />
        Failed
      </div>
    );
  }

  const activeIndex = steps.indexOf(status);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {steps.map((step, index) => {
        const complete = index < activeIndex || status === "completed";
        const active = index === activeIndex && status !== "completed";
        const Icon = complete ? CheckCircle2 : active ? Loader2 : Circle;

        return (
          <div key={step} className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm">
            <Icon size={16} className={active ? "animate-spin text-steel" : complete ? "text-moss" : "text-line"} />
            <span className="truncate">{labels[step]}</span>
          </div>
        );
      })}
    </div>
  );
}

