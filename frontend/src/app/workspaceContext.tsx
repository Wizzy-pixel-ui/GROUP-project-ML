import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { AnalysisResponse, CanonicalField, TrainingResponse, UploadPreview } from "../types/analysis";

export const canonicalFields: Array<{ field: CanonicalField; label: string; required?: boolean }> = [
  { field: "well_id", label: "Well identifier", required: true },
  { field: "date", label: "Observation date", required: true },
  { field: "oil_rate", label: "Oil rate", required: true },
  { field: "gas_rate", label: "Gas rate" },
  { field: "water_rate", label: "Water rate" },
  { field: "reservoir_pressure", label: "Reservoir pressure" },
  { field: "bhp", label: "Flowing bottom-hole pressure (BHP)" },
  { field: "bubble_point_pressure", label: "Bubble-point pressure" },
  { field: "initial_reservoir_pressure", label: "Initial reservoir pressure" },
  { field: "gor", label: "Gas–oil ratio (GOR)" },
  { field: "water_cut", label: "Water cut" },
  { field: "choke", label: "Choke setting" },
  { field: "lift_active", label: "Artificial lift active (true/false)" },
  { field: "lift_type", label: "Lift type" },
  { field: "reservoir_type", label: "Reservoir type" },
  { field: "drive_mechanism", label: "Drive mechanism (documented)" },
  { field: "region", label: "Region / field" },
  { field: "well_status", label: "Well status" },
  { field: "shut_in_flag", label: "Shut-in flag (true/false)" },
  { field: "workover_flag", label: "Workover flag (true/false)" },
];

export interface WorkspaceState {
  file: File | null;
  preview: UploadPreview | null;
  diagnostics: UploadPreview | null;
  mapping: Partial<Record<CanonicalField, string>>;
  units: { oil_rate: string; gas_rate: string; water_rate: string; pressure: string };
  thresholdRate: string;
  minConsecutivePeriods: number;
  forecastHorizonMonths: number;
  analysis: AnalysisResponse | null;
  selectedWellId: string;
  chartVariable: "oil_rate" | "gas_rate" | "water_rate" | "reservoir_pressure" | "bhp" | "bubble_point_pressure";
  dateFrom: string;
  dateTo: string;
  busy: string | null;
  error: string | null;
  training: TrainingResponse | null;
  trainingHorizonSteps: number;
  excludedWellIds: string;
}

const initialWorkspace: WorkspaceState = {
  file: null,
  preview: null,
  diagnostics: null,
  mapping: {},
  units: { oil_rate: "", gas_rate: "", water_rate: "", pressure: "" },
  thresholdRate: "",
  minConsecutivePeriods: 2,
  forecastHorizonMonths: 12,
  analysis: null,
  selectedWellId: "",
  chartVariable: "oil_rate",
  dateFrom: "",
  dateTo: "",
  busy: null,
  error: null,
  training: null,
  trainingHorizonSteps: 1,
  excludedWellIds: "",
};

const WorkspaceContext = createContext<{ state: WorkspaceState; setState: Dispatch<SetStateAction<WorkspaceState>> } | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(initialWorkspace);
  const value = useMemo(() => ({ state, setState }), [state]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be called inside WorkspaceProvider");
  return value;
}

export function getColumnMap(mapping: Partial<Record<CanonicalField, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(mapping).filter((entry): entry is [string, string] => Boolean(entry[1])) .map(([canonical, source]) => [source, canonical]));
}
