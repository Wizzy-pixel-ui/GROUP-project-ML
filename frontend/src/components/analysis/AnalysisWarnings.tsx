import { AlertTriangle } from "lucide-react";

export function AnalysisWarnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return <section className="rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-4" aria-label="Analysis warnings"><div className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-200"/><div><h3 className="text-xs font-semibold text-amber-100">API-returned interpretation limits</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-5 text-slate-300">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div></div></section>;
}
