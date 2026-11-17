import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiStatusContext } from "../app/apiStatusContext";
import { WorkspaceProvider } from "../app/workspaceContext";
import { analyzeUpload, previewUpload } from "../services/api";
import type { AnalysisResponse, UploadPreview } from "../types/analysis";
import type { ApiStatusValue } from "../types/api";
import { DatasetManagerPage } from "./DatasetManagerPage";

vi.mock("../services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/api")>();
  return { ...actual, previewUpload: vi.fn(), analyzeUpload: vi.fn() };
});

const preview: UploadPreview = {
  filename: "history.csv",
  row_count: 6,
  columns: ["well_id", "date", "oil_rate"],
  preview_rows: [
    { well_id: "W-1", date: "2024-01-01", oil_rate: 120 },
    { well_id: "W-1", date: "2024-02-01", oil_rate: 115 },
  ],
  missing_by_column: { well_id: 0, date: 0, oil_rate: 0 },
  mapped_columns: ["well_id", "date", "oil_rate"],
  missing_required: [],
  invalid_date_count: 0,
  invalid_oil_rate_count: 0,
  duplicate_well_date_rows: 0,
  median_observation_interval_days: 31,
  min_observation_interval_days: 28,
  max_observation_interval_days: 31,
  distinct_observation_intervals: 2,
  wells_with_intervals: 1,
  note: "Preview reads the submitted file in memory.",
};

const analysis: AnalysisResponse = {
  api_version: "0.1.0",
  warnings: ["Arps is a decline-curve baseline."],
  results: [{
    well_id: "W-1",
    row_count: 6,
    start_date: "2024-01-01",
    end_date: "2024-06-01",
    positive_rate_observations: 6,
    zero_rate_observations: 0,
    units: { oil_rate: "STB/day" },
    well_context: {},
    trend: { direction: "declining", linear_slope_rate_per_month: -1, percent_change_first_to_last: -8, first_rate: 120, last_rate: 110 },
    arps_fit: { decline_type: "exponential", initial_rate_qi: 120, nominal_decline_di_per_month: 0.02, hyperbolic_b: 0, aicc_training_fit_diagnostic: 3, positive_observations_used: 6, note: "AICc is a fit diagnostic." },
    threshold_check: { threshold_rate: null, status: "threshold_not_set", label_type: "transparent_observed_rule", first_sustained_below_threshold_date: null, note: "Observed rule only." },
    history: [{ date: "2024-06-01", oil_rate: 110 }],
    forecast: [{ date: "2024-07-01", month_ahead: 1, arps_oil_rate: 108, persistence_oil_rate: 110 }],
    hgb_prediction: null,
    pressure_history_available: false,
    visualizations: { three_d_available: false },
    artificial_lift: { status: "not_implemented", recommendation: null, reason: "Not implemented." },
  }],
};

const apiStatus: ApiStatusValue = {
  connection: "connected",
  health: { status: "ok", api_version: "0.1.0" },
  capabilities: {
    api_version: "0.1.0",
    input_formats: [".csv", ".xlsx", ".xls", ".parquet", ".json"],
    required_columns: ["well_id", "date", "oil_rate"],
    analysis_models: ["Arps", "persistence"],
    optional_trainable_model: "HistGradientBoostingRegressor",
    pressure_forecast_available: false,
    natural_flow_transition_classifier_available: false,
    artificial_lift_screening_available: true,
    artificial_lift_recommendation_available: false,
    three_dimensional_reservoir_visualization_data_available: false,
    model_registry: "in-memory",
    disclaimer: "Research prototype.",
  },
  error: null,
  refresh: vi.fn(async () => undefined),
};

describe("dataset manager upload workflow", () => {
  beforeEach(() => {
    vi.mocked(previewUpload).mockResolvedValue(preview);
    vi.mocked(analyzeUpload).mockResolvedValue(analysis);
  });

  it("previews, auto-maps required fields, requires source units, and renders API analysis", async () => {
    const file = new File(["well_id,date,oil_rate\nW-1,2024-01-01,120"], "history.csv", { type: "text/csv" });
    render(
      <WorkspaceProvider>
        <ApiStatusContext.Provider value={apiStatus}>
          <MemoryRouter initialEntries={["/datasets"]}>
            <Routes><Route path="/datasets" element={<DatasetManagerPage />} /></Routes>
          </MemoryRouter>
        </ApiStatusContext.Provider>
      </WorkspaceProvider>,
    );

    fireEvent.change(screen.getByLabelText("Choose a production-history file"), { target: { files: [file] } });
    expect(await screen.findByText("Required columns have distinct mappings.")).toBeInTheDocument();
    expect(vi.mocked(previewUpload)).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: /validate & analyze/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Oil-rate unit *"), { target: { value: "STB/day" } });
    fireEvent.click(screen.getByRole("button", { name: /validate & analyze/i }));
    expect(await screen.findByText(/analysis complete for 1 well/i)).toBeInTheDocument();
    await waitFor(() => expect(vi.mocked(analyzeUpload)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(analyzeUpload).mock.calls[0][0]).toBe(file);
    expect(vi.mocked(analyzeUpload).mock.calls[0][1]).toEqual({ well_id: "well_id", date: "date", oil_rate: "oil_rate" });
    expect(vi.mocked(analyzeUpload).mock.calls[0][2].units).toEqual({ oil_rate: "STB/day" });
  });
});
