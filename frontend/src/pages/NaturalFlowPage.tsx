import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AnalysisWarnings } from "../components/analysis/AnalysisWarnings";
import { useWorkspace } from "../app/workspaceContext";

const fmt = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value) : "—";

export function NaturalFlowPage() {
  const { state } = useWorkspace();
  const results = state.analysis?.results ?? [];
  if (!results.length) return <section className="panel-card p-6"><p className="eyebrow">Observed rate rule · no event model</p><h2 className="mt-2 text-xl font-semibold text-white">No natural-flow check available</h2><p className="mt-2 text-sm leading-6 text-slate-400">Analyze a history with a user-defined minimum rate. Dated `lift_active` observations are needed to distinguish natural-flow from already-lifted rows.</p><Link to="/datasets" className="primary-action mt-5">Open dataset manager</Link></section>;
  return (
    <div className="space-y-6">
      <section className="border-b border-line pb-6">
        <p className="eyebrow">Rate threshold rule · transparent observed check</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Natural-flow adequacy context</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">This view reports the API's rule over submitted observations. It does not predict a future natural-flow failure date or solve well deliverability. Configure a project-defined threshold in Dataset Manager.</p>
      </section>
      <AnalysisWarnings warnings={state.analysis?.warnings ?? []} />
      <article className="rounded-lg border border-amber-300/25 bg-amber-300/[0.05] p-4"><div className="flex gap-2"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-200"/><p className="text-xs leading-5 text-amber-100">A threshold below an agreed target rate is not, by itself, evidence that the well cannot flow naturally. Review pressure, fluid properties, operating constraints, interventions, measurement units, and nodal deliverability separately.</p></div></article>
      {!state.thresholdRate && <article className="panel-card flex flex-wrap items-center justify-between gap-3 p-4"><p className="text-sm text-slate-300">No threshold was set for the current analysis.</p><Link to="/datasets" className="subtle-link">Set threshold <ArrowRight size={14}/></Link></article>}
      <section className="panel-card p-5 sm:p-6">
        <h3 className="font-semibold text-white">Observed status by well</h3>
        <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="border-b border-line text-slate-500"><tr>{["Well", "Latest date", "Latest oil rate", "Threshold", "Observed rule status", "Lift state at latest row", "First sustained observed crossing"].map((label) => <th key={label} className="min-w-28 px-3 py-2 font-medium">{label}</th>)}</tr></thead><tbody>{results.map((result) => { const latest = result.history[result.history.length - 1]; return <tr key={result.well_id} className="border-b border-line/60"><td className="px-3 py-3 font-medium text-white">{result.well_id}</td><td className="whitespace-nowrap px-3 py-3 text-slate-300">{latest?.date ?? "—"}</td><td className="px-3 py-3 font-mono text-cyan">{fmt(latest?.oil_rate)} {result.units.oil_rate ?? ""}</td><td className="px-3 py-3 font-mono text-slate-300">{result.threshold_check.threshold_rate == null ? "Not set" : `${fmt(result.threshold_check.threshold_rate)} ${result.units.oil_rate ?? ""}`}</td><td className="px-3 py-3 capitalize text-amber-100">{result.threshold_check.status.replaceAll("_", " ")}</td><td className="px-3 py-3 text-slate-300">{latest?.lift_active == null ? "Unknown" : latest.lift_active ? "Lift active" : "No lift recorded"}</td><td className="whitespace-nowrap px-3 py-3 text-slate-300">{result.threshold_check.first_sustained_below_threshold_date ?? "None observed"}</td></tr>; })}</tbody></table></div>
        <p className="mt-3 text-[10px] leading-5 text-slate-500">Consecutive periods in this API mean consecutive submitted rows, not necessarily consecutive calendar months. The first crossing is historical/observed, not a forecasted event date.</p>
      </section>
      <section className="panel-card p-5"><h3 className="font-semibold text-white">What a validated transition model still needs</h3><p className="mt-2 text-xs leading-5 text-slate-400">Dated, verified natural-flow/lift status; intervention and shut-in history; an agreed inadequacy label; sufficient field and reservoir diversity; censoring/operating-choice handling; and held-out-field validation. The current synthetic threshold labels and Volve production histories do not supply those ground-truth outcomes.</p></section>
    </div>
  );
}
