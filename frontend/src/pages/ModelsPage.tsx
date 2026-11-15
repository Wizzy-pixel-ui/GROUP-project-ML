import { useState } from "react";
import { Cpu, LoaderCircle, Play, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useApiStatusContext } from "../app/apiStatusContext";
import { useWorkspace, getColumnMap } from "../app/workspaceContext";
import { analyzeUpload, getApiErrorMessage, trainModelUpload } from "../services/api";

function num(value: number | undefined) { return typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value) : "—"; }

export function ModelsPage() {
  const { state, setState } = useWorkspace();
  const { capabilities } = useApiStatusContext();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canTrain = Boolean(state.file && state.preview && Object.keys(state.mapping).length && capabilities?.optional_trainable_model);
  const exclude = state.excludedWellIds.split(",").map((value) => value.trim()).filter(Boolean);

  async function train() {
    if (!state.file) return;
    setError(null); setMessage(null);
    setState((current) => ({ ...current, busy: "train" }));
    try {
      const result = await trainModelUpload(state.file, getColumnMap(state.mapping), state.trainingHorizonSteps, exclude);
      setState((current) => ({ ...current, training: result, busy: null }));
      setMessage("Training finished. The model is held in the current API process only.");
    } catch (reason) {
      const detail = getApiErrorMessage(reason);
      setState((current) => ({ ...current, busy: null }));
      setError(detail);
    }
  }

  async function applyModel() {
    if (!state.file || !state.training) return;
    setError(null); setMessage(null);
    setState((current) => ({ ...current, busy: "predict" }));
    try {
      const units = Object.fromEntries(Object.entries(state.units).filter(([, unit]) => unit.trim())) as Record<string, string>;
      const analysis = await analyzeUpload(state.file, getColumnMap(state.mapping), {
        units,
        thresholdRate: state.thresholdRate,
        minConsecutivePeriods: state.minConsecutivePeriods,
        forecastHorizonMonths: state.forecastHorizonMonths,
      }, state.training.model_id);
      setState((current) => ({ ...current, analysis, selectedWellId: analysis.results[0]?.well_id ?? "", busy: null }));
      setMessage("The current upload was analyzed with the in-memory model. HGB predictions are point forecasts at the row horizon shown below.");
    } catch (reason) {
      setState((current) => ({ ...current, busy: null }));
      setError(getApiErrorMessage(reason));
    }
  }

  return (
    <div className="space-y-6">
      <section className="border-b border-line pb-6"><p className="eyebrow">Tabular regression · current backend</p><h2 className="mt-2 text-2xl font-semibold text-white">Machine-learning workspace</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Train the existing HistGradientBoosting model on a multiwell history, inspect its held-out-well scores beside persistence, then optionally run the same data through the trained model.</p></section>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"><section className="panel-card p-5 sm:p-6"><div className="flex items-center gap-2"><Cpu size={17} className="text-cyan" /><h3 className="font-semibold text-white">Train from active dataset</h3></div>
      <p className="mt-3 text-[11px] text-slate-400">{capabilities?.optional_trainable_model ? `Backend reports ${capabilities.optional_trainable_model} as available.` : "HGB capability is not confirmed by the backend. Connect to an API that advertises a trainable model before submitting training."}</p>
          {!state.file && <div className="mt-4 rounded-lg border border-line bg-[#0b1422] p-4 text-sm text-slate-400">Select and map a multiwell file in <Link to="/datasets" className="text-cyan underline">Dataset manager</Link> first.</div>}
          {state.file && <><div className="mt-4 rounded-lg border border-line bg-[#0b1422] p-3 text-xs text-slate-300">Active file: <strong className="text-white">{state.file.name}</strong>{state.preview && <span> · {state.preview.row_count.toLocaleString()} rows</span>}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="space-y-1.5"><span className="field-label">Forecast horizon (observations)</span><input className="text-input w-full" type="number" min={1} max={12} value={state.trainingHorizonSteps} onChange={(event) => setState((current) => ({ ...current, trainingHorizonSteps: Math.max(1, Math.min(12, Number(event.target.value) || 1)) }))} /><span className="block text-[10px] text-slate-500">Counts rows per well. It equals months only if rows are complete monthly observations.</span></label><label className="space-y-1.5"><span className="field-label">Exclude well IDs (optional)</span><input className="text-input w-full" value={state.excludedWellIds} placeholder="WELL-001, WELL-002" onChange={(event) => setState((current) => ({ ...current, excludedWellIds: event.target.value }))} /><span className="block text-[10px] text-slate-500">Useful for testing generalization to an excluded target well.</span></label></div><button type="button" className="primary-action mt-5" onClick={() => void train()} disabled={!canTrain || state.busy !== null}>{state.busy === "train" ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />} {state.busy === "train" ? "Training model…" : "Train HGB model"}</button></>}
          {error && <p role="alert" className="mt-4 rounded-lg border border-rose-300/20 bg-rose-300/[0.06] p-3 text-sm text-rose-100">{error}</p>}{message && <p className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.05] p-3 text-sm text-emerald-200">{message}</p>}
        </section><aside className="panel-card p-5 sm:p-6"><div className="flex items-start gap-3"><ShieldAlert size={17} className="mt-0.5 text-amber-200" /><div><h3 className="font-semibold text-white">How to interpret this run</h3><ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-5 text-slate-400"><li>The model is a HistGradientBoosting regressor for future oil rate, not a natural-flow transition classifier.</li><li>Validation uses one held-out-well split. Compare its error with the persistence baseline; a better score is not guaranteed.</li><li>Training requires at least four usable wells after exclusions and at least 20 target rows.</li><li>The model registry is process-local and resets on API restart. It is not saved or shared across workers.</li><li>The horizon counts submitted rows. It does not forecast future pressure, gas, water or operating inputs.</li></ul></div></div></aside></div>
      {state.training && <section className="space-y-4"><article className="panel-card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Training result</p><h3 className="mt-2 font-semibold text-white">{state.training.algorithm}</h3><p className="mt-1 text-xs text-slate-500">Target: {state.training.target} · Model ID <code className="break-all text-slate-300">{state.training.model_id}</code></p></div><span className="soft-chip">In-memory model</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Training wells", state.training.training_wells], ["Held-out wells", state.training.validation_wells], ["Training rows", state.training.training_rows], ["Horizon rows", state.training.horizon_steps]].map(([label, value]) => <div key={label} className="metric-placeholder"><span className="text-xs text-slate-500">{label}</span><strong className="mt-2 block font-mono text-xl text-white">{value}</strong></div>)}</div><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-lg border border-line p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Held-out well metrics</p><dl className="mt-3 space-y-2 text-xs">{Object.entries(state.training.validation_metrics).map(([key, value]) => <div key={key} className="flex justify-between border-b border-line/60 pb-2"><dt className="text-slate-400">{key.toUpperCase()}</dt><dd className="font-mono text-white">{num(value)}</dd></div>)}</dl></div><div className="rounded-lg border border-line p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Baseline</p><div className="mt-3 flex justify-between text-xs"><span className="text-slate-400">Persistence MAE</span><strong className="font-mono text-white">{num(state.training.persistence_mae)}</strong></div><p className="mt-3 text-[10px] leading-5 text-slate-500">MAE uses the target variable's source unit. This is not an accuracy percentage.</p></div></div><p className="mt-4 text-xs leading-5 text-amber-100">{state.training.warning}</p><button type="button" className="secondary-action mt-4" onClick={() => void applyModel()} disabled={!state.file || state.busy !== null}>{state.busy === "predict" ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />} Analyze active upload with this model</button></article>{state.analysis?.results.some((result) => result.hgb_prediction) && <article className="panel-card p-5"><h3 className="font-semibold text-white">HGB point predictions</h3><div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="text-slate-500"><tr>{["Well", "Predicted date", "Predicted oil rate", "Row horizon", "Model ID"].map((label) => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}</tr></thead><tbody>{state.analysis.results.filter((result) => result.hgb_prediction).map((result) => <tr key={result.well_id} className="border-t border-line/60"><td className="px-3 py-3 text-white">{result.well_id}</td><td className="px-3 py-3 text-slate-300">{result.hgb_prediction?.predicted_date}</td><td className="px-3 py-3 font-mono text-cyan">{num(result.hgb_prediction?.predicted_oil_rate)}</td><td className="px-3 py-3 text-slate-300">{result.hgb_prediction?.horizon_steps} row(s)</td><td className="px-3 py-3 font-mono text-slate-500">{result.hgb_prediction?.model_id.slice(0, 8)}…</td></tr>)}</tbody></table></div></article>}</section>}
    </div>
  );
}
