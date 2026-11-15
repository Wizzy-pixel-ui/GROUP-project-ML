export type CanonicalField =
  | "well_id"
  | "date"
  | "oil_rate"
  | "gas_rate"
  | "water_rate"
  | "reservoir_pressure"
  | "bhp"
  | "bubble_point_pressure"
  | "initial_reservoir_pressure"
  | "gor"
  | "water_cut"
  | "choke"
  | "lift_active"
  | "lift_type"
  | "reservoir_type"
  | "drive_mechanism"
  | "region"
  | "well_status"
  | "shut_in_flag"
  | "workover_flag";

export interface UploadPreview {
  filename: string;
  row_count: number;
  columns: string[];
  preview_rows: Array<Record<string, unknown>>;
  missing_by_column: Record<string, number>;
  mapped_columns: string[];
  missing_required: string[];
  invalid_date_count: number | null;
  invalid_oil_rate_count: number | null;
  duplicate_well_date_rows: number | null;
  median_observation_interval_days: number | null;
  min_observation_interval_days: number | null;
  max_observation_interval_days: number | null;
  distinct_observation_intervals: number | null;
  wells_with_intervals: number;
  note: string;
}

export interface HistoryPoint {
  date: string;
  oil_rate: number;
  gas_rate?: number | null;
  water_rate?: number | null;
  reservoir_pressure?: number | null;
  bhp?: number | null;
  bubble_point_pressure?: number | null;
  lift_active?: boolean | null;
  [field: string]: unknown;
}

export interface ForecastPoint {
  date: string;
  month_ahead: number;
  arps_oil_rate: number;
  persistence_oil_rate: number;
}

export interface WellAnalysis {
  well_id: string;
  row_count: number;
  start_date: string;
  end_date: string;
  positive_rate_observations: number;
  zero_rate_observations: number;
  units: Record<string, string>;
  well_context: Record<string, unknown>;
  trend: {
    direction: string;
    linear_slope_rate_per_month: number;
    percent_change_first_to_last: number | null;
    first_rate: number;
    last_rate: number;
  };
  arps_fit: Record<string, unknown> & {
    decline_type: string;
    initial_rate_qi: number;
    nominal_decline_di_per_month: number;
    hyperbolic_b: number;
    aicc_training_fit_diagnostic: number;
    positive_observations_used: number;
    note: string;
  };
  threshold_check: {
    threshold_rate: number | null;
    status: string;
    label_type: string;
    first_sustained_below_threshold_date: string | null;
    note: string;
  };
  history: HistoryPoint[];
  forecast: ForecastPoint[];
  hgb_prediction: {
    model_id: string;
    horizon_steps: number;
    predicted_date: string;
    predicted_oil_rate: number;
    validation_metrics: Record<string, number>;
    note: string;
  } | null;
  pressure_history_available: boolean;
  visualizations: Record<string, unknown> & { three_d_available: boolean };
  artificial_lift: { status: string; recommendation: string | null; reason: string };
}

export interface AnalysisResponse {
  api_version: string;
  results: WellAnalysis[];
  warnings: string[];
}

export interface TrainingResponse {
  model_id: string;
  algorithm: string;
  target: string;
  horizon_steps: number;
  training_rows: number;
  training_wells: number;
  validation_wells: number;
  validation_metrics: Record<string, number>;
  excluded_well_ids: string[];
  persistence_mae: number;
  storage: string;
  warning: string;
}
