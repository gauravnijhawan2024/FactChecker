import type { ClaimVerdict } from "../types/analysis";

const toneByVerdict: Record<ClaimVerdict, string> = {
  True: "bg-moss text-white",
  "Likely True": "bg-steel text-white",
  "Insufficient Evidence": "bg-ink text-white",
  "Likely False": "bg-ember text-white",
  False: "bg-black text-white"
};

export function VerdictBadge({ verdict }: { verdict: ClaimVerdict }) {
  return <span className={`inline-flex rounded px-2.5 py-1 text-xs font-bold ${toneByVerdict[verdict]}`}>{verdict}</span>;
}

