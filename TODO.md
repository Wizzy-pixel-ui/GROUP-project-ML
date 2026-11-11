# Implementation TODO

This tracker preserves the approved plan's user-facing outcomes and concrete requirements. An outcome is marked complete only after its behavior exists and the evidence is verified. Current status: **in progress**.

## 1. Responsive dashboard shell and routes — in progress

- [x] Create a React + TypeScript + Vite frontend in `frontend/` alongside the existing Python backend.
- [x] Provide responsive browser routes for Overview, Production, Well Performance, Reservoir Analysis, Natural Flow, Artificial Lift, Machine Learning, Predictions, Dataset Management, Reports, 3D/Monitoring, and Settings. Unimplemented areas are explicitly labeled as status/placeholder pages rather than presented as live tools.
- [x] Use the approved industrial analytics style: deep navy/charcoal surfaces, cyan/blue highlights, readable typography, and state labels. The current overview distinguishes empty data, live API capability, and unavailable engineering functions.
- [x] Add keyboard-accessible navigation, responsive sidebar controls, page headings/breadcrumb context, and reusable API status refresh.
- [x] Keep implementation separated into routes, layout, pages, API services, types, settings, and tests. Include app metadata and `frontend/public/manus-routes.json`.
- [ ] Complete visual review at desktop/mobile widths and verify every navigation/control at runtime. Avoid marking UI polish complete until those checks pass.
- [x] Honor reduced-motion settings and avoid simulated live values or ambient animation.

## 2. Well-history intake, mapping, validation and session data handling — open

- [ ] Support CSV, XLS, XLSX, Parquet, and JSON using the existing API upload routes.
- [ ] Provide upload → preview/map → validate → analyze, including field detection, missingness, duplicate well/date checks, cadence and numeric parsing diagnostics.
- [ ] Map explicitly to canonical `well_id`, `date`, `oil_rate` and optional API fields; explain schema errors without silently repairing data.
- [ ] Preserve original source units and do not silently convert units, aggregate duplicate records, invent missing values, infer drive mechanism, or assume calendar-month cadence.
- [ ] Keep uploaded histories in browser memory for the session only. Do not send them to third parties, commit private files, or enable an unauthenticated public endpoint.
- [ ] Provide empty/loading/success/error/insufficient-data states and leave source files unmodified.

## 3. Production analytics, well analysis and downloadable outputs — open

- [ ] Connect to actual API routes and render only returned data.
- [ ] Add well selection, variable selection, date filters and charts for returned historical values and Arps/persistence forecasts, with correct units, labels, legends and chart tables.
- [ ] Display trend, Arps form/parameters, forecast arrays, observed threshold, warnings and optional HGB point prediction only when returned.
- [ ] Distinguish observed threshold status from learned future prediction. Do not imply pressure forecasts or lift decisions that the API does not provide.
- [ ] Add CSV/JSON exports carrying source, units, settings and limitations; only call PDF reporting complete after generation and review.
- [ ] Provide readable accessible tables and charts; never fabricate actual-data values.

## 4. Existing HGB model training and prediction workspace — open

- [ ] Add multiwell HGB training via the existing API JSON/upload routes and display returned model ID, held-out-well metrics and persistence baseline.
- [ ] Explain minimum data, that `horizon_steps` counts rows, one-split limitations, in-memory registry reset, and lack of sharing across workers.
- [ ] Support prediction using the existing contract only; show actual response values and errors.
- [ ] Display models only when `/v1/capabilities` says the backend supports them. Keep HGB, Arps, persistence, optional Chronos and future transition models clearly separated by capability/status.
- [ ] Label synthetic and Volve data correctly. Volve is real field production history, not validation of a solution-gas-drive lift-transition model.

## 5. Reservoir engineering context and preliminary artificial-lift screening — open

