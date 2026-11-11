import { ArrowRight, CheckCircle2, CircleHelp, Database, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useApiStatusContext } from "../app/apiStatusContext";

function StatusBadge({ label, tone }: { label: string; tone: "green" | "amber" | "slate" }) {
  const toneClass = tone === "green" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : tone === "amber" ? "border-amber-300/25 bg-amber-300/10 text-amber-200" : "border-line bg-panel text-slate-300";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${toneClass}`}>{label}</span>;
}

export function OverviewPage() {
  const { connection, health, capabilities, error } = useApiStatusContext();
  const modelNames = capabilities?.analysis_models ?? [];

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 border-b border-line pb-7 xl:flex-row xl:items-end">
        <div className="max-w-3xl">
          <p className="eyebrow">Production surveillance · research workspace</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Well analytics workspace</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Review production evidence and prototype forecasts. Results are shown only when supplied by the project API; this workspace does not invent field measurements.
          </p>
        </div>
        <Link to="/datasets" className="primary-action self-start xl:self-auto">
          <Database size={16} aria-hidden="true" /> Open dataset manager <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="panel-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Current session</p>
              <h3 className="mt-2 text-lg font-semibold text-white">No dataset loaded</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Upload a production-history table to populate well counts, latest rates, pressure history, and chart series. Files stay in this browser session and are not saved by this app.</p>
            </div>
            <StatusBadge label="Awaiting data" tone="slate" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {["Wells", "Oil rate", "Gas rate", "Water cut"].map((label) => (
              <div key={label} className="metric-placeholder">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="mt-2 block font-mono text-2xl text-slate-500">—</span>
                <span className="mt-1 block text-[10px] text-slate-600">No dataset loaded</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">API service</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Connection status</h3>
            </div>
            {connection === "connected" ? <StatusBadge label="Connected" tone="green" /> : connection === "checking" ? <StatusBadge label="Checking" tone="amber" /> : <StatusBadge label="Unavailable" tone="amber" />}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            {connection === "connected" ? `FastAPI ${health?.api_version ?? ""} returned a healthy response.` : connection === "checking" ? "Checking the configured FastAPI origin…" : error ?? "Start the local FastAPI service or update its URL in Settings."}
          </p>
          <div className="mt-5 border-t border-line pt-4 text-xs leading-5 text-slate-500">
            {capabilities?.disclaimer ?? "The API reports capabilities after it responds. The current backend is a research prototype."}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-lg border border-cyan/20 bg-cyan/10 p-2 text-cyan"><CheckCircle2 size={17} /></span>
            <div>
              <p className="eyebrow">Available from the current API</p>
              <h3 className="mt-1 text-base font-semibold text-white">Implemented model paths</h3>
            </div>
          </div>
          {connection === "connected" && capabilities ? (
            <div className="mt-5 space-y-4">
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Analysis baselines</p>
                <div className="flex flex-wrap gap-2">{modelNames.map((name) => <span key={name} className="soft-chip">{name}</span>)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="soft-chip">Trainable: {capabilities.optional_trainable_model}</span>
                <span className="soft-chip">Formats: {capabilities.input_formats.join(", ")}</span>
              </div>
              <p className="text-xs leading-5 text-slate-500">Capability values are read from <code>/v1/capabilities</code>. They may change when the backend changes.</p>
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">Connect the API to read the capability list. No model accuracy or dataset summary is fabricated here.</p>
          )}
        </article>

        <article className="panel-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-2 text-amber-200"><ShieldAlert size={17} /></span>
            <div>
              <p className="eyebrow">Engineering boundary</p>
              <h3 className="mt-1 text-base font-semibold text-white">What this build does not decide</h3>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm leading-6 text-slate-400">
            <p>The current API does not confirm reservoir drive mechanism, solve IPR/VLP or nodal analysis, forecast pressure, predict a validated natural-flow transition, or recommend artificial lift.</p>
            <p>Arps threshold crossing is a fitted scenario, not a lift trigger. A lift shortlist is planned as a separate, input-driven engineering screening feature.</p>
          </div>
          <Link to="/artificial-lift" className="subtle-link mt-4">Read lift screening status <ArrowRight size={14} /></Link>
        </article>
      </section>

      <section className="panel-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-lg border border-line bg-[#152238] p-2 text-slate-300"><CircleHelp size={17} /></span>
          <div>
            <p className="text-sm font-medium text-slate-200">Start with a clean data contract</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Required fields: well identifier, observation date, and oil rate. Units are documented—not converted—by the current API.</p>
          </div>
        </div>
        <Link to="/datasets" className="subtle-link shrink-0">Review upload workflow <ArrowRight size={14} /></Link>
      </section>
    </div>
  );
}
