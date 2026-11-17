import { BarChart3, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductionChart, type ChartVariable } from "../components/analysis/ProductionChart";
import { AnalysisWarnings } from "../components/analysis/AnalysisWarnings";
import { useWorkspace } from "../app/workspaceContext";

function metric(value: number | null | undefined, digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value) : "—";
}

export function ProductionPage() {
  const { state, setState } = useWorkspace();
  const results = state.analysis?.results ?? [];
  const selected = results.find((result) => result.well_id === state.selectedWellId) ?? results[0];
  if (!selected) return <section className="panel-card p-6"><div className="flex items-start gap-3"><Database className="mt-1 text-cyan" /><div><p className="eyebrow">Production surveillance</p><h2 className="mt-2 text-xl font-bold text-slate-900">No analyzed history yet</h2><p className="mt-2 text-sm text-slate-500">Upload a structured history, confirm units, and run the analysis before opening charts.</p><Link to="/datasets" className="primary-action mt-5">Open dataset manager</Link></div></div></section>;
  const latest = selected.history[selected.history.length - 1];
  const threshold = state.thresholdRate ? Number(state.thresholdRate) : null;
  const variableOptions = ([
    { field: "oil_rate", label: "Oil rate" }, { field: "gas_rate", label: "Gas rate" }, { field: "water_rate", label: "Water rate" },
    { field: "reservoir_pressure", label: "Reservoir pressure" }, { field: "bhp", label: "Flowing bottom-hole pressure" }, { field: "bubble_point_pressure", label: "Bubble-point pressure" },
  ] as Array<{ field: ChartVariable; label: string }>).filter(({ field }) => selected.history.some((point) => typeof point[field] === "number"));
  const activeVariable = variableOptions.some((item) => item.field === state.chartVariable) ? state.chartVariable : "oil_rate";
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 border-b border-line pb-6 xl:flex-row xl:items-end"><div><p className="eyebrow">Production surveillance · measured vs modelled</p><h2 className="mt-2 text-2xl font-bold text-slate-900">Production analytics</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Chart series are returned by the FastAPI service. Select a measured variable and date window; Arps and persistence forecasts are available only for oil rate.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="block min-w-44 space-y-1.5"><span className="field-label">Selected well</span><select className="text-input w-full" value={selected.well_id} onChange={(event) => setState((current) => ({ ...current, selectedWellId: event.target.value }))}>{results.map((result) => <option key={result.well_id} value={result.well_id}>{result.well_id}</option>)}</select></label><label className="block min-w-44 space-y-1.5"><span className="field-label">Measured variable</span><select className="text-input w-full" value={activeVariable} onChange={(event) => setState((current) => ({ ...current, chartVariable: event.target.value as ChartVariable }))}>{variableOptions.map(({ field, label }) => <option key={field} value={field}>{label}</option>)}</select></label><label className="block space-y-1.5"><span className="field-label">From date</span><input className="text-input w-full" type="date" value={state.dateFrom} onChange={(event) => setState((current) => ({ ...current, dateFrom: event.target.value }))} /></label><label className="block space-y-1.5"><span className="field-label">To date</span><input className="text-input w-full" type="date" value={state.dateTo} onChange={(event) => setState((current) => ({ ...current, dateTo: event.target.value }))} /></label></div></section>
      <AnalysisWarnings warnings={state.analysis?.warnings ?? []} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        ["History rows", selected.row_count.toLocaleString()], ["Latest observed oil", `${metric(latest?.oil_rate)} ${selected.units.oil_rate ?? ""}`], ["Trend summary", selected.trend.direction], ["Arps form", selected.arps_fit.decline_type],
      ].map(([label, value]) => <div key={label} className="metric-placeholder"><span className="text-xs text-slate-500">{label}</span><strong className="mt-2 block truncate font-mono text-xl capitalize text-slate-900">{value}</strong><span className="mt-1 block text-[10px] text-slate-500">{label === "Latest observed oil" ? latest?.date : label === "Trend summary" ? "Linear description of history" : `${selected.start_date} — ${selected.end_date}`}</span></div>)}</div>
      <ProductionChart result={selected} thresholdRate={threshold} variable={activeVariable} dateFrom={state.dateFrom} dateTo={state.dateTo} />
      <section className="panel-card p-5 sm:p-6"><div className="flex items-center gap-2"><BarChart3 size={16} className="text-cyan" /><h3 className="font-bold text-slate-900">Well comparison</h3></div><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="border-b border-line text-slate-500"><tr>{["Well", "Rows", "Date range", "Rate change", "Arps form", "Observed threshold status"].map((label) => <th key={label} className="whitespace-nowrap px-3 py-2 font-medium">{label}</th>)}</tr></thead><tbody>{results.map((result) => <tr key={result.well_id} className={`border-b border-line/60 ${result.well_id === selected.well_id ? "bg-cyan/[0.04]" : ""}`}><td className="px-3 py-3 font-medium text-slate-900">{result.well_id}</td><td className="px-3 py-3 font-mono text-slate-700">{result.row_count}</td><td className="whitespace-nowrap px-3 py-3 text-slate-700">{result.start_date} → {result.end_date}</td><td className="px-3 py-3 font-mono text-slate-700">{result.trend.percent_change_first_to_last == null ? "—" : `${metric(result.trend.percent_change_first_to_last)}%`}</td><td className="px-3 py-3 capitalize text-slate-700">{result.arps_fit.decline_type}</td><td className="px-3 py-3 text-slate-700">{result.threshold_check.status.replaceAll("_", " ")}</td></tr>)}</tbody></table></div><p className="mt-3 text-[10px] leading-4 text-slate-500">Observed threshold status is a transparent check on submitted rows. It is not a learned natural-flow transition prediction.</p></section>
    </div>
  );
}
