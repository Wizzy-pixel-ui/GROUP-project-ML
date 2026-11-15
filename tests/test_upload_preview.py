from __future__ import annotations

from fastapi.testclient import TestClient

from sgd_api.main import app


def test_preview_upload_returns_sample_and_mapped_quality_diagnostics():
    csv_data = "Well Name,Production Date,Oil Rate\nA,2024-01-01,100\nA,2024-01-01,90\nA,2024-01-11,80\nB,not-a-date,unknown\n"
    mapping = '{"Well Name":"well_id","Production Date":"date","Oil Rate":"oil_rate"}'

    response = TestClient(app).post(
        "/v1/preview/upload",
        data={"column_map": mapping},
        files={"file": ("history.csv", csv_data, "text/csv")},
    )

    assert response.status_code == 200, response.text
    preview = response.json()
    assert preview["row_count"] == 4
    assert preview["columns"] == ["Well Name", "Production Date", "Oil Rate"]
    assert preview["preview_rows"][0]["Well Name"] == "A"
    assert preview["missing_required"] == []
    assert preview["invalid_date_count"] == 1
    assert preview["invalid_oil_rate_count"] == 1
    assert preview["duplicate_well_date_rows"] == 2
    assert preview["median_observation_interval_days"] == 10
    assert preview["min_observation_interval_days"] == 10
    assert preview["max_observation_interval_days"] == 10
    assert preview["distinct_observation_intervals"] == 1
    assert preview["wells_with_intervals"] == 1
    assert preview["note"].startswith("Preview reads the submitted file in memory")
