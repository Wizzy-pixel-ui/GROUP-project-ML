import { useState, type FormEvent } from "react";
import { AlertTriangle, Check, CircleHelp, LoaderCircle, ShieldAlert, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "../app/workspaceContext";
import { getApiErrorMessage, screenArtificialLift } from "../services/api";
import type { HistoryPoint, WellAnalysis } from "../types/analysis";
import type {
  CandidateStatus,
  LiftScreeningRequest,
  LiftScreeningResponse,
  ResourceState,
} from "../types/liftScreening";

const initialForm: LiftScreeningRequest = {
  well_id: null,
  well_type: "unknown",
  lift_need_state: "not_established",
  lift_need_evidence: null,
  current_oil_rate: null,
  current_liquid_rate: null,
  target_liquid_rate: null,
  current_gas_rate: null,
  liquid_rate_unit: null,
  gas_rate_unit: null,
  reservoir_pressure: null,
  flowing_bhp: null,
  bubble_point_pressure: null,
  pressure_unit: null,
  pressure_measurement_date: null,
  rate_duty: "unknown",
  fluid_viscosity: "unknown",
  free_gas_fraction: "unknown",
  solids_loading: "unknown",
  trajectory: "unknown",
  setting: "unknown",
  liquid_loading_concern: "unknown",
  electric_power: "unknown",
  injection_gas_system: "unknown",
  gas_handling_capacity: "unknown",
  rod_pump_access: "unknown",
  pcp_surface_drive: "unknown",
  hydraulic_power_fluid: "unknown",
};

const candidateStatus: Record<CandidateStatus, { label: string; className: string }> = {
  screening_candidate: { label: "No stated resource gate blocked", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-800" },
  conditional: { label: "Conditional · verify constraints", className: "border-amber-300/30 bg-amber-300/10 text-amber-900" },
  unknown: { label: "Insufficient method inputs", className: "border-slate-500/40 bg-slate-500/10 text-slate-700" },
  screened_out: { label: "Screened out by stated input", className: "border-rose-400/30 bg-rose-400/10 text-rose-800" },
};

const wellTypeOptions = [
  ["unknown", "Unknown / not confirmed"],
  ["oil", "Oil well"],
  ["gas", "Gas well"],
];
const needOptions = [
  ["not_established", "Not established"],
  ["suspected_by_user", "Suspected by project team"],
  ["engineering_confirmed_by_user", "Reported as confirmed by engineering review"],
];
const levelOptions = [
  ["unknown", "Unknown / not supplied"],
  ["low", "Low"],
  ["moderate", "Moderate"],
  ["high", "High"],
];
const resourceOptions = [
  ["unknown", "Unknown / not confirmed"],
  ["available", "Available"],
  ["unavailable", "Unavailable"],
];

function SelectField({ label, value, options, onChange, help }: {
  label: string;
  value: string;
  options: string[][];
  onChange: (value: string) => void;
  help?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="field-label">{label}</span>
      <select className="text-input w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
      {help && <span className="block text-[11px] leading-4 text-slate-500">{help}</span>}
    </label>
  );
}

function NumberField({ label, value, unit, onChange, min = 0, step = "any" }: {
  label: string;
  value: number | null;
  unit?: string;
  onChange: (value: number | null) => void;
  min?: number;
  step?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="field-label">{label}{unit ? ` (${unit})` : ""}</span>
      <input className="text-input w-full" type="number" min={min} step={step} value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} />
    </label>
  );
}

function ResultList({ title, items, tone = "normal" }: { title: string; items: string[]; tone?: "normal" | "caution" | "blocked" }) {
  if (!items.length) return null;
  const iconClass = tone === "blocked" ? "text-rose-300" : tone === "caution" ? "text-amber-800" : "text-cyan";
  const Icon = tone === "blocked" ? X : tone === "caution" ? AlertTriangle : Check;
  return (
    <div className="mt-4">
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h4>
      <ul className="mt-2 space-y-2">
        {items.map((item) => <li key={item} className="flex gap-2 text-sm leading-5 text-slate-700"><Icon size={15} className={`mt-0.5 shrink-0 ${iconClass}`} /><span>{item}</span></li>)}
      </ul>
    </div>
  );
}

function observedNumber(well: WellAnalysis, key: keyof HistoryPoint): number | null {
  for (let index = well.history.length - 1; index >= 0; index -= 1) {
    const value = well.history[index][key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

export function ArtificialLiftPage() {
  const { state } = useWorkspace();
  const [form, setForm] = useState<LiftScreeningRequest>(initialForm);
  const [result, setResult] = useState<LiftScreeningResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceWellId, setSourceWellId] = useState("");
  const wells = state.analysis?.results ?? [];

  function setField<K extends keyof LiftScreeningRequest>(key: K, value: LiftScreeningRequest[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function prefillFromAnalysis(well: WellAnalysis) {
    const oil = observedNumber(well, "oil_rate");
    const water = observedNumber(well, "water_rate");
    const gas = observedNumber(well, "gas_rate");
    const oilUnit = well.units.oil_rate ?? "";
    const waterUnit = well.units.water_rate ?? "";
    const compatibleLiquidUnits = Boolean(oilUnit) && oilUnit.trim().toLowerCase() === waterUnit.trim().toLowerCase();
    setForm((current) => ({
      ...current,
      well_id: well.well_id,
      current_oil_rate: oil,
      current_liquid_rate: compatibleLiquidUnits && oil !== null && water !== null ? oil + water : null,
      current_gas_rate: gas,
      liquid_rate_unit: oilUnit || current.liquid_rate_unit,
      gas_rate_unit: well.units.gas_rate ?? current.gas_rate_unit,
      // Do not infer well type, lift need, trajectory, PVT, or resource availability from the history.
    }));
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await screenArtificialLift(form);
      setResult(response);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">Rule-based engineering screen · version 0.1</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Artificial-lift screening</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Enter the well-specific context and available resources. The API returns a traceable preliminary shortlist for gas lift, ESP, sucker-rod pump, PCP, hydraulic lift, and a gas-well plunger-lift branch.</p>
      </header>

      <div className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 sm:p-5">
        <div className="flex gap-3">
          <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-800" />
          <div>
            <h3 className="font-bold text-amber-900">A screening shortlist—not “install this system”</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">A falling rate or Arps threshold crossing does not establish that natural flow is inadequate. IPR/VLP and nodal operating-point calculations are not implemented, so this app cannot independently confirm the need for lift. Results are deterministic rule matches, not AI-generated advice, probabilities, or validated recommendations.</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">No universal numeric cutoffs are assumed for “low/high” duty, gas, solids, or viscosity. Use your field’s documented definitions and leave unknowns as unknown.</p>
          </div>
        </div>
      </div>

      {wells.length > 0 && (
        <aside className="panel-card space-y-3 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="block min-w-0 flex-1 space-y-1.5">
            <span className="field-label">Use observed rates from the current analysis (optional)</span>
            <select className="text-input w-full" value={sourceWellId || state.selectedWellId || wells[0].well_id} onChange={(event) => setSourceWellId(event.target.value)}>
              {wells.map((well) => <option key={well.well_id} value={well.well_id}>{well.well_id}</option>)}
            </select>
          </label>
          <button type="button" className="secondary-button min-h-10" onClick={() => {
            const chosenId = sourceWellId || state.selectedWellId || wells[0].well_id;
            const chosen = wells.find((well) => well.well_id === chosenId);
            if (chosen) prefillFromAnalysis(chosen);
          }}>Copy observed rates</button>
          </div>
          <p className="text-xs leading-5 text-slate-500">Only API-returned oil/liquid/gas history and known units are copied. It does not infer well type, lift need, geometry, PVT, or resource availability.</p>
        </aside>
      )}

      <form onSubmit={submit} className="space-y-5">
        <section className="panel-card space-y-4 p-4 sm:p-6">
          <div><p className="eyebrow">01 · Case and need evidence</p><h3 className="mt-1 text-lg font-bold text-slate-900">Identify the well and what is known</h3></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block space-y-1.5"><span className="field-label">Well identifier</span><input className="text-input w-full" value={form.well_id ?? ""} onChange={(event) => setField("well_id", event.target.value || null)} placeholder="e.g. WELL-01" /></label>
            <SelectField label="Well type" value={form.well_type} options={wellTypeOptions} onChange={(value) => setField("well_type", value as LiftScreeningRequest["well_type"])} />
            <SelectField label="Lift-need evidence status" value={form.lift_need_state} options={needOptions} onChange={(value) => setField("lift_need_state", value as LiftScreeningRequest["lift_need_state"])} help="This is a user assertion only; the API does not verify need for lift." />
          </div>
          <label className="block space-y-1.5"><span className="field-label">Evidence reference or short note (optional)</span><textarea className="text-input min-h-20 w-full" maxLength={1000} value={form.lift_need_evidence ?? ""} onChange={(event) => setField("lift_need_evidence", event.target.value || null)} placeholder="e.g. dated well test and reviewed nodal study; include document reference, not confidential files" /></label>
        </section>

        <section className="panel-card space-y-4 p-4 sm:p-6">
          <div><p className="eyebrow">02 · Production and fluid context</p><h3 className="mt-1 text-lg font-bold text-slate-900">Enter observed values and project duty</h3><p className="mt-1 text-xs leading-5 text-slate-500">Numeric values are stored with the unit label you provide; they are not converted, used to rank methods, or processed by an IPR/VLP calculation. The qualitative levels are not universal operating cutoffs.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField label="Current oil rate" value={form.current_oil_rate} unit={form.liquid_rate_unit ?? undefined} onChange={(value) => setField("current_oil_rate", value)} />
            <NumberField label="Current liquid rate" value={form.current_liquid_rate} unit={form.liquid_rate_unit ?? undefined} onChange={(value) => setField("current_liquid_rate", value)} />
            <NumberField label="Target liquid rate" value={form.target_liquid_rate} unit={form.liquid_rate_unit ?? undefined} onChange={(value) => setField("target_liquid_rate", value)} />
            <NumberField label="Current gas rate" value={form.current_gas_rate} unit={form.gas_rate_unit ?? undefined} onChange={(value) => setField("current_gas_rate", value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block space-y-1.5"><span className="field-label">Liquid-rate unit</span><input className="text-input w-full" value={form.liquid_rate_unit ?? ""} onChange={(event) => setField("liquid_rate_unit", event.target.value || null)} placeholder="STB/day, m³/day…" /></label>
            <label className="block space-y-1.5"><span className="field-label">Gas-rate unit</span><input className="text-input w-full" value={form.gas_rate_unit ?? ""} onChange={(event) => setField("gas_rate_unit", event.target.value || null)} placeholder="scf/day, Sm³/day…" /></label>
            <SelectField label="Target production duty" value={form.rate_duty} options={levelOptions} onChange={(value) => setField("rate_duty", value as LiftScreeningRequest["rate_duty"])} help="Use your project/field categories; the screen applies no fixed numeric cutoffs." />
            <SelectField label="Fluid viscosity category" value={form.fluid_viscosity} options={levelOptions} onChange={(value) => setField("fluid_viscosity", value as LiftScreeningRequest["fluid_viscosity"])} />
            <SelectField label="Free gas at/near intake" value={form.free_gas_fraction} options={levelOptions} onChange={(value) => setField("free_gas_fraction", value as LiftScreeningRequest["free_gas_fraction"])} help="If only surface GOR is known, do not treat it as intake free-gas fraction." />
            <SelectField label="Solids / sand loading" value={form.solids_loading} options={levelOptions} onChange={(value) => setField("solids_loading", value as LiftScreeningRequest["solids_loading"])} />
          </div>
          <details className="rounded-lg border border-line bg-[#eaf0f6] p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">Add measured pressure context (not a nodal calculation)</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField label="Reservoir pressure" value={form.reservoir_pressure} unit={form.pressure_unit ?? undefined} min={0.001} onChange={(value) => setField("reservoir_pressure", value)} />
              <NumberField label="Flowing BHP" value={form.flowing_bhp} unit={form.pressure_unit ?? undefined} min={0.001} onChange={(value) => setField("flowing_bhp", value)} />
              <NumberField label="Bubble-point pressure" value={form.bubble_point_pressure} unit={form.pressure_unit ?? undefined} min={0.001} onChange={(value) => setField("bubble_point_pressure", value)} />
              <label className="block space-y-1.5"><span className="field-label">Pressure unit</span><input className="text-input w-full" value={form.pressure_unit ?? ""} onChange={(event) => setField("pressure_unit", event.target.value || null)} placeholder="psi, kPa…" /></label>
              <label className="block space-y-1.5 sm:col-span-2"><span className="field-label">Pressure observation date (optional)</span><input className="text-input w-full" type="date" value={form.pressure_measurement_date ?? ""} onChange={(event) => setField("pressure_measurement_date", event.target.value || null)} /></label>
            </div>
          </details>
        </section>

        <section className="panel-card space-y-4 p-4 sm:p-6">
          <div><p className="eyebrow">03 · Well and operating environment</p><h3 className="mt-1 text-lg font-bold text-slate-900">Describe geometry and application context</h3></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField label="Well trajectory" value={form.trajectory} options={[["unknown", "Unknown / not supplied"], ["vertical", "Vertical / near-vertical"], ["deviated", "Deviated"], ["highly_deviated", "Highly deviated / horizontal"],]} onChange={(value) => setField("trajectory", value as LiftScreeningRequest["trajectory"])} />
            <SelectField label="Asset setting" value={form.setting} options={[["unknown", "Unknown / not supplied"], ["onshore", "Onshore"], ["offshore", "Offshore"], ["subsea", "Subsea"],]} onChange={(value) => setField("setting", value as LiftScreeningRequest["setting"])} />
            <SelectField label="Gas-well liquid-loading concern" value={form.liquid_loading_concern} options={[["unknown", "Unknown / not supplied"], ["yes", "Yes · evidence available"], ["no", "No"],]} onChange={(value) => setField("liquid_loading_concern", value as LiftScreeningRequest["liquid_loading_concern"])} help="Only used to screen the optional plunger-lift branch." />
          </div>
        </section>

        <section className="panel-card space-y-4 p-4 sm:p-6">
          <div><p className="eyebrow">04 · Required-resource availability</p><h3 className="mt-1 text-lg font-bold text-slate-900">State what the field can actually support</h3><p className="mt-1 text-xs leading-5 text-slate-500">“Unavailable” is a preliminary blocker in this screen. “Unknown” remains unresolved and is never silently treated as available.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField label="Reliable electrical power" value={form.electric_power} options={resourceOptions} onChange={(value) => setField("electric_power", value as ResourceState)} />
            <SelectField label="Injection-gas supply and compression" value={form.injection_gas_system} options={resourceOptions} onChange={(value) => setField("injection_gas_system", value as ResourceState)} />
            <SelectField label="Produced-gas handling capacity" value={form.gas_handling_capacity} options={resourceOptions} onChange={(value) => setField("gas_handling_capacity", value as ResourceState)} />
            <SelectField label="Rod-pump completion/intervention access" value={form.rod_pump_access} options={resourceOptions} onChange={(value) => setField("rod_pump_access", value as ResourceState)} />
            <SelectField label="PCP-compatible surface drive and service" value={form.pcp_surface_drive} options={resourceOptions} onChange={(value) => setField("pcp_surface_drive", value as ResourceState)} />
            <SelectField label="Hydraulic power-fluid circuit" value={form.hydraulic_power_fluid} options={resourceOptions} onChange={(value) => setField("hydraulic_power_fluid", value as ResourceState)} />
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" className="primary-button min-h-11" disabled={busy}>
            {busy ? <><LoaderCircle size={16} className="animate-spin" /> Screening supplied inputs…</> : "Screen lift options"}
          </button>
          <button type="button" className="secondary-button min-h-11" onClick={() => { setForm(initialForm); setResult(null); setError(null); }}>Clear inputs</button>
          <span className="text-xs text-slate-500">The API returns a qualitative shortlist; it does not choose equipment.</span>
        </div>
        {error && <div role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-800">{error}</div>}
      </form>

      {result && (
        <section aria-live="polite" className="space-y-5">
          <div className="panel-card border-cyan/20 p-4 sm:p-6">
            <p className="eyebrow">Screen result · rule set {result.screen_version}</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Preliminary candidates for engineering evaluation</h3>
            <p className="mt-3 text-sm leading-6 text-amber-900">{result.need_assessment}</p>
            {result.lift_need_evidence && <p className="mt-2 rounded-lg border border-line bg-[#eaf0f6] p-3 text-sm leading-5 text-slate-700"><strong className="text-slate-800">User-provided evidence note:</strong> {result.lift_need_evidence}</p>}
            <p className="mt-3 text-xs font-medium text-slate-500">{result.method_input_status === "insufficient_for_preliminary_comparison" ? "Method-input status: insufficient to order candidates; priority ranks are withheld." : "Method-input status: enough explicit inputs for a preliminary comparison only."}</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{result.interpretation}</p>
            <div className="mt-4 flex gap-2 rounded-lg border border-line bg-[#eaf0f6] p-3 text-xs leading-5 text-slate-500"><CircleHelp size={15} className="mt-0.5 shrink-0 text-cyan" /><span>{result.ranking_method}</span></div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {result.numeric_context.well_id && <span className="rounded-full border border-line px-3 py-1.5 text-slate-700">Well {result.numeric_context.well_id}</span>}
              {result.numeric_context.current_oil_rate != null && <span className="rounded-full border border-line px-3 py-1.5 text-slate-700">Oil {result.numeric_context.current_oil_rate} {result.numeric_context.liquid_rate_unit}</span>}
              {result.numeric_context.flowing_bhp != null && <span className="rounded-full border border-line px-3 py-1.5 text-slate-700">BHP {result.numeric_context.flowing_bhp} {result.numeric_context.pressure_unit}</span>}
              {result.numeric_context.pressure_measurement_date && <span className="rounded-full border border-line px-3 py-1.5 text-slate-700">Pressure date {result.numeric_context.pressure_measurement_date}</span>}
            </div>
          </div>

          <div className="space-y-4">
            {result.candidates.map((candidate) => {
              const style = candidateStatus[candidate.status];
              return (
                <article key={candidate.method} className="panel-card p-4 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div><p className="eyebrow">{candidate.priority_rank ? `Provisional order ${candidate.priority_rank}${candidate.tied_rank ? " · tied" : ""}` : "Not ranked · insufficient inputs"}</p><h3 className="mt-1 text-lg font-bold text-slate-900">{candidate.method}</h3></div>
                    <span className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-medium ${style.className}`}>{style.label}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{candidate.basis}</p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <ResultList title="Supporting inputs" items={candidate.supporting_evidence} />
                      <ResultList title="Counter-evidence / application risks" items={candidate.counter_evidence} tone="caution" />
                      <ResultList title="Explicit blockers" items={candidate.hard_blocks} tone="blocked" />
                      <ResultList title="Unknown / missing for this method" items={candidate.missing_inputs} tone="caution" />
                    </div>
                    <div className="rounded-lg border border-line bg-[#eaf0f6] p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Next engineering checks</h4>
                      <ul className="mt-3 space-y-2">{candidate.next_checks.map((check) => <li key={check} className="text-sm leading-5 text-slate-700">• {check}</li>)}</ul>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <article className="panel-card p-4 sm:p-6">
            <details className="mb-5 rounded-lg border border-line bg-[#eaf0f6] p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">Show submitted input snapshot</summary>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(result.input_context).map(([key, value]) => <div key={key} className="rounded-md border border-line/70 px-3 py-2"><dt className="text-[11px] uppercase tracking-wide text-slate-500">{key.replaceAll("_", " ")}</dt><dd className="mt-1 break-words text-sm text-slate-700">{value === null ? "Unknown / not supplied" : String(value)}</dd></div>)}</dl>
            </details>
            <h3 className="text-lg font-bold text-slate-900">Information still required for a defensible selection</h3>
            <p className="mt-1 text-sm text-slate-500">These are not inferred from production decline, and the screen does not calculate them.</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">{result.global_missing_information.map((item) => <li key={item} className="flex gap-2 text-sm leading-5 text-slate-700"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-800" /><span>{item}</span></li>)}</ul>
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Methodology references</p>
              <ul className="mt-2 space-y-2">{result.sources.map((source) => {
                const [citation, url] = source.split(" — ");
                return <li key={source} className="text-sm"><a className="subtle-link" href={url} target="_blank" rel="noreferrer">{citation}</a></li>;
              })}</ul>
            </div>
          </article>
          <p className="rounded-lg border border-amber-300/25 bg-amber-300/5 p-4 text-sm leading-6 text-amber-900">This prototype does not solve IPR/VLP or nodal analysis, confirm reservoir drive mechanism, model lift design, size equipment, compare project economics, or validate an AI recommendation. Obtain a well-specific design and qualified engineering review before making an operational decision. See the <Link className="subtle-link" to="/reservoir">reservoir context</Link> and project methodology references.</p>
        </section>
      )}
    </section>
  );
}
