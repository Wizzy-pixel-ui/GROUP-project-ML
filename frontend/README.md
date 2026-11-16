# GROUP Project ML — dashboard frontend

This React/TypeScript/Vite client connects to the repository's FastAPI service; Python remains the source of model calculations. The dashboard reads actual API responses and does not fill charts with demo values. A real Volve producer-history sample is included as an optional, attributed file for trying the workflow. The live password-protected group test is at [group-project-ml-dashboard.onrender.com](https://group-project-ml-dashboard.onrender.com); its deployment behavior and login notes are documented in [`../docs/render_free_deployment.md`](../docs/render_free_deployment.md).

## Run locally

Use two terminals from a trusted development machine. The local API defaults to unauthenticated localhost; do not expose it publicly or submit confidential well data over an untrusted connection.

**Terminal 1 — backend, from the repository root:**

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
sgd-api
```

The API listens at `http://127.0.0.1:8000` by default. Its interactive contract is at `http://127.0.0.1:8000/docs`.

**Terminal 2 — frontend:**

```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

Open the Vite URL printed in the terminal, normally `http://127.0.0.1:5173`. Local development origins on port 5173 are included in the API's CORS defaults. If the API runs elsewhere, set `VITE_SGD_API_BASE_URL` in `frontend/.env.local`, or change the API origin in Settings for the current browser session. Never put credentials or secrets in a `VITE_*` variable.

The production frontend uses same-origin API requests. The root Dockerfile enables the server-side shared HTTP Basic password gate by default and expects a deployment Secret named `APP_PASSWORD` (minimum 20 characters); the password must never be added to this repository or frontend environment. A shared password is only a test gate, not individual accounts or per-user data isolation. The current host is Render Free: the stable URL sleeps after 15 minutes idle, may take about a minute to wake, and is not suitable for confidential or regulated well data. See the deployment guide for current limits and verified behavior.

## Interactive workflow

1. Open **Dataset Management** and choose CSV, XLS/XLSX, Parquet or JSON, or load the bundled Volve CSV. Uploads are limited by the API to 25 MB and 100,000 parsed rows.
2. Inspect the first 50 source rows and map headers to `well_id`, `date`, `oil_rate`, and any optional canonical fields. Header-based suggestions are not automatically trusted; confirm them.
3. Document the oil-rate unit before submitting. Rate and pressure values are not converted. The selected file's row count, missing values, invalid dates/rates, duplicate well/date rows, and positive observation-gap min/median/max are reported before analysis. Cadence is displayed as days; monthly intervals are not assumed. Invalid or duplicate records are not silently repaired.
4. Set an optional user-defined threshold in the oil-rate unit, consecutive-row count, and Arps forecast horizon, then run the real `/v1/analyze/upload` request.
5. Review per-well production history, trend summaries, Arps fit and its AICc diagnostic, threshold status, measured pressure context, and forecast table. Select a measured variable or date window in Production Analytics. Forecast curves are shown only for oil rate.
6. If the active file is multiwell, train the current HistGradientBoosting model in Machine Learning. Inspect its held-out-well errors against persistence, then optionally re-run the same upload with its process-local `model_id`.
7. Export the current API result as JSON or observed/modelled history and forecast rows as CSV in Reports.

Browser state is held in memory for the current tab. The source file is sent only to the configured API origin; this frontend does not use third-party analytics or persistent app storage. Refreshing the page clears its working state. The API also does not persist uploaded histories, but an HGB model is retained in that API process until restart.

## Bundled Volve sample

The sample contains 9,143 daily producer rows from six Volve wellbores (2008–2016). It is real field production history from Equinor and former Volve license partners and is included under the source terms recorded in [`../docs/volve_data_and_license.md`](../docs/volve_data_and_license.md). Its source workbook does not document well-level artificial-lift status, natural-flow transition outcomes, solution-gas-drive labels, or project-defined transition labels. It therefore demonstrates software behavior and selected field-data analysis, not lift-transition model accuracy. Verify units against the source field dictionary before interpreting results.

## What is implemented and what is not

| Area | Implemented now | Explicit limit |
|---|---|---|
| Data intake | File selection, sample loading, editable source-to-canonical mapping, bounded preview, server-side validation, unit documentation | No automatic unit conversion, imputation, aggregation, schema repair, PDF/scan reading, or confidential-data handling policy for shared hosting |
| Production | Per-well chart selection, measured oil/gas/water/pressure variables when supplied, date filters, tables, Arps/persistence oil-rate curves | Pressure, gas-rate and water-rate forecasts are unavailable; Arps is a curve-fit scenario, not a calibrated transition prediction |
| Reservoir context | Submitted reservoir pressure, flowing BHP, and bubble-point measurements can be compared as dated observations when present | No PVT/material balance/drive classifier/pressure forecast/IPR/VLP/nodal operating point |
| Natural flow | User-defined rate rule, observed status, and first sustained historical crossing when dated lift-state data support it | No learned transition timing or future natural-flow-inadequacy classifier |
| Machine learning | Existing HistGradientBoosting oil-rate regressor, one held-out-well validation split, persistence comparison, optional point inference | Not an event/lift classifier; row-count horizon; no future operating-variable paths; in-memory model registry; validation is not a guarantee |
| Artificial lift | Methodology documentation is available in the repository | No lift recommendations or candidate ranking are implemented |
| 3D and monitoring | Routes clearly state availability | No well trajectory, reservoir geometry, 3D animation, simulated monitoring, or instrument connection |
| Reports | JSON and CSV downloads with units and observed/modelled labels | No PDF report or persistent report archive |

The observed-rate threshold is a transparent rule, not an engineering definition of natural-flow failure unless the project supplies and validates that definition. Volve's field-level water injection and undocumented well lift histories do not establish solution-gas-drive transition labels.

## LAN access and security

Vite binds to loopback by default. A deliberate test on a trusted LAN can use `pnpm dev -- --host 0.0.0.0`, but the API must also be configured for that origin and device. Do not use this override on an untrusted network. The Docker image has authentication enabled and fails closed if its password Secret is absent/too short; however, a shared Basic password is not production-grade identity, user isolation, authorization, or persistent storage.

## Verification

From `frontend/`:

```bash
pnpm run typecheck
pnpm test
pnpm run build
```

From the repository root:

```bash
python -m pytest -q
```

See [`../docs/api_guide.md`](../docs/api_guide.md) for route details and [`../TODO.md`](../TODO.md) for remaining release/deployment checks.
