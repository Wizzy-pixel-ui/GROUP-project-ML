from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ProductionRecord(BaseModel):
    """One dated observation for one well; unknown extra columns are retained."""

    model_config = ConfigDict(extra="allow", allow_inf_nan=False)

    well_id: str = Field(min_length=1, max_length=128)
    date: date
    oil_rate: float
    gas_rate: float | None = None
    water_rate: float | None = None
    reservoir_pressure: float | None = None
    bhp: float | None = None
    bubble_point_pressure: float | None = None
    initial_reservoir_pressure: float | None = None
    gor: float | None = None
    water_cut: float | None = None
    choke: float | None = None
    cumulative_oil: float | None = None
    cumulative_gas: float | None = None
    downhole_temperature: float | None = None
    tubing_pressure: float | None = None
    annulus_pressure: float | None = None
    on_stream_hours: float | None = None
    wellhead_pressure: float | None = None
    wellhead_temperature: float | None = None
    choke_pressure_drop: float | None = None
    reservoir_type: str | None = None
    region: str | None = None
    drive_mechanism: str | None = None
    lift_active: bool | None = None
    lift_type: str | None = None
    well_status: str | None = None
    shut_in_flag: bool | None = None
    workover_flag: bool | None = None


class AnalysisRequest(BaseModel):
    records: list[ProductionRecord] = Field(min_length=6)
    units: dict[str, str] = Field(default_factory=dict)
    threshold_rate: float | None = Field(default=None, gt=0)
    min_consecutive_periods: int = Field(default=2, ge=1, le=24)
    forecast_horizon_months: int = Field(default=12, ge=1, le=60)
    model_id: str | None = None


class TrainingRequest(BaseModel):
    records: list[ProductionRecord] = Field(min_length=1)
    horizon_steps: int = Field(default=1, ge=1, le=12)
    exclude_well_ids: list[str] = Field(default_factory=list)


class TrendSummary(BaseModel):
    direction: str
    linear_slope_rate_per_month: float
    percent_change_first_to_last: float | None
    first_rate: float
    last_rate: float


class ThresholdCheck(BaseModel):
    threshold_rate: float | None
    status: str
    label_type: str = "transparent_observed_rule"
    first_sustained_below_threshold_date: date | None = None
    note: str


class ForecastPoint(BaseModel):
    date: date
    month_ahead: int
    arps_oil_rate: float
    persistence_oil_rate: float


class HGBPrediction(BaseModel):
    model_id: str
    horizon_steps: int
    predicted_date: date
    predicted_oil_rate: float
    validation_metrics: dict[str, float | int]
    note: str


class WellAnalysis(BaseModel):
    well_id: str
    row_count: int
    start_date: date
    end_date: date
    positive_rate_observations: int
    zero_rate_observations: int
    units: dict[str, str]
    well_context: dict[str, Any]
    trend: TrendSummary
    arps_fit: dict[str, Any]
    threshold_check: ThresholdCheck
    history: list[dict[str, Any]]
    forecast: list[ForecastPoint]
    hgb_prediction: HGBPrediction | None = None
    pressure_history_available: bool
    visualizations: dict[str, Any]
    artificial_lift: dict[str, Any]


class AnalysisResponse(BaseModel):
    api_version: str
    results: list[WellAnalysis]
    warnings: list[str]


class TrainingResponse(BaseModel):
    model_id: str
    algorithm: str
    target: str
    horizon_steps: int
    training_rows: int
    training_wells: int
    validation_wells: int
    validation_metrics: dict[str, float | int]
    excluded_well_ids: list[str]
    persistence_mae: float
    storage: str
    warning: str
