# Repository Technical Assessment

- **Project:** GROUP Project ML — natural-flow decline prediction and artificial-lift transition research
- **Repository:** [Wizzy-pixel-ui/GROUP-project-ML](https://github.com/Wizzy-pixel-ui/GROUP-project-ML)
- **Assessment date:** 11 November 2026
- **Scope:** Read-only inspection of the checked-out `main` branch at commit `dfb6e97` before frontend or engineering-feature changes.

## Executive summary

The current repository is a Python research prototype. It contains a tested FastAPI service, machine-learning and decline-curve code, notebooks, synthetic demonstrations, a Volve field-data benchmark, and engineering/API documentation. It contains **no frontend application**: there is no `frontend/` directory, JavaScript/TypeScript application, Node package manifest, router, or browser build configuration.

The API can accept tabular production histories, calculate a descriptive trend, fit an Arps decline curve, compare it with a persistence reference, perform an observed rate-threshold check when lift state is supplied, and optionally train/use a HistGradientBoosting regression model. It is **not** an IPR/VLP/nodal-analysis solver, artificial-lift selector, reservoir simulator, natural-flow transition classifier, 3D geometry service, or secure multi-user deployment.

The safest first application is therefore a clearly labelled research dashboard that integrates existing endpoints, keeps uploaded histories in the current session, explains data and model limitations, and presents explicit “not implemented / insufficient data” states wherever the backend cannot produce an engineering result. New physics-based workflows and any eventual lift screening should be developed and validated as separate later capabilities—not simulated by frontend copy or decorative graphics.

## Existing repository architecture

| Area | Existing implementation | Assessment |
|---|---|---|
| Data science package | `src/sgd_ml/` | Canonicalization, feature engineering, rule labels, model utilities, Volve preprocessing, Arps fitting, optional pretrained-forecast adapters, and an Arps comparison runner. |
| API package | `src/sgd_api/` | FastAPI routes, Pydantic schemas, file loading, analysis service, and an in-memory HGB model registry. |
| Research workflows | `notebooks/`, `scripts/` | Synthetic baseline, Volve field benchmark, and an Arps-versus-model comparison CLI. These are not a user-facing dashboard. |
| Data | `data/` | Synthetic monthly histories, a licensed Equinor Volve workbook, and a derived producer panel. Volve is not verified solution-gas-drive natural-flow/lift-transition evidence. |
| Documentation | `README.md`, `docs/` | Project narrative, API guide, data provenance/licensing, model methodology/results, dashboard-generator prompt, and canonical field schema. |
| Tests | `tests/test_api.py`, `tests/test_pipeline.py` | A small API/model/data/Arps suite. It does not establish field generalization or engineering design validity. |
| Packaging | `pyproject.toml`, `requirements*.txt`, `environment.yml` | Installable Python package and research dependencies. There is no frontend toolchain or container/deployment definition. |
| Frontend | None | React, TypeScript, Vite, Tailwind, charting, routing, and browser tests must be added. |

## Reusable API contract

`src/sgd_api/main.py` currently implements:

| Route | Current behavior |
|---|---|
| `GET /health` | Returns API readiness and version. |
| `GET /v1/capabilities` | Reports formats/models and explicitly unavailable functions. |
| `POST /v1/analyze` | Analyzes JSON well histories and returns per-well summaries and chart-ready series. |
| `POST /v1/analyze/upload` | Same analysis from CSV, XLS/XLSX, Parquet, or JSON upload; accepts explicit source-to-canonical column mappings and a 25 MB upload cap. |
| `POST /v1/models/train` | Trains the current HGB regression model from multiwell JSON records, evaluates one held-out-well split, and retains the model in memory. |
| `POST /v1/models/train/upload` | Same training workflow from a supported table upload. |
| `GET /v1/models/{model_id}` | Returns metadata for a model in this server process. |

The canonical input requires `well_id`, `date`, and numeric `oil_rate`. The service rejects duplicate well/date rows. It does not convert units, infer arbitrary vendor schemas, fill missing data, or guarantee regular sampling. Arps fitting currently needs at least six positive oil-rate observations per well. HGB training requires at least four eligible wells and 20 usable target rows; the forecast horizon counts observations, not calendar periods. The model registry is volatile and process-local.

Analysis responses include historical series, an Arps fit/curve, persistence forecast, trend summary, threshold status, optional one-point HGB result, warnings, and explicit `three_d_available: false` and artificial-lift `not_implemented` status. The threshold check is a transparent observed-row rule, not a learned future event prediction. Arps crossing a threshold is a scenario, not a transition probability or recommendation.

## Existing ML and quantitative methods

- **HistGradientBoostingRegressor:** scikit-learn tabular fixed-row-horizon regression with median numeric imputation/missingness indicators/scaling and categorical imputation/one-hot encoding. Feature engineering includes within-well lagged values, shifted rolling means/slopes, calendar/elapsed time, and available pressure-depletion features.
- **Arps decline curves:** exponential, harmonic, and bounded hyperbolic forms; robust least-squares fitting and AICc selection on positive-rate observations. Zero rates, restarts, interventions, and lift changes are not represented as a physical decline mechanism.
- **Persistence:** repeats the latest observed value as a deliberately simple comparison baseline.
- **Optional pretrained Chronos-2 and Chronos-Bolt-Small:** general-purpose zero-shot time-series comparisons; not petroleum-engineering models.
- **Rule-based threshold helper:** counts consecutive submitted rows below a user-defined limit when dated lift-state information supports the interpretation. It is not a trained classifier or survival model.
- **Evaluation:** MAE, RMSE, R², and optional interval coverage on selected holdouts. Existing field results show that tested models can lose to persistence and yield negative R². They are not broad accuracy evidence.

## Engineering calculations actually present

The repository contains limited engineering-adjacent calculations: deriving GOR and water cut from supplied rates where values are absent; computing pressure-minus-bubble-point and pressure depletion features; describing rate trends; fitting Arps curves; and applying the explicit threshold rule. Some schema fields are accepted as records but are not fed into a physical well-performance model.

There is currently **no implemented**:

- Reservoir-drive-mechanism classifier or confirmation.
- IPR/Vogel/Darcy solver, VLP correlation, or nodal-analysis operating intersection.
- Multiphase wellbore hydraulics, lift equipment sizing, or lift-method feasibility/ranking.
- Validated natural-flow-inadequacy event/time-to-event model.
- PVT-based solution-gas evolution simulator or material-balance engine.
- True 3D well trajectory/reservoir geometry visualization data.
- PDF engineering report pipeline, simulated monitoring service, or persistent dataset/model history.

A pressure-versus-bubble-point display could be added as an explicitly limited fluid-state observation if valid, dated, unit-consistent measurements are provided. It must not be described as proof that the overall reservoir drive mechanism is solution-gas drive.

## Data, provenance, and validation limits

The repository contains toy synthetic well histories and a Volve field subset. Volve provides real production observations but does not contain verified natural-flow/lift status or transition outcomes for the project’s target problem. The project documentation correctly warns against treating it as a solution-gas-drive transition dataset. The public code is MIT-licensed; third-party Volve data have separate terms and attribution requirements.

Current validation is limited to unit/integration tests and selected splits. A single held-out well or one time split is not a field-readiness claim. There is no calibrated event probability, prospective field test, independent multi-field validation, or operational study.

## Dependencies and operational risks

Python runtime uses FastAPI/Uvicorn, Pydantic, pandas/NumPy, scikit-learn, SciPy, file-upload support, and spreadsheet/Parquet readers. Development adds pytest/httpx. Notebook and optional Hugging Face dependencies are separate. There is no Node toolchain yet.

Material risks before public or multi-user deployment:

1. **Confidential data:** current API has no authentication, user authorization, tenant isolation, or durable storage; it is documented for local use.
2. **In-memory models:** model IDs disappear on restart and do not work across workers.
3. **Cadence ambiguity:** row-count horizons and consecutive-row threshold semantics can be mistaken for months if periods are irregular.
4. **Unit ambiguity:** metadata may describe units but does not convert or reconcile them.
5. **Unsupported engineering outputs:** current UI/API must not imply that a forecast is a nodal solution, lift trigger, or lift recommendation. A future preliminary shortlist needs explicit criteria, hard feasibility checks, unit-aware inputs, sensitivity, and engineering review; it is not a final equipment design.
6. **Deployment boundary:** frontend can be served statically, but the Python API needs a separately secured, reachable runtime; a browser-safe URL alone does not secure it.
7. **Engineering methodology and licensing:** screening criteria, input validity ranges, uncertainty, tests, independent review, and any third-party library/data rights must be established before exposing a method ranking. Detailed design additionally requires validated IPR/VLP/nodal and vendor-envelope checks.

## Reusable components

1. API routes and schemas in `src/sgd_api/` for health, capabilities, analyze/upload, train/upload, and model metadata.
2. Canonical production table schema and supported source-to-canonical mappings.
3. Analysis response series for historical rates, Arps forecasts, persistence, HGB point predictions, trend and transparent warnings.
4. Existing feature/model pipeline, Arps estimator and baseline comparison code under `src/sgd_ml/`.
5. Synthetic and Volve notebooks/data as clearly labelled examples, never as proof of lift-selection accuracy.
6. Existing MIT code license and provenance documentation.

## Proposed implementation priorities

1. **Product boundary and integrated first release:** add a React/TypeScript UI in `frontend/`, invoke only actual API endpoints, expose upload mapping/units and quality messages, render real returned series/metrics, and keep no-lift/no-3D states explicit. Run locally; do not persist confidential uploads.
2. **Data workflow and model workspace:** improve preview, field mapping, missingness/duplicate/unit/cadence warnings; support the existing HGB training/upload and inference path with its constraints visible. Do not add speculative routes.
3. **Limited, auditable engineering views:** pressure-versus-bubble-point state and derived summaries only when units and measurements are provided; distinguish observation from drive-mechanism diagnosis. Add calculations in Python with documented equations and tests before surfacing them.
4. **Separate research/engineering validation:** acquire authorized solution-gas-drive histories and verified lift state/events; implement and validate cadence-aware event labels, repeated well/time splits, uncertainty/calibration, and independent field evaluation before a natural-flow transition model exists.
5. **Preliminary artificial-lift screening:** implement a transparent Python decision-support layer using reservoir/fluid, rate, pressure, gas/solids, well geometry/completion, facility, power/injection-gas, serviceability and lifecycle-economic inputs. Apply explicit feasibility gates, expose unknowns rather than treating them as passes, and show reasons and sensitivity for a ranked shortlist. This does not require treating historical operator choices as ground truth, and it must not claim a final design or universal “best” method. IPR/VLP/nodal calculations and detailed equipment limits still need separately specified assumptions, known-answer testing, and engineering review.
6. **Security and deployment hardening:** select authentication/data ownership and persistence architecture; add scoped access, protected storage, upload limits, HTTPS, logging controls, durable model/version storage, and deployment/integration tests before users upload private field data to a public service.
7. **Advanced visualization/reporting/monitoring:** implement true 3D only when licensed or user-supplied geometry/surfaces exist; label conceptual/simulated material; generate reports with provenance and assumptions; keep simulated streams unmistakably simulated.
