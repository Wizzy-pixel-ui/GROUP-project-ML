import { useMemo, useRef, type ChangeEvent } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, FileSpreadsheet, LoaderCircle, RefreshCw, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { useApiStatusContext } from "../app/apiStatusContext";
import { canonicalFields, getColumnMap, useWorkspace } from "../app/workspaceContext";
import { analyzeUpload, getApiErrorMessage, previewUpload } from "../services/api";
import type { CanonicalField } from "../types/analysis";

const requiredFields = canonicalFields.filter((item) => item.required);
const maxUploadBytes = 25 * 1024 * 1024;

function suggestMappings(columns: string[]): Partial<Record<CanonicalField, string>> {
  const aliases: Record<CanonicalField, string[]> = {
    well_id: ["well_id", "well", "wellname", "wellcode", "uwi", "wellbore"],
    date: ["date", "productiondate", "month", "period", "observationdate", "timestamp"],
    oil_rate: ["oil_rate", "oilrate", "oil", "qo", "oilproduction", "oilvolume"],
    gas_rate: ["gas_rate", "gasrate", "gas", "qg", "gasproduction"],
    water_rate: ["water_rate", "waterrate", "water", "qw", "waterproduction"],
    reservoir_pressure: ["reservoir_pressure", "reservoirpressure", "staticpressure", "averagepressure"],
    bhp: ["bhp", "bottomholepressure", "flowingbottomholepressure", "fbhp"],
    bubble_point_pressure: ["bubble_point_pressure", "bubblepointpressure", "pb"],
    initial_reservoir_pressure: ["initial_reservoir_pressure", "initialreservoirpressure", "pi"],
    gor: ["gor", "gas_oil_ratio", "gasoilratio"],
    water_cut: ["water_cut", "watercut", "wc"],
    choke: ["choke", "chokesize", "chokesetting"],
    lift_active: ["lift_active", "liftactive", "artificialliftactive"],
    lift_type: ["lift_type", "lifttype", "artificiallifttype"],
    reservoir_type: ["reservoir_type", "reservoirtype"],
    drive_mechanism: ["drive_mechanism", "drivemechanism", "reservoirdrive"],
    region: ["region", "field", "asset", "location"],
    well_status: ["well_status", "wellstatus", "status"],
    shut_in_flag: ["shut_in_flag", "shutinflag", "shutin"],
    workover_flag: ["workover_flag", "workoverflag", "workover"],
  };
  const normalized = columns.map((column) => ({ column, key: column.toLowerCase().replace(/[^a-z0-9]/g, "") }));
  const result: Partial<Record<CanonicalField, string>> = {};
  const used = new Set<string>();
  for (const { field } of canonicalFields) {
    const match = normalized.find((item) => !used.has(item.column) && aliases[field].some((alias) => item.key === alias.replace(/[^a-z0-9]/g, "")));
    if (match) {
      result[field] = match.column;
      used.add(match.column);
    }
  }
  return result;
}

function FieldSelect({ field, label, sourceColumns, value, onChange, required }: {
  field: CanonicalField;
  label: string;
  sourceColumns: string[];
  value: string;
  onChange: (field: CanonicalField, source: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="field-label">{label}{required && <span className="text-rose-300"> · required</span>}</span>
      <select className="text-input w-full" value={value} onChange={(event) => onChange(field, event.target.value)}>
        <option value="">Not mapped</option>
        {sourceColumns.map((column) => <option key={column} value={column}>{column}</option>)}
      </select>
    </label>
  );
}

function asNumber(value: unknown): string {
  if (typeof value === "number") return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value == null) return "—";
  return String(value);
}

