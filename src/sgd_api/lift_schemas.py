from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


ResourceState = Literal["available", "unavailable", "unknown"]
WellType = Literal["oil", "gas", "unknown"]
LiftNeedState = Literal["engineering_confirmed_by_user", "suspected_by_user", "not_established"]
QualitativeLevel = Literal["low", "moderate", "high", "unknown"]
Trajectory = Literal["vertical", "deviated", "highly_deviated", "unknown"]
Setting = Literal["onshore", "offshore", "subsea", "unknown"]
LiquidLoadingState = Literal["yes", "no", "unknown"]
CandidateStatus = Literal["screening_candidate", "conditional", "unknown", "screened_out"]


class LiftScreeningRequest(BaseModel):
    """Explicit user-supplied inputs for a qualitative preliminary method screen."""

    model_config = ConfigDict(extra="forbid")

    well_id: str | None = Field(default=None, max_length=128)
    well_type: WellType = "unknown"
    lift_need_state: LiftNeedState = "not_established"
    lift_need_evidence: str | None = Field(default=None, max_length=1000)

    current_oil_rate: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    current_liquid_rate: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    target_liquid_rate: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    current_gas_rate: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    liquid_rate_unit: str | None = Field(default=None, max_length=40)
    gas_rate_unit: str | None = Field(default=None, max_length=40)
    reservoir_pressure: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    flowing_bhp: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    bubble_point_pressure: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    pressure_unit: str | None = Field(default=None, max_length=40)
    pressure_measurement_date: str | None = Field(default=None, max_length=40)

    rate_duty: QualitativeLevel = "unknown"
    fluid_viscosity: QualitativeLevel = "unknown"
    free_gas_fraction: QualitativeLevel = "unknown"
    solids_loading: QualitativeLevel = "unknown"
    trajectory: Trajectory = "unknown"
    setting: Setting = "unknown"
    liquid_loading_concern: LiquidLoadingState = "unknown"

    electric_power: ResourceState = "unknown"
    injection_gas_system: ResourceState = "unknown"
    gas_handling_capacity: ResourceState = "unknown"
    rod_pump_access: ResourceState = "unknown"
    pcp_surface_drive: ResourceState = "unknown"
    hydraulic_power_fluid: ResourceState = "unknown"

    @field_validator("well_id", "lift_need_evidence", "liquid_rate_unit", "gas_rate_unit", "pressure_unit", "pressure_measurement_date")
    @classmethod
    def strip_optional_strings(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @model_validator(mode="after")
    def require_units_for_measured_values(self) -> "LiftScreeningRequest":
        if any(value is not None for value in (self.current_oil_rate, self.current_liquid_rate, self.target_liquid_rate)) and not self.liquid_rate_unit:
            raise ValueError("liquid_rate_unit is required when oil, liquid, or target liquid rate is supplied")
        if self.current_gas_rate is not None and not self.gas_rate_unit:
            raise ValueError("gas_rate_unit is required when current_gas_rate is supplied")
        if any(value is not None for value in (self.reservoir_pressure, self.flowing_bhp, self.bubble_point_pressure)) and not self.pressure_unit:
            raise ValueError("pressure_unit is required when a pressure value is supplied")
        return self


class LiftCandidateResult(BaseModel):
    method: str
    status: CandidateStatus
    priority_rank: int | None
    tied_rank: bool
    basis: str
    supporting_evidence: list[str]
    counter_evidence: list[str]
    hard_blocks: list[str]
    missing_inputs: list[str]
    next_checks: list[str]


class LiftScreeningResponse(BaseModel):
    screen_version: str
    method_input_status: Literal["insufficient_for_preliminary_comparison", "preliminary_comparison_possible"]
    screening_status: Literal[
        "need_not_established",
        "need_user_marked_suspected",
        "need_user_marked_confirmed_unverified",
        "insufficient_method_inputs",
        "preliminary_candidates_only",
    ]
    need_assessment: str
    lift_need_state: LiftNeedState
    lift_need_evidence: str | None
    interpretation: str
    ranking_method: str
    input_context: dict[str, str | float | None]
    numeric_context: dict[str, str | float | None]
    candidates: list[LiftCandidateResult]
    global_missing_information: list[str]
    sources: list[str]
