import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HistoryPoint, WellAnalysis } from "../../types/analysis";

export type ChartVariable = "oil_rate" | "gas_rate" | "water_rate" | "reservoir_pressure" | "bhp" | "bubble_point_pressure";

const labels: Record<ChartVariable, string> = {
  oil_rate: "Oil rate",
  gas_rate: "Gas rate",
  water_rate: "Water rate",
  reservoir_pressure: "Reservoir pressure",
  bhp: "Flowing bottom-hole pressure (BHP)",
  bubble_point_pressure: "Bubble-point pressure",
};

export function ProductionChart({ result, thresholdRate, variable = "oil_rate", dateFrom = "", dateTo = "" }: {
  result: WellAnalysis;
  thresholdRate?: number | null;
  variable?: ChartVariable;
  dateFrom?: string;
  dateTo?: string;
}) {
  const history = result.history
    .filter((point) => (!dateFrom || point.date >= dateFrom) && (!dateTo || point.date <= dateTo))
    .map((point: HistoryPoint) => ({
      date: point.date,
      observed: typeof point[variable] === "number" ? point[variable] as number : null,
      arps: null as number | null,
      persistence: null as number | null,
    }));
  const forecasts = variable === "oil_rate" ? result.forecast
    .filter((point) => (!dateFrom || point.date >= dateFrom) && (!dateTo || point.date <= dateTo))
    .map((point) => ({ date: point.date, observed: null as number | null, arps: point.arps_oil_rate, persistence: point.persistence_oil_rate })) : [];
  const chartData = [...history, ...forecasts];
  const unitKey = variable === "gas_rate" ? "gas_rate" : variable === "water_rate" ? "water_rate" : variable === "bhp" || variable === "reservoir_pressure" || variable === "bubble_point_pressure" ? "pressure" : "oil_rate";
  const unit = result.units[unitKey] ?? "source unit not documented";
  const hasObserved = history.some((point) => point.observed != null);

  return (
    <div className="panel-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Well {result.well_id}</p><h3 className="mt-1 font-bold text-slate-900">{labels[variable]} history{variable === "oil_rate" ? " and forecast" : ""}</h3><p className="mt-1 text-xs font-medium text-slate-600">{labels[variable]} · {unit}{dateFrom || dateTo ? ` · ${dateFrom || "start"} to ${dateTo || "latest"}` : ""}</p></div><div className="flex flex-wrap gap-2 text-[11px]"><span className="soft-chip"><i className="mr-2 inline-block h-0.5 w-3 bg-cyan" />Observed</span>{variable === "oil_rate" && <><span className="soft-chip"><i className="mr-2 inline-block h-0.5 w-3 bg-amber-600" />Arps</span><span className="soft-chip"><i className="mr-2 inline-block h-0.5 w-3 bg-slate-500" />Persistence</span></>}</div></div>
      {!hasObserved ? <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-line text-sm text-slate-500">No {labels[variable].toLowerCase()} observations are available for this well and date window.</div> : <div className="h-[300px] w-full sm:h-[360px]" role="img" aria-label={`${labels[variable]} for well ${result.well_id}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 14, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#dbe4ef" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(0, 7)} tick={{ fill: "#53657b", fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: "#cbd6e3" }} tickLine={false} minTickGap={28} />
            <YAxis tick={{ fill: "#53657b", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={58} />
            <Tooltip contentStyle={{ background: "#f8fbff", border: "1px solid #ffffff", borderRadius: 14, color: "#26364a", fontSize: 13, fontWeight: 600, boxShadow: "6px 6px 16px rgba(132,153,180,.22), -4px -4px 12px #fff" }} labelStyle={{ color: "#52657c", fontWeight: 700 }} formatter={(value, name) => { const numeric = typeof value === "number" ? value : Number(value); const formatted = value == null || !Number.isFinite(numeric) ? "—" : `${numeric.toFixed(2)} ${unit}`; const seriesName = name === "observed" ? `Observed ${labels[variable].toLowerCase()}` : name === "arps" ? "Arps scenario" : "Persistence reference"; return [formatted, seriesName]; }} labelFormatter={(label) => `Date: ${String(label ?? "")}`} />
            {variable === "oil_rate" && thresholdRate != null && <ReferenceLine y={thresholdRate} stroke="#b63d4a" strokeDasharray="5 4" label={{ value: "User threshold", fill: "#8e2631", fontSize: 11, position: "insideTopRight" }} />}
            <Line type="monotone" dataKey="observed" name="observed" stroke="#2878d0" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#2878d0", stroke: "#fff", strokeWidth: 3 }} connectNulls={false} animationDuration={700} animationEasing="ease-out" />
            {variable === "oil_rate" && <><Line type="monotone" dataKey="arps" name="arps" stroke="#c07b12" strokeWidth={2.5} strokeDasharray="7 5" dot={false} activeDot={{ r: 4 }} connectNulls={false} animationDuration={900} animationEasing="ease-out" /><Line type="monotone" dataKey="persistence" name="persistence" stroke="#687b92" strokeWidth={2} strokeDasharray="3 5" dot={false} activeDot={{ r: 4 }} connectNulls={false} animationDuration={1100} animationEasing="ease-out" /></>}
          </LineChart>
        </ResponsiveContainer>
      </div>}
      <p className="mt-2 text-[10px] leading-4 text-slate-500">{variable === "oil_rate" ? "Arps and persistence are API-generated reference series, not calibrated transition predictions or production recommendations. The threshold is an observed-rule setting, not a lift trigger." : "This panel displays submitted measurements only; the current API does not forecast pressure, gas rate, or water rate."}</p>
    </div>
  );
}
