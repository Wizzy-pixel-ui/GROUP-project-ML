from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd

from sgd_api.data import frame_from_records
from sgd_api.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    ForecastPoint,
    HGBPrediction,
    ThresholdCheck,
    TrendSummary,
    WellAnalysis,
)
from sgd_api.training import get_model, predict_hgb
from sgd_ml.arps import fit_arps


API_VERSION = "0.1.0"
_MONTH_DAYS = 30.4375
_CONTEXT_KEYS = ("reservoir_type", "drive_mechanism", "region", "lift_type", "well_status")
_HISTORY_KEYS = (
    "oil_rate", "gas_rate", "water_rate", "reservoir_pressure", "bhp",
    "bubble_point_pressure", "gor", "water_cut", "choke", "lift_active",
)


def _clean_value(value):
    if value is None:
        return None
    if isinstance(value, (pd.Timestamp, date)):
        return value.date().isoformat() if isinstance(value, pd.Timestamp) else value.isoformat()
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return float(value) if np.isfinite(value) else None
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if pd.isna(value):
        return None
    return value


def _first_context(group: pd.DataFrame) -> dict:
    context = {}
    for key in _CONTEXT_KEYS:
        if key in group:
            values = group[key].dropna()
            if not values.empty:
                context[key] = _clean_value(values.iloc[-1])
    return context


def _threshold_check(group: pd.DataFrame, threshold: float | None, periods: int) -> ThresholdCheck:
    note = (
        "This is a transparent check of observed rates, not a learned event prediction or lift recommendation. "
        "Consecutive periods mean consecutive submitted rows."
    )
    if threshold is None:
        return ThresholdCheck(threshold_rate=None, status="threshold_not_set", note=note)

    if "lift_active" not in group or group["lift_active"].isna().all():
        return ThresholdCheck(threshold_rate=threshold, status="unknown_lift_status", note=note)

    tail = group.tail(periods)
    if len(tail) < periods:
        return ThresholdCheck(threshold_rate=threshold, status="insufficient_consecutive_history", note=note)
    if tail["lift_active"].isna().any():
        status = "unknown_lift_status"
    elif bool(tail["lift_active"].iloc[-1]):
        status = "currently_lifted"
    elif tail["lift_active"].astype(bool).any():
        status = "lift_status_changed_within_check_window"
    elif (tail["oil_rate"] <= threshold).all():
        status = "below_threshold_sustained"
    else:
        status = "above_threshold"

    first_crossing = None
    below_natural = group["oil_rate"].le(threshold) & group["lift_active"].eq(False)
    flags = below_natural.fillna(False).to_numpy(dtype=bool)
    for index in range(len(flags) - periods + 1):
        if flags[index:index + periods].all():
            first_crossing = group["date"].iloc[index].date()
            break
    return ThresholdCheck(
        threshold_rate=float(threshold),
        status=status,
        first_sustained_below_threshold_date=first_crossing,
        note=note,
    )


