export type ResourceState = "available" | "unavailable" | "unknown";
export type WellType = "oil" | "gas" | "unknown";
export type LiftNeedState = "engineering_confirmed_by_user" | "suspected_by_user" | "not_established";
export type QualitativeLevel = "low" | "moderate" | "high" | "unknown";
export type Trajectory = "vertical" | "deviated" | "highly_deviated" | "unknown";
export type Setting = "onshore" | "offshore" | "subsea" | "unknown";
export type LiquidLoadingState = "yes" | "no" | "unknown";
export type CandidateStatus = "screening_candidate" | "conditional" | "unknown" | "screened_out";

export interface LiftScreeningRequest {
  well_id: string | null;
  well_type: WellType;
  lift_need_state: LiftNeedState;
  lift_need_evidence: string | null;
  current_oil_rate: number | null;
  current_liquid_rate: number | null;
  target_liquid_rate: number | null;
  current_gas_rate: number | null;
  liquid_rate_unit: string | null;
  gas_rate_unit: string | null;
  reservoir_pressure: number | null;
  flowing_bhp: number | null;
  bubble_point_pressure: number | null;
  pressure_unit: string | null;
  pressure_measurement_date: string | null;
  rate_duty: QualitativeLevel;
  fluid_viscosity: QualitativeLevel;
  free_gas_fraction: QualitativeLevel;
  solids_loading: QualitativeLevel;
  trajectory: Trajectory;
  setting: Setting;
  liquid_loading_concern: LiquidLoadingState;
  electric_power: ResourceState;
  injection_gas_system: ResourceState;
  gas_handling_capacity: ResourceState;
  rod_pump_access: ResourceState;
  pcp_surface_drive: ResourceState;
  hydraulic_power_fluid: ResourceState;
}

export interface LiftCandidateResult {
  method: string;
  status: CandidateStatus;
  priority_rank: number | null;
  tied_rank: boolean;
  basis: string;
  supporting_evidence: string[];
  counter_evidence: string[];
  hard_blocks: string[];
  missing_inputs: string[];
  next_checks: string[];
}

export interface LiftScreeningResponse {
  screen_version: string;
  method_input_status: "insufficient_for_preliminary_comparison" | "preliminary_comparison_possible";
  screening_status:
    | "need_not_established"
    | "need_user_marked_suspected"
    | "need_user_marked_confirmed_unverified"
    | "insufficient_method_inputs"
    | "preliminary_candidates_only";
  need_assessment: string;
  lift_need_state: LiftNeedState;
  lift_need_evidence: string | null;
  interpretation: string;
  ranking_method: string;
  input_context: Record<string, string | number | null>;
  numeric_context: Record<string, string | number | null>;
  candidates: LiftCandidateResult[];
  global_missing_information: string[];
  sources: string[];
}