- [ ] Keep the current API gap explicit: no IPR, VLP, nodal operating point, pressure-drop forecast, drive classifier, lift selector, or validated natural-flow transition prediction.
- [ ] Before showing a lift shortlist, implement an auditable Python screening module and API contract, collecting the reservoir/fluid/rate/pressure/free-gas/solids/viscosity/temperature, well trajectory/completion, facilities, power/gas/power-fluid, intervention/serviceability, reliability, lifecycle economics and priority inputs required by the method.
- [ ] Consider gas lift, ESP, sucker-rod pump, PCP and hydraulic lift; include plunger lift as an optional gas-well/liquid-loading path. Reflect method-specific suitability/adverse factors in `docs/artificial_lift_selection_methodology.md`.
- [ ] Apply documented feasibility gates before ranking. Classify methods `eligible`, `conditional`, `screened_out`, or `unknown`; a missing hard constraint stays unknown, not passed. Make weights configurable and show sensitivity; weighted scores never override hard failures.
- [ ] For every candidate expose reasons for/against, uncertainty, missing inputs, assumptions, provenance/units, ranking method and remaining checks; show “insufficient information” where appropriate.
- [ ] Label results as preliminary engineering shortlists only—not final lift selection, equipment design, installation instructions or validated optimum. Identify required IPR/VLP/nodal work, equipment envelope, facility review, service/reliability, economics and engineering sign-off.
- [ ] Treat pressure vs. bubble point as a dated unit-compatible fluid-state observation, not proof of solution-gas drive.
- [ ] Do not claim transition timing or optimal lift prediction without authorized dated lift states, validated transition labels/outcomes and censoring, and suitable simulator scenarios; operator choices are not automatically optimal labels.

## 6. Reports, monitoring, 3D and extended dashboard features — open

- [ ] Include provenance, units, analysis settings, status, assumptions and limitations in exported reports.
- [ ] Any generated monitoring series/events must be visibly labeled simulated and separated from field data; never imply an instrument connection without authorization and implementation.
- [ ] Keep 3D unavailable until geometry/trajectory data with validated source, coordinate reference, units and permissions are supplied. Label any conceptual geometry clearly.
- [ ] Do not introduce user accounts, persistent storage, dataset history or model history until ownership, retention/deletion, isolation, backup and export requirements are agreed and implemented.

## 7. Local integration, documentation and release readiness — open

- [x] Document local frontend setup and its separate connection to FastAPI in `frontend/README.md`; add an example API URL configuration and no browser secrets.
- [ ] Document exact frontend/backend install, run/stop, test and integration commands in repository-level docs.
- [ ] Preserve Python backend behavior. Add versioned API contracts only for capabilities that are implemented and tested.
- [ ] Keep dependency lockfiles, Node/package-manager pin, route manifest, and example environment files current.
- [ ] Add tests for every new client/UI/API behavior and run existing backend tests; perform a read-only implementation review against this tracker.
- [ ] Do not publicly deploy the current unauthenticated API or dashboard until auth, access control, HTTPS, user isolation, protected storage, rate/resource limits, privacy-safe logging and model/file lifecycle are implemented.
- [ ] Publish changes to the existing public repository only after checking the exact diff and verifying the authorized publishing path. No deployment is claimed in this increment.

## Current progress

- Repository assessment is in `docs/technical_assessment.md`; lift methodology is in `docs/artificial_lift_selection_methodology.md`; the approved phased plan is in `plan.md`.
- First frontend increment adds the responsive routed shell, live health/capability checks, session-only API origin settings, empty/unavailable states and a status page for every requested area.
- Frontend typecheck, 6 UI/API-origin tests, and production build pass; the existing Python suite passes (9 tests). Live local checks confirmed `/health`, `/v1/capabilities`, CORS for the Vite origin, and HTTP 200 for all 12 declared routes. Desktop visual review is complete; mobile visual review remains open.
- Next: build the upload, column-mapping, validation and analysis workflow using the actual `/v1/analyze/upload` contract, without claiming that lift recommendations or 3D are already available.