def _analyze_one(
    well_id: str,
    group: pd.DataFrame,
    request: AnalysisRequest,
) -> tuple[WellAnalysis, list[str]]:
    group = group.sort_values("date").reset_index(drop=True)
    positive = group.loc[group["oil_rate"] > 0].copy()
    if len(positive) < 6:
        raise ValueError(f"Well {well_id} has only {len(positive)} positive oil-rate observations; Arps needs at least six")

    first_date = group["date"].iloc[0]
    last_date = group["date"].iloc[-1]
    elapsed = (positive["date"] - first_date).dt.total_seconds().to_numpy(dtype=float) / (86400.0 * _MONTH_DAYS)
    fit = fit_arps(elapsed, positive["oil_rate"].to_numpy(dtype=float), decline_type="auto")

    all_elapsed = (group["date"] - first_date).dt.total_seconds().to_numpy(dtype=float) / (86400.0 * _MONTH_DAYS)
    x = all_elapsed
    y = group["oil_rate"].to_numpy(dtype=float)
    if len(np.unique(x)) >= 2:
        slope, intercept = np.polyfit(x, y, 1)
    else:
        slope, intercept = 0.0, float(y[-1])
    direction = "declining" if slope < 0 else ("increasing" if slope > 0 else "flat")
    first_rate = float(y[0])
    last_rate = float(y[-1])
    pct_change = None if first_rate == 0 else float((last_rate - first_rate) / abs(first_rate) * 100.0)
    trend = TrendSummary(
        direction=direction,
        linear_slope_rate_per_month=float(slope),
        percent_change_first_to_last=pct_change,
        first_rate=first_rate,
        last_rate=last_rate,
    )

    forecast_points = []
    for month in range(1, request.forecast_horizon_months + 1):
        forecast_date = (pd.Timestamp(last_date) + pd.DateOffset(months=month)).date()
        t_months = (pd.Timestamp(forecast_date) - pd.Timestamp(first_date)).total_seconds() / (86400.0 * _MONTH_DAYS)
        arps_rate = float(max(0.0, fit.predict(t_months)))
        forecast_points.append(ForecastPoint(
            date=forecast_date,
            month_ahead=month,
            arps_oil_rate=arps_rate,
            persistence_oil_rate=last_rate,
        ))

    threshold = _threshold_check(group, request.threshold_rate, request.min_consecutive_periods)
    history = []
    for _, row in group.iterrows():
        point = {"date": row["date"].date().isoformat()}
        for key in _HISTORY_KEYS:
            if key in group.columns:
                point[key] = _clean_value(row[key])
        history.append(point)

    hgb_prediction = None
    if request.model_id:
        bundle = get_model(request.model_id)
        prediction = predict_hgb(request.model_id, group)
        cadence = group["date"].diff().dropna().dt.total_seconds().median()
        if pd.isna(cadence) or cadence <= 0:
            cadence = _MONTH_DAYS * 86400.0
        predicted_date = (pd.Timestamp(last_date) + pd.to_timedelta(cadence * bundle.horizon_steps, unit="s")).date()
        hgb_prediction = HGBPrediction(
            model_id=request.model_id,
            horizon_steps=bundle.horizon_steps,
            predicted_date=predicted_date,
            predicted_oil_rate=prediction,
            validation_metrics=bundle.validation_metrics,
            note="A held-out-well validation score is available, but it is not a guarantee for this target well. Horizon is measured in training observations; date is estimated from target-history cadence.",
        )

    arps_crossing = None
    if request.threshold_rate is not None:
        arps_crossing = next(
            (point.month_ahead for point in forecast_points if point.arps_oil_rate <= request.threshold_rate),
            None,
        )
    warnings = [
        "Arps is a decline-curve baseline fitted to positive-rate history; it does not model shut-ins, restarts, interventions, or lift changes.",
        "Forecasts are not calibrated probabilities and have not been validated as natural-flow transition predictions.",
        "The artificial-lift selector is not implemented; engineering feasibility and economic review are still required.",
    ]
    if threshold.status == "unknown_lift_status":
        warnings.append("Natural-flow threshold status is unknown because dated lift_active values were not supplied.")
    if arps_crossing is not None:
        warnings.append("The reported Arps threshold month is a fitted-curve crossing scenario, not a probability or recommendation.")

    pressure_available = any(key in group and group[key].notna().any() for key in ("bhp", "reservoir_pressure"))
    result = WellAnalysis(
        well_id=well_id,
        row_count=int(len(group)),
        start_date=first_date.date(),
        end_date=last_date.date(),
        positive_rate_observations=int(len(positive)),
        zero_rate_observations=int((group["oil_rate"] == 0).sum()),
        units=request.units,
        well_context=_first_context(group),
        trend=trend,
        arps_fit={
            "decline_type": fit.decline_type,
            "initial_rate_qi": fit.qi,
            "nominal_decline_di_per_month": fit.di,
            "hyperbolic_b": fit.b,
            "aicc_training_fit_diagnostic": fit.aicc,
            "positive_observations_used": fit.observations_used,
            "note": "AICc ranks curve forms on the submitted history; it is not forecast accuracy.",
        },
        threshold_check=threshold,
        history=history,
        forecast=forecast_points,
        hgb_prediction=hgb_prediction,
        pressure_history_available=pressure_available,
        visualizations={
            "chart_series": ["historical oil_rate", "Arps oil-rate forecast", "persistence reference"],
            "three_d_available": False,
            "three_d_reason": "Well survey coordinates, completion trajectory, and reservoir surfaces are not present in this API request or current dataset.",
        },
        artificial_lift={
            "status": "not_implemented",
            "recommendation": None,
            "reason": "No validated artificial-lift selection model or transition-outcome dataset is available.",
        },
    )
    return result, warnings


def analyze_request(request: AnalysisRequest) -> AnalysisResponse:
    """Analyzing submitted histories and returning dashboard-ready JSON."""
    frame = frame_from_records(request.records)
    results = []
    warnings = []
    for well_id, group in frame.groupby("well_id", sort=True):
        result, well_warnings = _analyze_one(str(well_id), group, request)
        results.append(result)
        warnings.extend(well_warnings)
    return AnalysisResponse(
        api_version=API_VERSION,
        results=results,
        warnings=list(dict.fromkeys(warnings)),
    )
