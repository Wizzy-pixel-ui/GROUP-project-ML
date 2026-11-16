from __future__ import annotations

import io
import json
import os
import base64
import binascii
import secrets
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from sgd_api.data import REQUIRED_COLUMNS
from sgd_api.schemas import AnalysisRequest, AnalysisResponse, ProductionRecord, TrainingRequest, TrainingResponse
from sgd_api.service import API_VERSION, analyze_request
from sgd_api.training import get_model, train_hgb_model

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
MAX_UPLOAD_ROWS = 100_000
_SUPPORTED_UPLOADS = {".csv", ".xlsx", ".xls", ".parquet", ".json"}


def _cors_origins() -> list[str]:
    raw = os.getenv("SGD_API_CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app = FastAPI(
    title="Solution-Gas-Drive Well Analysis API",
    description=(
        "Research API for per-well production-history checks, Arps decline forecasts, and optional "
        "HistGradientBoosting training/inference. It is not an artificial-lift selector."
    ),
    version=API_VERSION,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def shared_password_gate(request: Request, call_next):
    """Require HTTP Basic authentication when explicitly enabled for deployment."""
    if os.getenv("APP_REQUIRE_AUTH", "false").strip().lower() not in {"1", "true", "yes"}:
        return await call_next(request)

    expected_password = os.getenv("APP_PASSWORD", "")
    expected_username = os.getenv("APP_USERNAME", "group")
    if len(expected_password) < 20:
        return PlainTextResponse(
            "Deployment authentication is not configured with a strong password.",
            status_code=503,
            headers={"Cache-Control": "no-store"},
        )

    authorization = request.headers.get("authorization", "")
    username = password = ""
    try:
        scheme, encoded = authorization.split(" ", 1)
        if scheme.lower() == "basic":
            decoded = base64.b64decode(encoded, validate=True).decode("utf-8")
            username, password = decoded.split(":", 1)
    except (ValueError, UnicodeDecodeError, binascii.Error):
        pass

    valid = secrets.compare_digest(username, expected_username) and secrets.compare_digest(password, expected_password)
    if not valid:
        return PlainTextResponse(
            "Password required to access the GROUP Project ML test deployment.",
            status_code=401,
            headers={
                "WWW-Authenticate": 'Basic realm="GROUP Project ML test", charset="UTF-8"',
                "Cache-Control": "no-store",
            },
        )
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response


def _parse_json_object(value: str | None, field_name: str) -> dict[str, Any]:
    if not value:
        return {}
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"{field_name} must be valid JSON") from exc
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=422, detail=f"{field_name} must be a JSON object")
    return parsed


def _parse_json_string_list(value: str | None, field_name: str) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"{field_name} must be a JSON array") from exc
    if not isinstance(parsed, list) or not all(isinstance(item, str) for item in parsed):
        raise HTTPException(status_code=422, detail=f"{field_name} must be a JSON array of strings")
    return parsed


def _read_table(filename: str, content: bytes) -> pd.DataFrame:
    suffix = Path(filename or "").suffix.lower()
    if suffix not in _SUPPORTED_UPLOADS:
        raise HTTPException(status_code=415, detail=f"Unsupported file type {suffix or '(none)'}; use CSV, XLSX, XLS, Parquet, or JSON")
    try:
        stream = io.BytesIO(content)
        if suffix == ".csv":
            frame = pd.read_csv(stream)
        elif suffix in {".xlsx", ".xls"}:
            frame = pd.read_excel(stream)
        elif suffix == ".parquet":
            frame = pd.read_parquet(stream)
        else:
            frame = pd.read_json(stream)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not read uploaded table: {exc}") from exc
    if len(frame) > MAX_UPLOAD_ROWS:
        raise HTTPException(status_code=413, detail=f"Uploaded table has {len(frame):,} rows; the API limit is {MAX_UPLOAD_ROWS:,} rows per request")
    return frame


def _records_from_upload(filename: str, content: bytes, column_map: dict[str, Any]) -> list[ProductionRecord]:
    frame = _read_table(filename, content)
    if column_map:
        if not all(isinstance(source, str) and isinstance(target, str) for source, target in column_map.items()):
            raise HTTPException(status_code=422, detail="column_map must map source header strings to canonical header strings")
        frame = frame.rename(columns=column_map)
    missing = REQUIRED_COLUMNS.difference(frame.columns)
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing required columns after column_map: {sorted(missing)}")

    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame["oil_rate"] = pd.to_numeric(frame["oil_rate"], errors="coerce")
    bad = frame["date"].isna() | frame["oil_rate"].isna()
    if bad.any():
        rows = [int(index) + 2 for index in frame.index[bad][:10]]
        raise HTTPException(status_code=422, detail=f"Invalid date or nonnumeric/missing oil_rate in uploaded row(s): {rows}")

    def convert(value):
        if value is None:
            return None
        if isinstance(value, (pd.Timestamp,)):
            return value.date().isoformat()
        if isinstance(value, np.generic):
            value = value.item()
        if isinstance(value, float) and not np.isfinite(value):
            return None
        try:
            if pd.isna(value):
                return None
        except (TypeError, ValueError):
            pass
        return value

    records = []
    for row in frame.to_dict(orient="records"):
        clean = {str(key): convert(value) for key, value in row.items()}
        try:
            records.append(ProductionRecord.model_validate(clean))
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Invalid uploaded row: {exc}") from exc
    return records


