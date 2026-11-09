from __future__ import annotations

import json
from pathlib import Path
import sys

import pandas as pd
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from sgd_api.main import app  # noqa: E402
from sgd_api.training import clear_registry_for_tests  # noqa: E402

client = TestClient(app)


def _history(well_id="W-1", lift_active=False, count=18):
    return [
        {
            "well_id": well_id,
            "date": date.strftime("%Y-%m-%d"),
            "oil_rate": max(5.0, 240.0 * (0.86 ** index)),
            "gas_rate": 25000.0 + index * 200.0,
            "water_rate": 5.0 + index * 0.2,
            "reservoir_pressure": 3200.0 - index * 6.0,
            "bhp": 2800.0 - index * 5.0,
            "bubble_point_pressure": 2500.0,
            "initial_reservoir_pressure": 3400.0,
            "reservoir_type": "solution_gas_drive",
            "lift_active": lift_active,
        }
        for index, date in enumerate(pd.date_range("2023-01-01", periods=count, freq="MS"))
    ]


def test_health_and_capabilities_routes():
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    capabilities = client.get("/v1/capabilities").json()
    assert "Arps exponential/harmonic/hyperbolic with AICc selection" in capabilities["analysis_models"]
    assert capabilities["artificial_lift_recommendation_available"] is False


def test_analyze_returns_chart_series_and_explicit_no_lift_recommendation():
    response = client.post(
        "/v1/analyze",
        json={
            "records": _history(),
            "units": {"oil_rate": "STB/day", "gas_rate": "scf/day", "pressure": "psi"},
            "threshold_rate": 20.0,
            "min_consecutive_periods": 2,
            "forecast_horizon_months": 6,
        },
    )
    assert response.status_code == 200, response.text
    result = response.json()["results"][0]
    assert result["arps_fit"]["decline_type"] in {"exponential", "harmonic", "hyperbolic"}
    assert len(result["forecast"]) == 6
    assert result["threshold_check"]["status"] == "above_threshold"
    assert result["artificial_lift"]["status"] == "not_implemented"
    assert result["artificial_lift"]["recommendation"] is None
    assert result["visualizations"]["three_d_available"] is False


def test_unknown_lift_status_does_not_claim_natural_flow():
    records = _history(count=12)
    for row in records:
        row.pop("lift_active")
    response = client.post(
        "/v1/analyze",
        json={"records": records, "threshold_rate": 100.0, "forecast_horizon_months": 2},
    )
    assert response.status_code == 200, response.text
    result = response.json()["results"][0]
    assert result["threshold_check"]["status"] == "unknown_lift_status"


def test_upload_csv_with_column_mapping():
    table = pd.DataFrame({
        "Well Code": ["CSV-WELL"] * 12,
        "Month": pd.date_range("2023-01-01", periods=12, freq="MS").strftime("%Y-%m-%d"),
        "Oil": [200, 180, 160, 140, 120, 100, 80, 60, 40, 20, 10, 5],
        "Natural Flow": [False] * 12,
    })
    response = client.post(
        "/v1/analyze/upload",
        data={
            "column_map": '{"Well Code":"well_id","Month":"date","Oil":"oil_rate","Natural Flow":"lift_active"}',
            "units": '{"oil_rate":"STB/day"}',
            "threshold_rate": "15",
            "min_consecutive_periods": "2",
            "forecast_horizon_months": "3",
        },
        files={"file": ("history.csv", table.to_csv(index=False), "text/csv")},
    )
    assert response.status_code == 200, response.text
    result = response.json()["results"][0]
    assert result["well_id"] == "CSV-WELL"
    assert result["threshold_check"]["status"] == "below_threshold_sustained"
    assert len(result["forecast"]) == 3


def test_train_hgb_then_analyze_a_well_excluded_from_training():
    clear_registry_for_tests()
    sample = pd.read_csv(ROOT / "data/synthetic/demo_well_monthly.csv")
    sample["date"] = pd.to_datetime(sample["year"].astype(str) + "-" + sample["month"].astype(str) + "-01")
    sample = sample.drop(columns=["year", "month"])
    sample["date"] = sample["date"].dt.strftime("%Y-%m-%d")
    rows = json.loads(sample.to_json(orient="records"))
    trained = client.post(
        "/v1/models/train",
        json={"records": rows, "horizon_steps": 3, "exclude_well_ids": ["SYN-001"]},
    )
    assert trained.status_code == 200, trained.text
    training = trained.json()
    assert training["algorithm"] == "HistGradientBoostingRegressor"
    assert training["validation_wells"] >= 1

    target_rows = json.loads(sample.loc[sample.well_id.eq("SYN-001")].to_json(orient="records"))
    result = client.post(
        "/v1/analyze",
        json={
            "records": target_rows,
            "forecast_horizon_months": 3,
            "model_id": training["model_id"],
        },
    )
    assert result.status_code == 200, result.text
    prediction = result.json()["results"][0]["hgb_prediction"]
    assert prediction["horizon_steps"] == 3
    assert prediction["predicted_oil_rate"] >= 0
