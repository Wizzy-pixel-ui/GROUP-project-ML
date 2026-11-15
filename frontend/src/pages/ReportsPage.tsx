import { useState } from "react";
import { FileJson, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { getColumnMap, useWorkspace } from "../app/workspaceContext";

function download(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function ReportsPage() {
  const { state } = useWorkspace();
  const [message, setMessage] = useState<string | null>(null);
  const analysis = state.analysis;
  function exportJson() {
    if (!analysis) return;
    download("well-analysis.json", JSON.stringify({ source_file: state.file?.name ?? null, column_map: getColumnMap(state.mapping), settings: { units: state.units, threshold_rate: state.thresholdRate || null, min_consecutive_periods: state.minConsecutivePeriods, forecast_horizon_months: state.forecastHorizonMonths }, per_well_units: analysis.results.map(({ well_id, units }) => ({ well_id, units })), analysis, scope: { data_retained_by_app: false, pressure_forecast_available: false, artificial_lift_recommendation_available: false, three_d_available: false, note: "Research prototype; predictions are not calibrated natural-flow transition probabilities or lift recommendations." } }, null, 2), "application/json");
    setMessage("Downloaded the full API response as JSON.");
  }
  function exportCsv() {
    if (!analysis) return;
    const header = ["source_file", "api_version", "column_map_json", "documented_units_json", "threshold_rate", "min_consecutive_rows", "forecast_horizon_months", "well_id", "series", "date", "observed_oil_rate", "arps_oil_rate", "persistence_oil_rate", "oil_rate_unit", "model_limitations"];
    const lines = [header.join(",")];
    const provenance = [state.file?.name ?? "not retained", analysis.api_version, JSON.stringify(getColumnMap(state.mapping)), JSON.stringify(state.units), state.thresholdRate || "", state.minConsecutivePeriods, state.forecastHorizonMonths];
    const limitation = "Research prototype; Arps is a fitted scenario, not calibrated transition probability; no IPR/VLP, pressure forecast, artificial-lift recommendation, or 3D geometry";
    for (const result of analysis.results) {
      for (const point of result.history) lines.push([...provenance, result.well_id, "observed", point.date, point.oil_rate, "", "", result.units.oil_rate ?? "", limitation].map(csvCell).join(","));
      for (const point of result.forecast) lines.push([...provenance, result.well_id, "forecast", point.date, "", point.arps_oil_rate, point.persistence_oil_rate, result.units.oil_rate ?? "", limitation].map(csvCell).join(","));
    }
    download("well-history-and-forecast.csv", lines.join("\n"), "text/csv;charset=utf-8");
    setMessage("Downloaded observed and forecast series as CSV; modelled rows are labelled forecast.");
  }
  return <div className="space-y-6"><section className="border-b border-line pb-6"><p className="eyebrow">Traceable output · source-linked</p><h2 className="mt-2 text-2xl font-semibold text-white">Reports & exports</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Download the current API response as JSON or the well histories and forecast series as CSV. Exports include units and source filename; forecast rows remain explicitly marked as modelled.</p></section>
    {!analysis ? <section className="panel-card p-6"><h3 className="font-semibold text-white">No report data yet</h3><p className="mt-2 text-sm text-slate-400">Analyze a dataset first. No demo values are inserted into exports.</p><Link to="/datasets" className="primary-action mt-5">Open dataset manager</Link></section> : <><section className="panel-card p-5 sm:p-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Source file", state.file?.name ?? "not retained"], ["API version", analysis.api_version], ["Wells", analysis.results.length], ["Analysis rows", analysis.results.reduce((sum, item) => sum + item.row_count, 0).toLocaleString()]].map(([label, value]) => <div key={label} className="metric-placeholder"><span className="text-xs text-slate-500">{label}</span><strong className="mt-2 block break-all font-mono text-sm text-white">{value}</strong></div>)}</div><div className="mt-5 flex flex-wrap gap-3"><button className="primary-action" type="button" onClick={exportJson}><FileJson size={16}/> Export full JSON response</button><button className="secondary-action" type="button" onClick={exportCsv}><FileSpreadsheet size={16}/> Export histories & forecasts CSV</button></div>{message && <p className="mt-3 text-xs text-emerald-300">{message}</p>}</section><section className="panel-card p-5"><h3 className="font-semibold text-white">Included engineering limits</h3><ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-5 text-slate-400"><li>Arps output is a curve fitted to historical positive-rate observations; it is not a calibrated transition probability.</li><li>Threshold status is a rule applied to observed rows and depends on supplied lift-state data.</li><li>IPR/VLP/nodal analysis, pressure forecasts, lift recommendations and 3D reservoir geometry are not in this API response.</li><li>No PDF report is generated in this build.</li></ul></section></>}
  </div>;
}