async def _read_upload(file: UploadFile) -> bytes:
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Upload exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB API limit")
    if not content:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")
    return content


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "api_version": API_VERSION}


@app.get("/v1/capabilities", tags=["system"])
def capabilities() -> dict[str, Any]:
    return {
        "api_version": API_VERSION,
        "input_formats": sorted(_SUPPORTED_UPLOADS),
        "required_columns": ["well_id", "date", "oil_rate"],
        "analysis_models": ["Arps exponential/harmonic/hyperbolic with AICc selection", "persistence reference"],
        "optional_trainable_model": "HistGradientBoostingRegressor",
        "pressure_forecast_available": False,
        "natural_flow_transition_classifier_available": False,
        "artificial_lift_recommendation_available": False,
        "three_dimensional_reservoir_visualization_data_available": False,
        "model_registry": "in-memory; models are cleared when the API process restarts",
        "disclaimer": "Research prototype. Forecasts are not calibrated transition probabilities or operating recommendations.",
    }


@app.post("/v1/preview/upload", tags=["analysis"])
async def preview_upload(
    file: UploadFile = File(...),
    column_map: str | None = Form(default=None, description="JSON object mapping source column names to canonical names"),
) -> dict[str, Any]:
    """Previewing an upload in memory and reporting schema/data-quality diagnostics."""
    content = await _read_upload(file)
    source_frame = _read_table(file.filename or "", content)
    source_columns = [str(column) for column in source_frame.columns]
    frame = source_frame.copy()
    mapping = _parse_json_object(column_map, "column_map")
    if mapping:
        if not all(isinstance(source, str) and isinstance(target, str) for source, target in mapping.items()):
            raise HTTPException(status_code=422, detail="column_map must map source header strings to canonical header strings")
        frame = frame.rename(columns=mapping)

    missing_required = sorted(REQUIRED_COLUMNS.difference(frame.columns))
    missing_by_column = {str(column): int(frame[column].isna().sum()) for column in frame.columns}
    invalid_date_count = None
    invalid_oil_rate_count = None
    duplicate_well_date_rows = None
    median_observation_interval_days = None
    min_observation_interval_days = None
    max_observation_interval_days = None
    distinct_observation_intervals = None
    wells_with_intervals = 0
    if "date" in frame.columns:
        parsed_dates = pd.to_datetime(frame["date"], errors="coerce")
        invalid_date_count = int(parsed_dates.isna().sum())
        if "well_id" in frame.columns:
            duplicate_frame = pd.DataFrame({"well_id": frame["well_id"], "date": parsed_dates})
            duplicate_well_date_rows = int(duplicate_frame.duplicated(subset=["well_id", "date"], keep=False).sum())
            dated = pd.DataFrame({"well_id": frame["well_id"], "date": parsed_dates}).dropna(subset=["well_id", "date"])
            intervals = []
            for _, well_rows in dated.groupby("well_id", sort=False):
                differences = well_rows["date"].sort_values().diff().dt.total_seconds().div(86400.0)
                positive_differences = differences[differences > 0]
                if not positive_differences.empty:
                    wells_with_intervals += 1
                    intervals.extend(positive_differences.tolist())
            if intervals:
                interval_values = np.round(np.asarray(intervals, dtype=float), 3)
                median_observation_interval_days = float(np.median(interval_values))
                min_observation_interval_days = float(np.min(interval_values))
                max_observation_interval_days = float(np.max(interval_values))
                distinct_observation_intervals = int(len(np.unique(interval_values)))
    if "oil_rate" in frame.columns:
        numeric_rates = pd.to_numeric(frame["oil_rate"], errors="coerce").replace([np.inf, -np.inf], np.nan)
        invalid_oil_rate_count = int(numeric_rates.isna().sum())

    def preview_value(value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, pd.Timestamp):
            return value.isoformat()
        if isinstance(value, np.generic):
            value = value.item()
        if isinstance(value, float) and not np.isfinite(value):
            return None
        try:
            if pd.isna(value):
                return None
        except (TypeError, ValueError):
            pass
        return value

    preview_rows = [
        {str(key): preview_value(value) for key, value in row.items()}
        for row in source_frame.head(50).to_dict(orient="records")
    ]
    return {
        "filename": file.filename or "uploaded file",
        "row_count": int(len(source_frame)),
        "columns": source_columns,
        "preview_rows": preview_rows,
        "missing_by_column": missing_by_column,
        "mapped_columns": [str(column) for column in frame.columns],
        "missing_required": missing_required,
        "invalid_date_count": invalid_date_count,
        "invalid_oil_rate_count": invalid_oil_rate_count,
        "duplicate_well_date_rows": duplicate_well_date_rows,
        "median_observation_interval_days": median_observation_interval_days,
        "min_observation_interval_days": min_observation_interval_days,
        "max_observation_interval_days": max_observation_interval_days,
        "distinct_observation_intervals": distinct_observation_intervals,
        "wells_with_intervals": wells_with_intervals,
        "note": "Preview reads the submitted file in memory. It does not convert units, repair rows, or persist the upload.",
    }