export function DatasetManagerPage() {
  const { state, setState } = useWorkspace();
  const { capabilities } = useApiStatusContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const formats = capabilities?.input_formats ?? [".csv", ".xlsx", ".xls", ".parquet", ".json"];
  const sourceColumns = state.preview?.columns ?? [];
  const preview = state.preview;
  const sourceFormats = formats.join(", ").toUpperCase();
  const usedSources = useMemo(() => Object.entries(state.mapping).filter(([, source]) => source).map(([field, source]) => ({ field, source })), [state.mapping]);
  const duplicateMappings = usedSources.filter((item, index) => usedSources.findIndex((other) => other.source === item.source) !== index);
  const missingMapped = requiredFields.filter(({ field }) => !state.mapping[field]);

  async function loadFile(file?: File) {
    if (!file) return;
    if (file.size > maxUploadBytes) {
      setState((current) => ({ ...current, error: "This file exceeds the API's 25 MB upload limit." }));
      return;
    }
    setState((current) => ({ ...current, file, preview: null, diagnostics: null, mapping: {}, units: { oil_rate: "", gas_rate: "", water_rate: "", pressure: "" }, thresholdRate: "", dateFrom: "", dateTo: "", analysis: null, training: null, error: null, busy: "preview" }));
    try {
      const preview = await previewUpload(file);
      const mapping = suggestMappings(preview.columns);
      const diagnostics = await previewUpload(file, getColumnMap(mapping));
      setState((current) => ({ ...current, preview, diagnostics, mapping, busy: null, error: null }));
    } catch (error) {
      setState((current) => ({ ...current, preview: null, diagnostics: null, busy: null, error: getApiErrorMessage(error) }));
    }
  }

  function changeMapping(field: CanonicalField, source: string) {
    setState((current) => ({ ...current, mapping: { ...current.mapping, [field]: source || undefined }, diagnostics: null, error: null }));
  }

  async function loadVolveSample() {
    setState((current) => ({ ...current, error: null, busy: "sample" }));
    try {
      const response = await fetch("/sample/volve_daily_producers.csv");
      if (!response.ok) throw new Error("The bundled Volve sample could not be loaded.");
      const sample = await response.blob();
      await loadFile(new File([sample], "volve_daily_producers.csv", { type: "text/csv" }));
    } catch (error) {
      setState((current) => ({ ...current, busy: null, error: getApiErrorMessage(error) }));
    }
  }

  function updateUnit(name: keyof typeof state.units, value: string) {
    setState((current) => ({ ...current, units: { ...current.units, [name]: value } }));
  }

  async function refreshDiagnostics() {
    if (!state.file) return;
    setState((current) => ({ ...current, busy: "validate", error: null }));
    try {
      const diagnostics = await previewUpload(state.file, getColumnMap(state.mapping));
      setState((current) => ({ ...current, diagnostics, busy: null }));
    } catch (error) {
      setState((current) => ({ ...current, busy: null, error: getApiErrorMessage(error) }));
    }
  }

  async function runAnalysis() {
    if (!state.file) return;
    if (missingMapped.length || duplicateMappings.length) {
      setState((current) => ({ ...current, error: "Map each required field to a distinct source column before analysis." }));
      return;
    }
    if (!state.units.oil_rate.trim()) {
      setState((current) => ({ ...current, error: "Document the oil-rate unit before submitting; the API does not infer or convert units." }));
      return;
    }
    const threshold = state.thresholdRate.trim();
    if (threshold && (!Number.isFinite(Number(threshold)) || Number(threshold) <= 0)) {
      setState((current) => ({ ...current, error: "Enter a positive threshold in the same unit as oil rate, or leave it blank." }));
      return;
    }
    setState((current) => ({ ...current, busy: "analyze", error: null }));
    try {
      const diagnostics = await previewUpload(state.file, getColumnMap(state.mapping));
      setState((current) => ({ ...current, diagnostics }));
      if (diagnostics.missing_required.length) throw new Error(`Required canonical fields are still missing: ${diagnostics.missing_required.join(", ")}.`);
      if ((diagnostics.invalid_date_count ?? 0) > 0) throw new Error(`${diagnostics.invalid_date_count} row(s) have a missing or invalid date. Repair the source file; rows are not silently dropped.`);
      if ((diagnostics.invalid_oil_rate_count ?? 0) > 0) throw new Error(`${diagnostics.invalid_oil_rate_count} row(s) have a missing or nonnumeric oil rate. Repair the source file; values are not imputed.`);
      if ((diagnostics.duplicate_well_date_rows ?? 0) > 0) throw new Error(`${diagnostics.duplicate_well_date_rows} row(s) are part of duplicate well/date pairs. Resolve these records before analysis; they are not aggregated.`);
      const analysis = await analyzeUpload(state.file, getColumnMap(state.mapping), {
        units: Object.fromEntries(Object.entries(state.units).filter(([, unit]) => unit.trim())) as Record<string, string>,
        thresholdRate: threshold,
        minConsecutivePeriods: state.minConsecutivePeriods,
        forecastHorizonMonths: state.forecastHorizonMonths,
      }, state.training?.model_id);
      setState((current) => ({ ...current, analysis, selectedWellId: analysis.results[0]?.well_id ?? "", busy: null, error: null }));
    } catch (error) {
      setState((current) => ({ ...current, busy: null, error: getApiErrorMessage(error) }));
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    void loadFile(event.target.files?.[0]);
  }

  const selectProps = (field: CanonicalField, label: string, required = false) => ({
    field,
    label,
    required,
    sourceColumns,
    value: state.mapping[field] ?? "",
    onChange: changeMapping,
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 border-b border-line pb-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Upload · map · validate · analyze</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Dataset manager</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Bring a well-history table into the current browser session. The API preview and analysis run in memory; this app does not save the upload.</p>
        </div>
        {state.analysis && <Link to="/production" className="primary-action">View analysis <ArrowRight size={15} /></Link>}
      </section>

      <section className="panel-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-lg border border-cyan/20 bg-cyan/10 p-2 text-cyan"><Upload size={18} /></span>
            <div><h3 className="font-semibold text-white">1. Select a production file</h3><p className="mt-1 text-xs leading-5 text-slate-400">API-supported formats: {sourceFormats}. Maximum file size: 25 MB.</p></div>
          </div>
          <input ref={inputRef} className="sr-only" type="file" accept={formats.join(",")} onChange={onFileChange} aria-label="Choose a production-history file" />
          <div className="flex flex-wrap gap-2"><button type="button" className="primary-action" onClick={() => inputRef.current?.click()} disabled={state.busy !== null}>
            {state.busy === "preview" ? <LoaderCircle className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />} Choose file
          </button><button type="button" className="secondary-action" onClick={() => void loadVolveSample()} disabled={state.busy !== null}>{state.busy === "sample" ? <LoaderCircle size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />} Load Volve sample</button></div>
        </div>
        <p className="mt-4 max-w-4xl text-[11px] leading-5 text-slate-500">Sample: 9,143 daily producer rows from six Volve wellbores (2008–2016), provided by Equinor and former license partners under <a className="text-cyan underline" href="https://www.equinor.com/content/dam/statoil/documents/what-we-do/Equinor-HRS-Terms-and-conditions-for-licence-to-data-Volve.pdf" target="_blank" rel="noreferrer">Volve terms</a>. The source does not document well-level lift status, transition outcomes, or solution-gas-drive labels. Confirm units before analysis; this sample cannot validate lift-transition recommendations.</p>
        {state.file && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-[#0b1422] px-3 py-2 text-xs text-slate-300"><FileSpreadsheet size={15} className="text-cyan" /><span className="font-medium">{state.file.name}</span><span className="text-slate-500">{(state.file.size / 1024 / 1024).toFixed(2)} MB</span><button className="ml-auto text-slate-400 hover:text-white" type="button" onClick={() => inputRef.current?.click()}>Replace</button></div>}
        {!state.file && <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void loadFile(event.dataTransfer.files?.[0]); }} className="mt-5 flex min-h-32 w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-600 bg-[#0b1422] p-5 text-center text-sm text-slate-400 transition hover:border-cyan/50 hover:text-slate-200"><Upload size={20} className="mb-2 text-cyan" />Choose or drag a file here</button>}
      </section>

      {sourceColumns.length > 0 && <>
        <section className="panel-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="eyebrow">2. Map source headers</p><h3 className="mt-2 font-semibold text-white">Tell the API what each column represents</h3><p className="mt-1 text-xs leading-5 text-slate-400">Suggestions are based on header text only. Confirm each field. Unknown categories and units are not inferred.</p></div>
            <button className="secondary-action" type="button" onClick={() => void refreshDiagnostics()} disabled={!state.file || state.busy !== null}><RefreshCw size={14} className={state.busy === "validate" ? "animate-spin" : ""} /> Check mapping</button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {canonicalFields.map(({ field, label, required }) => <FieldSelect key={field} {...selectProps(field, label, required)} />)}
          </div>
          {(missingMapped.length > 0 || duplicateMappings.length > 0) ? <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs leading-5 text-amber-100"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{missingMapped.length > 0 ? `Map required fields: ${missingMapped.map((field) => field.label).join(", ")}. ` : ""}{duplicateMappings.length > 0 ? "Each source column can map to only one canonical field." : ""}</p> : <p className="mt-4 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={15} />Required columns have distinct mappings.</p>}
        </section>

        <section className="panel-card p-5 sm:p-6">
          <p className="eyebrow">3. Document units and analysis settings</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([ ["oil_rate", "Oil-rate unit *", "e.g. STB/day"], ["gas_rate", "Gas-rate unit", "e.g. scf/day"], ["water_rate", "Water-rate unit", "e.g. STB/day"], ["pressure", "Pressure unit", "e.g. psi"] ] as const).map(([key, label, placeholder]) => <label key={key} className="space-y-1.5"><span className="field-label">{label}</span><input className="text-input w-full" value={state.units[key]} placeholder={placeholder} onChange={(event) => updateUnit(key, event.target.value)} /></label>)}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">Units are documentation labels only. No conversion is performed. Do not mix units within a submitted column.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5"><span className="field-label">Observed threshold (optional)</span><input className="text-input w-full" type="number" min="0" step="any" value={state.thresholdRate} placeholder="Leave blank to disable" onChange={(event) => setState((current) => ({ ...current, thresholdRate: event.target.value }))} /><span className="block text-[10px] text-slate-500">Same unit as oil rate; a check on observed rows, not a predicted lift trigger.</span></label>
            <label className="space-y-1.5"><span className="field-label">Consecutive rows for threshold rule</span><input className="text-input w-full" type="number" min="1" max="24" value={state.minConsecutivePeriods} onChange={(event) => setState((current) => ({ ...current, minConsecutivePeriods: Math.max(1, Math.min(24, Number(event.target.value) || 1)) }))} /><span className="block text-[10px] text-slate-500">Rows, not necessarily calendar months.</span></label>
            <label className="space-y-1.5"><span className="field-label">Arps forecast horizon (months)</span><input className="text-input w-full" type="number" min="1" max="60" value={state.forecastHorizonMonths} onChange={(event) => setState((current) => ({ ...current, forecastHorizonMonths: Math.max(1, Math.min(60, Number(event.target.value) || 1)) }))} /><span className="block text-[10px] text-slate-500">API permits 1–60 monthly curve points.</span></label>
          </div>
        </section>

        <section className="panel-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">4. Validate and analyze</p><h3 className="mt-2 font-semibold text-white">Server-side preview</h3></div>{preview && <span className="soft-chip">{preview.row_count.toLocaleString()} total rows · {preview.columns.length} columns</span>}</div>
          {state.diagnostics && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="metric-placeholder"><span className="text-xs text-slate-500">Missing canonical fields</span><strong className="mt-2 block font-mono text-xl text-white">{state.diagnostics.missing_required.length ? state.diagnostics.missing_required.join(", ") : "None"}</strong></div>
            <div className="metric-placeholder"><span className="text-xs text-slate-500">Invalid dates</span><strong className={`mt-2 block font-mono text-xl ${state.diagnostics.invalid_date_count ? "text-amber-200" : "text-white"}`}>{state.diagnostics.invalid_date_count ?? "Not mapped"}</strong></div>
            <div className="metric-placeholder"><span className="text-xs text-slate-500">Invalid oil rates</span><strong className={`mt-2 block font-mono text-xl ${state.diagnostics.invalid_oil_rate_count ? "text-amber-200" : "text-white"}`}>{state.diagnostics.invalid_oil_rate_count ?? "Not mapped"}</strong></div>
            <div className="metric-placeholder"><span className="text-xs text-slate-500">Rows with duplicate well/date</span><strong className={`mt-2 block font-mono text-xl ${state.diagnostics.duplicate_well_date_rows ? "text-rose-200" : "text-white"}`}>{state.diagnostics.duplicate_well_date_rows ?? "Not mapped"}</strong></div>
            <div className="metric-placeholder"><span className="text-xs text-slate-500">Observed gap days · min / median / max</span><strong className="mt-2 block font-mono text-sm text-white">{state.diagnostics.median_observation_interval_days == null ? "—" : `${state.diagnostics.min_observation_interval_days} / ${state.diagnostics.median_observation_interval_days} / ${state.diagnostics.max_observation_interval_days}`}</strong><span className="mt-1 block text-[10px] text-slate-600">Positive row-to-row calendar gaps</span></div>
            <div className="metric-placeholder"><span className="text-xs text-slate-500">Distinct gap sizes</span><strong className="mt-2 block font-mono text-xl text-white">{state.diagnostics.distinct_observation_intervals ?? "—"}</strong><span className="mt-1 block text-[10px] text-slate-600">Across {state.diagnostics.wells_with_intervals} well(s); not assumed monthly</span></div>
          </div>}
          {!state.diagnostics && <p className="mt-4 text-xs text-slate-500">Run “Check mapping” to refresh server diagnostics for your current column selections. Analysis always performs a fresh validation pass first.</p>}
          {preview && <div className="mt-5 overflow-x-auto rounded-lg border border-line"><table className="min-w-full text-left text-xs"><thead className="bg-[#0b1422] text-slate-400"><tr>{preview.columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 font-medium">{column}<span className="ml-1 text-slate-600">missing {preview.missing_by_column[column] ?? 0}</span></th>)}</tr></thead><tbody>{preview.preview_rows.slice(0, 8).map((row, index) => <tr key={index} className="border-t border-line/70">{preview.columns.map((column) => <td key={column} className="max-w-64 truncate px-3 py-2 font-mono text-slate-300">{asNumber(row[column])}</td>)}</tr>)}</tbody></table></div>}
          {state.error && <p role="alert" className="mt-4 rounded-lg border border-rose-300/20 bg-rose-300/[0.06] p-3 text-sm leading-5 text-rose-100">{state.error}</p>}
          {state.analysis && <p className="mt-4 text-sm text-emerald-300">Analysis complete for {state.analysis.results.length} well(s). Results are available across Production, Well Performance, Machine Learning, Predictions, and Reports.</p>}
          <div className="mt-5 flex flex-wrap gap-3"><button className="primary-action" type="button" onClick={() => void runAnalysis()} disabled={!state.file || state.busy !== null || missingMapped.length > 0 || duplicateMappings.length > 0}>{state.busy === "analyze" ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {state.busy === "analyze" ? "Analyzing…" : "Validate & analyze"}</button>{state.analysis && <Link className="secondary-action" to="/production">Open charts <ArrowRight size={15} /></Link>}</div>
        </section>
      </>}

      {!state.file && <article className="panel-card p-5 sm:p-6"><h3 className="font-semibold text-white">Minimum data contract</h3><p className="mt-2 text-sm leading-6 text-slate-400">One dated row per well, with a stable well identifier, observation date and oil rate. Arps fitting needs at least six positive oil-rate observations per well. HGB training needs multiple wells. The API rejects duplicate well/date pairs and does not convert units or infer a sampling cadence.</p></article>}
    </div>
  );
}
