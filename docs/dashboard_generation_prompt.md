# Copyable Prompt for a Dashboard-Generating AI Agent

Copy the prompt below into the AI coding agent you plan to use. Keep the API guide and OpenAPI page available to that agent as the source of truth.

---

## Prompt

Build a responsive, accessible web dashboard for our **GROUP Project ML** well-production research API. The frontend must call the existing FastAPI service; do not reimplement any model or fabricate reservoir-engineering results in the browser.

### Backend contract

- API base URL comes from an environment variable named `VITE_SGD_API_BASE_URL`; for local development its value is `http://127.0.0.1:8000`.
- Read `GET /v1/capabilities` on startup and use it to show which features are actually available.
- Use `GET /health` for a clear connected/disconnected status.
- Upload history tables using `POST /v1/analyze/upload` as `multipart/form-data`. Form fields include:
  - `file`: CSV, XLS/XLSX, Parquet, or JSON file.
  - `column_map`: optional JSON object mapping source headings to canonical headings, for example `{"Well Name":"well_id","Date":"date","Oil Rate":"oil_rate","Lift Status":"lift_active"}`.
  - `units`: optional JSON object documenting units. The API does not convert units.
  - Optional `threshold_rate`, `min_consecutive_periods`, and `forecast_horizon_months` fields.
  - Optional `model_id` if a model has been trained in the current API process.
- HGB training is optional and requires a separate multiwell data set. Send JSON to `POST /v1/models/train` or a table to `POST /v1/models/train/upload`. Display the returned held-out-well MAE, RMSE, R² and persistence MAE together, label them as one validation split, and allow the user to pass the returned `model_id` to `/v1/analyze/upload`. Do not describe those metrics as a guarantee or as “accuracy percentage.” Model IDs are in-memory and expire when the API process restarts.
- The full request/response schemas are in `docs/api_guide.md` and the interactive schema is available from `/docs` when the API is running. Do not invent routes or response fields.

### Required dashboard behavior

1. Provide an upload panel with file validation, optional source-column mapping, unit-entry fields, threshold and horizon inputs, and clear success/error states. Never silently convert units or replace missing measurements with zero.
2. After a successful response, show the selected well and its date range, observation count, supplied well context, and an easy-to-read data-quality/coverage summary.
3. Plot the returned `history` series and `forecast` series from the API. In particular, display historical oil rate, `arps_oil_rate`, and `persistence_oil_rate` with a legend and labeled units. Display pressure observations only when pressure values are present; do not draw a pressure forecast because the API does not provide one.
4. Show the `trend` metrics and `arps_fit` parameters with short explanations. Label the Arps AICc as a model-fit diagnostic, not forecast accuracy.
5. Show `threshold_check.status`, its configured rate and persistence rule, and the API’s explanatory note. Make it clear that this is an observed threshold rule, not a learned transition prediction.
6. If `hgb_prediction` is present, show it as a single fixed-horizon point, state its `horizon_steps`, estimated date, and held-out-well validation metrics. Do not draw a multi-month HGB curve from one point.
7. Check `artificial_lift.status` before rendering that section. The current API returns `not_implemented` and a null recommendation. Display a clear “Lift recommendation not available in this research prototype” message; do not suggest ESP, gas lift, rod pump, PCP, or any other method.
8. Check `visualizations.three_d_available`. It is currently false. Show a disabled 3D panel explaining that well survey coordinates, completion trajectory, and reservoir surfaces are required. Do not generate a fake 3D well path or reservoir animation from production rates alone.
9. Include a research-prototype disclaimer and do not describe predictions as operational advice. Never retain or transmit uploaded files anywhere other than the API request unless the user explicitly requests and approves a secure storage design.

### Implementation and quality expectations

Use a standard frontend stack with clear separation between API client, upload form, response types, charts, and dashboard layout. If using React, prefer TypeScript and a chart library that supports labeled time series. Keep the visual style suitable for a technical petroleum-engineering presentation: restrained colors, explicit units, readable date axes, tooltips, and accessible contrast.

Include a `.env.example`, local run instructions, and a concise README. Handle API offline state, validation errors (including HTTP 413/415/422), long-running requests, missing fields, and multiple wells in the response. Keep selected well histories in memory for the current session by default; do not upload field data to third-party analytics or external AI services.

Before declaring the frontend complete, test it against the live local API and verify that every displayed value came from an API response or user-entered setting.

---