@app.post("/v1/analyze", response_model=AnalysisResponse, tags=["analysis"])
def analyze(request: AnalysisRequest) -> AnalysisResponse:
    try:
        return analyze_request(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/v1/analyze/upload", response_model=AnalysisResponse, tags=["analysis"])
async def analyze_upload(
    file: UploadFile = File(...),
    column_map: str | None = Form(default=None, description="JSON object mapping source column names to canonical names"),
    units: str | None = Form(default=None, description="JSON object documenting each rate/pressure unit; no conversion is performed"),
    threshold_rate: float | None = Form(default=None, gt=0),
    min_consecutive_periods: int = Form(default=2, ge=1, le=24),
    forecast_horizon_months: int = Form(default=12, ge=1, le=60),
    model_id: str | None = Form(default=None),
) -> AnalysisResponse:
    content = await _read_upload(file)
    records = _records_from_upload(file.filename or "", content, _parse_json_object(column_map, "column_map"))
    request = AnalysisRequest(
        records=records,
        units=_parse_json_object(units, "units"),
        threshold_rate=threshold_rate,
        min_consecutive_periods=min_consecutive_periods,
        forecast_horizon_months=forecast_horizon_months,
        model_id=model_id,
    )
    try:
        return analyze_request(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/v1/models/train", response_model=TrainingResponse, tags=["models"])
def train_model(request: TrainingRequest) -> TrainingResponse:
    try:
        model_id, bundle, persistence_mae = train_hgb_model(
            request.records,
            horizon_steps=request.horizon_steps,
            exclude_well_ids=request.exclude_well_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return TrainingResponse(
        model_id=model_id,
        algorithm="HistGradientBoostingRegressor",
        target="future oil_rate",
        horizon_steps=bundle.horizon_steps,
        training_rows=bundle.training_rows,
        training_wells=bundle.training_wells,
        validation_wells=bundle.validation_wells,
        validation_metrics=bundle.validation_metrics,
        excluded_well_ids=request.exclude_well_ids,
        persistence_mae=persistence_mae,
        storage="in-memory only; cleared on API restart and not shared across worker processes",
        warning="Validation is a single held-out-well split. Compare with persistence and validate on the intended field before using forecasts.",
    )


@app.post("/v1/models/train/upload", response_model=TrainingResponse, tags=["models"])
async def train_model_upload(
    file: UploadFile = File(...),
    column_map: str | None = Form(default=None, description="JSON object mapping source column names to canonical names"),
    horizon_steps: int = Form(default=1, ge=1, le=12),
    exclude_well_ids: str | None = Form(default=None, description="JSON array of well IDs to exclude from fitting and validation"),
) -> TrainingResponse:
    content = await _read_upload(file)
    records = _records_from_upload(file.filename or "", content, _parse_json_object(column_map, "column_map"))
    request = TrainingRequest(
        records=records,
        horizon_steps=horizon_steps,
        exclude_well_ids=_parse_json_string_list(exclude_well_ids, "exclude_well_ids"),
    )
    return train_model(request)


@app.get("/v1/models/{model_id}", tags=["models"])
def model_info(model_id: str) -> dict[str, Any]:
    try:
        bundle = get_model(model_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "model_id": model_id,
        "algorithm": "HistGradientBoostingRegressor",
        "horizon_steps": bundle.horizon_steps,
        "training_rows": bundle.training_rows,
        "training_wells": bundle.training_wells,
        "validation_wells": bundle.validation_wells,
        "validation_metrics": bundle.validation_metrics,
        "feature_count": len(bundle.feature_columns),
        "storage": "in-memory only",
    }


_FRONTEND_DIST = Path(os.getenv("SGD_FRONTEND_DIST", "/app/frontend/dist"))
if not _FRONTEND_DIST.is_dir():
    _FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _FRONTEND_DIST.is_dir():
    if (_FRONTEND_DIST / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=_FRONTEND_DIST / "assets"), name="frontend-assets")

    @app.get("/", include_in_schema=False)
    def frontend_root():
        return FileResponse(_FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    def frontend_routes(full_path: str):
        dist_root = _FRONTEND_DIST.resolve()
        requested = (dist_root / full_path).resolve()
        if requested.is_relative_to(dist_root) and requested.is_file():
            return FileResponse(requested)
        return FileResponse(dist_root / "index.html")
