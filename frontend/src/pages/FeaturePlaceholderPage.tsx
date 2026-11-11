import { ArrowRight, CircleHelp, Database, FileQuestion, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

const pageInfo = {
  production: {
    title: "Production analytics",
    eyebrow: "History and rate trends",
    status: "Not connected yet",
    description: "The API can return dated oil, gas, water and pressure observations plus Arps and persistence oil-rate series. Interactive well selection, filtering, charts and downloadable tables will be wired in the dataset-analysis phase.",
    note: "No production values are shown until a dataset is loaded and analyzed.",
  },
  wells: {
    title: "Well performance",
    eyebrow: "Per-well evidence",
    status: "Not connected yet",
    description: "This view will combine a selected well’s history, trend summary, Arps fit, threshold result and optional HGB point forecast from the API response.",
    note: "The current backend requires at least six positive oil-rate observations per well for Arps fitting.",
  },
  reservoir: {
    title: "Reservoir analysis",
    eyebrow: "Pressure and fluid context",
    status: "Limited data support",
    description: "Dated pressure and bubble-point values can support a pressure comparison once unit compatibility is confirmed. That comparison is a fluid-state observation; it cannot prove the reservoir drive mechanism.",
    note: "Material balance, solution-gas evolution simulation and pressure forecasting are not implemented in the current API.",
  },
  "natural-flow": {
    title: "Natural-flow assessment",
    eyebrow: "Observed rule vs. engineering diagnosis",
    status: "Rule only · no event model",
    description: "The API can report an observed threshold status when a threshold and relevant lift-state history are supplied. It does not solve well deliverability or predict a validated future transition.",
    note: "A decline in oil rate alone is not evidence that natural flow has become inadequate.",
  },
  "artificial-lift": {
    title: "Artificial-lift screening",
    eyebrow: "Engineering decision support",
    status: "Screening engine planned · not available yet",
    description: "The current API returns no lift recommendation. A planned Python screening engine will compare gas lift, ESP, sucker-rod pump, PCP and hydraulic lift, with a gas-well plunger-lift branch where relevant.",
    note: "A future shortlist will show feasibility, reasons, missing inputs, assumptions and sensitivity. It will not replace IPR/VLP/nodal analysis, vendor design, facilities review or qualified engineering judgment.",
  },
  models: {
    title: "Machine-learning workspace",
    eyebrow: "Train and inspect",
    status: "Not connected yet",
    description: "The existing API supports an HGB model trained from multiwell data with one held-out-well split and a persistence baseline. Training forms, returned metrics and model-ID handling will be added next.",
    note: "Horizon steps count rows, not calendar months. The model registry is in memory and is cleared on API restart.",
  },
  predictions: {
    title: "Predictions",
    eyebrow: "Forecast output",
    status: "Not connected yet",
    description: "The existing API returns Arps and persistence oil-rate series. If a valid in-process HGB model ID is supplied, it can return a single oil-rate prediction at its trained row horizon.",
    note: "The API does not currently return pressure forecasts, calibrated transition probabilities, or HGB forecasts for future operating-variable paths.",
  },
  datasets: {
    title: "Dataset management",
    eyebrow: "Upload · preview · map · validate",
    status: "Upload workflow in progress",
    description: "The current API accepts CSV, XLS, XLSX, Parquet and JSON analysis uploads, with explicit source-column mapping. The browser preview, data-quality report and analysis submission are in the next implementation increment.",
    note: "The API enforces a 25 MB upload limit, requires well_id/date/oil_rate, rejects duplicate well/date records and does not convert units.",
  },
  reports: {
    title: "Reports",
    eyebrow: "Traceable output",
    status: "Export workflow planned",
    description: "CSV and JSON exports will be added after analysis results are connected. Reports must preserve source, units, model settings, assumptions and limitations.",
    note: "No engineering report or PDF is generated in this build increment.",
  },
  visualization: {
    title: "3D & monitoring",
    eyebrow: "Geometry and data provenance",
    status: "Unavailable · no geometry source",
    description: "The current repository does not contain reservoir surfaces, grid geometry or a complete well-trajectory dataset for a measured 3D model. A future simulation, if added, must be labeled simulated.",
    note: "No live field-instrument connection is configured. This page contains no generated values or pseudo-live chart.",
  },
  "not-found": {
    title: "Page not found",
    eyebrow: "Navigation",
    status: "Unknown route",
    description: "This route is not part of the application.",
    note: "Use the sidebar to open an available workspace.",
  },
} as const;

export type FeaturePageKey = keyof typeof pageInfo;

export function FeaturePlaceholderPage({ page }: { page: FeaturePageKey }) {
  const info = pageInfo[page];
  const isLift = page === "artificial-lift";
  const isData = page === "datasets";
  const Icon = isLift ? ShieldAlert : isData ? Database : FileQuestion;

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="eyebrow">{info.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">{info.title}</h2>
      </div>
      <article className="panel-card p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-200"><Icon size={21} /></span>
          <div>
            <span className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[11px] font-medium text-amber-100">{info.status}</span>
            <h3 className="mt-4 text-lg font-semibold text-white">This page is a status view, not an implemented calculation.</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{info.description}</p>
            <div className="mt-5 rounded-lg border border-line bg-[#0c1523] p-4 text-sm leading-6 text-slate-400">{info.note}</div>
            {isLift && <p className="mt-4 text-xs leading-5 text-slate-500">The evidence-based screening method and candidate trade-offs are documented in <code>docs/artificial_lift_selection_methodology.md</code>.</p>}
            {page === "not-found" && <Link to="/" className="subtle-link mt-5">Return to overview <ArrowRight size={14} /></Link>}
          </div>
        </div>
      </article>
      <article className="rounded-xl border border-line/80 bg-[#0e1928] p-4 text-xs leading-5 text-slate-500">
        <div className="flex items-start gap-2"><CircleHelp size={15} className="mt-0.5 shrink-0 text-slate-400" /><p>Do not treat a visible navigation page as evidence that a backend calculation exists. Capabilities are reported by the FastAPI service and will only be shown as available after implementation and verification.</p></div>
      </article>
    </section>
  );
}
