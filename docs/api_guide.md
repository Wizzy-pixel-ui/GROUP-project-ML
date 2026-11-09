# Well Analysis API Guide

This guide describes the FastAPI service that exposes the project’s current well-history analysis to a dashboard. The API accepts canonical JSON records or uploaded tabular files, can train the existing HistGradientBoosting baseline on a user-supplied multiwell dataset, and returns chart-ready history and forecast series.

**This is a research prototype, not an artificial-lift selector.** The API does not recommend ESP, gas lift, rod pump, PCP, or another lift system. The output explicitly marks lift recommendation as unavailable. The included Volve data do not identify natural-flow/lift status or transition outcomes.

## Install and run locally

Clone the public repository and run:

```bash
git clone https://github.com/Wizzy-pixel-ui/GROUP-project-ML.git
cd GROUP-project-ML
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
sgd-api
```

The API binds to `127.0.0.1:8000` by default. Open `http://127.0.0.1:8000/docs` for interactive Swagger documentation, or `http://127.0.0.1:8000/redoc` for the alternative API reference. `GET /health` checks readiness and `GET /v1/capabilities` reports what is currently available.

The project code is MIT-licensed; the included Volve data have separate source terms. It is installable with pip from a local source checkout (`pip install -e .`) or from Git with `pip install "git+https://github.com/Wizzy-pixel-ui/GROUP-project-ML.git"`. **It has not been released to the Python Package Index (PyPI).** The API package metadata lives in the repository’s `pyproject.toml`.

## Routes

| Method and route | Purpose |
|---|---|
| `GET /health` | Basic health check. |
| `GET /v1/capabilities` | Lists supported formats, models, and unavailable functions. |
| `POST /v1/analyze` | Analyzes one or more wells from a JSON `records` list; fits an Arps family per well and returns threshold checks and chart-ready series. Optionally includes an HGB prediction if `model_id` is supplied. |
| `POST /v1/analyze/upload` | Same analysis using a CSV, XLS/XLSX, Parquet, or JSON multipart upload. Supports source-to-canonical column mapping. Upload limit: 25 MB. |
| `POST /v1/models/train` | Trains HistGradientBoosting on a multiwell JSON dataset, reports one held-out-well validation split, then retains the fitted model in this API process. |
| `POST /v1/models/train/upload` | Same training workflow from a supported tabular-file upload. |
| `GET /v1/models/{model_id}` | Returns metadata and validation results for a model retained by the current process. |

### Canonical input format

Each row represents one well at one observation date. The required keys are `well_id`, `date`, and numeric `oil_rate`. The rate and pressure values are never converted automatically. Document units in `units`, and convert inconsistent sources before submitting them.

Example analysis request:

```json
{
  "records": [
    {
      "well_id": "WELL-001",
      "date": "2024-01-01",
      "oil_rate": 125.4,
      "gas_rate": 180000,
      "water_rate": 18.2,
      "reservoir_pressure": 3200,
      "bhp": 2750,
      "bubble_point_pressure": 2500,
      "initial_reservoir_pressure": 4100,
      "reservoir_type": "solution_gas_drive",
      "region": "North",
      "lift_active": false,
      "lift_type": "NONE"
    },
    {
      "well_id": "WELL-001",
      "date": "2024-02-01",
      "oil_rate": 118.7,
      "gas_rate": 190000,
      "water_rate": 20.1,
      "reservoir_pressure": 3150,
      "bhp": 2690,
      "bubble_point_pressure": 2500,
      "initial_reservoir_pressure": 4100,
      "reservoir_type": "solution_gas_drive",
      "region": "North",
      "lift_active": false,
      "lift_type": "NONE"
    }
  ],
  "units": {
    "oil_rate": "STB/day",
    "gas_rate": "scf/day",
    "water_rate": "STB/day",
    "pressure": "psi"
  },
  "threshold_rate": 50,
  "min_consecutive_periods": 2,
  "forecast_horizon_months": 12
}
```

The example shows the request shape; the analysis endpoint needs **at least six positive oil-rate observations for each well** to fit the current Arps models. For a useful HGB fit, use several wells with long enough, consistent histories. The train endpoint requires at least four wells after any exclusions and at least 20 usable target rows. `horizon_steps` counts rows in each well’s sorted history: it is one month only for complete monthly data. The API cannot infer gaps or sampling frequency from column names.

## Train HGB, then forecast a new well

The dashboard can upload a training dataset once and retain the returned `model_id` while the API process is running. Exclude the target well from training when testing new-well generalization:

