export interface HealthResponse {
  status: string;
  api_version: string;
}

export interface CapabilitiesResponse {
  api_version: string;
  input_formats: string[];
  required_columns: string[];
  analysis_models: string[];
  optional_trainable_model: string;
  pressure_forecast_available: boolean;
  natural_flow_transition_classifier_available: boolean;
  artificial_lift_recommendation_available: boolean;
  three_dimensional_reservoir_visualization_data_available: boolean;
  model_registry: string;
  disclaimer: string;
}

export type ApiConnection = "checking" | "connected" | "offline";

export interface ApiStatusValue {
  connection: ApiConnection;
  health: HealthResponse | null;
  capabilities: CapabilitiesResponse | null;
  error: string | null;
  refresh: () => Promise<void>;
}