```bash
curl -X POST http://127.0.0.1:8000/v1/models/train \
  -H 'Content-Type: application/json' \
  -d @training_request.json
```

The training response includes a UUID `model_id`, the horizon, sample/well counts, held-out-well MAE/RMSE/R², and persistence MAE. These scores are one validation split, not an accuracy guarantee. The final model is fit on the submitted non-excluded training wells.

Then send the target well’s dated history to `/v1/analyze`, setting `model_id` to that UUID. The response includes the HGB’s one-point prediction at the model’s trained horizon, the holdout metrics, and a note that the predicted date is estimated from the target well’s observed cadence. Arps returns a monthly forecast curve separately. The API does not recursively invent future gas, water, pressure, or operating values for HGB.

The model registry is **in memory**: model IDs stop working after the API restarts and are not shared across multiple server worker processes. For a deployed dashboard, add persistent model storage and a user-scoped model registry before using multiple workers.

## File upload example

For a CSV with noncanonical source headers, map each source header to its canonical name. The mapping direction is `source header: canonical name`:

```bash
curl -X POST http://127.0.0.1:8000/v1/analyze/upload \
  -F 'file=@well_history.csv' \
  -F 'column_map={"Well Name":"well_id","Production Date":"date","Oil Rate (STB/day)":"oil_rate","Lift Operating":"lift_active"}' \
  -F 'units={"oil_rate":"STB/day"}' \
  -F 'threshold_rate=50' \
  -F 'min_consecutive_periods=2' \
  -F 'forecast_horizon_months=12'
```

`/v1/models/train/upload` accepts the same `file` and `column_map` fields plus `horizon_steps` and an optional JSON array `exclude_well_ids`. The service rejects unsupported file types, missing required columns, invalid dates/rates, duplicate well/date rows, and uploads larger than 25 MB rather than silently fixing them.

## Response data for dashboard charts

Each analysis result includes:

- `history`: dated oil, gas, water, pressure, and lift-state values when supplied.
- `forecast`: monthly date, Arps oil-rate forecast, and persistence reference values. These arrays can drive time-series charts directly.
- `trend`: a descriptive linear slope and first-to-last rate change; this is a history summary, not a causal decline diagnosis.
- `arps_fit`: selected decline form and fitted parameters (`qi`, `Di`, `b`) plus the AICc fit diagnostic. AICc is not forecast accuracy.
- `threshold_check`: the latest observed rule status. A natural-flow threshold status is reported only when the relevant dated `lift_active` observations are known. The first sustained observed crossing is not a learned prediction.
- `hgb_prediction`: present only when the caller supplies a valid trained `model_id`.
- `artificial_lift`: `status: "not_implemented"` and `recommendation: null`.
- `visualizations`: recommended chart series. `three_d_available` is false because the source data do not contain well survey coordinates, completion trajectory, or reservoir surfaces.

The API reports no calibrated transition probability or uncertainty interval. A curve crossing a rate threshold is a scenario from the fitted Arps curve, not a lift trigger.

## Dashboard integration notes

A browser dashboard can call the endpoints with `fetch` and render returned `history` and `forecast` arrays using Plotly, ECharts, Recharts, or another charting library. Local development CORS permits common localhost frontend ports (`3000` and `5173`). To add another local origin, set `SGD_API_CORS_ORIGINS` to a comma-separated list before starting `sgd-api`.

For a handoff to a coding assistant, use the copy-ready [dashboard-generation prompt](dashboard_generation_prompt.md). It constrains the generated frontend to the real API contract and prevents it from inventing a lift recommendation or 3D geometry that the API cannot provide.

The API does not serve a frontend, authenticate users, or provide a production deployment. It binds to localhost by default. Do not expose it publicly or send confidential well data over an unauthenticated connection. Before cloud deployment, add HTTPS, authentication/authorization, per-user data isolation, request limits, logging policy, persistent model storage, and infrastructure secret management. Only bind to `0.0.0.0` behind those controls.

## Artificial-lift scope

The API can return observed rate trends, forecasts, and a transparent threshold check. It cannot decide that a well needs lift or rank ESP, gas lift, rod pump, PCP, hydraulic lift, or another method. Those decisions need verified lift-transition outcomes and engineering/facility/economic constraints such as well geometry, fluid properties, available power or gas, surface capacity, maintenance, safety, and cost. Any future lift-screening endpoint must be trained and validated separately against suitable field cases and reviewed by qualified engineers.
