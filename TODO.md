# Implementation TODO

This tracker preserves the approved plan's user-facing outcomes and concrete requirements. An outcome is marked complete only after its behavior exists and the evidence is verified. Current status: **in progress**.

## 1. Responsive dashboard shell and routes — in progress

- [x] Create a React + TypeScript + Vite frontend in `frontend/` alongside the existing Python backend.
- [x] Provide responsive browser routes for Overview, Production, Well Performance, Reservoir Analysis, Natural Flow, Artificial Lift, Machine Learning, Predictions, Dataset Management, Reports, 3D/Monitoring, and Settings. Unimplemented areas are explicitly labeled as status/placeholder pages rather than presented as live tools.
- [x] Use the approved industrial analytics style: deep navy/charcoal surfaces, cyan/blue highlights, readable typography, and state labels. The current overview distinguishes empty data, live API capability, and unavailable engineering functions.
- [x] Add keyboard-accessible navigation, responsive sidebar controls, page headings/breadcrumb context, and reusable API status refresh.
- [x] Keep implementation separated into routes, layout, pages, API services, types, settings, and tests. Include app metadata and `frontend/public/manus-routes.json`.
- [x] Bind frontend dev/preview servers to loopback by default; document a deliberate trusted-LAN opt-in rather than exposing the prototype by default.
- [ ] Complete visual review at desktop/mobile widths and verify every navigation/control at runtime. Avoid marking UI polish complete until those checks pass.
- [x] Honor reduced-motion settings and avoid simulated live values or ambient animation.

## 2. Well-history intake, mapping, validation and session data handling — implemented; integration review in progress

- [x] Support CSV, XLS, XLSX, Parquet, and JSON using the API's upload/preview routes, with 25 MB and 100,000-row request limits.
- [x] Provide upload → preview/map → validate → analyze, including conservative field-detection suggestions, missingness, duplicate well/date checks, positive calendar-gap statistics, and date/rate parsing diagnostics.
- [x] Map explicitly to canonical `well_id`, `date`, `oil_rate` and optional API fields; explain schema errors without silently repairing data.
- [x] Preserve original source units and do not silently convert units, aggregate duplicate records, invent missing values, infer drive mechanism, or assume calendar-month cadence.
- [x] Keep uploaded histories in browser memory for the session only. Do not send them to third parties, commit private files, or enable an unauthenticated public endpoint.
- [x] Provide empty/loading/success/error/insufficient-data states and leave source files unmodified.

## 3. Production analytics, well analysis and downloadable outputs — implemented; visual review open

- [x] Connect to actual API routes and render only returned data.
- [x] Add well selection, variable selection, date filters and charts for returned historical values and Arps/persistence forecasts, with source-unit labels, legends and chart tables.
- [x] Display trend, Arps form/parameters, forecast arrays, observed threshold, API-returned warnings and optional HGB point prediction only when returned.
- [x] Distinguish observed threshold status from learned future prediction. Do not imply pressure forecasts or lift decisions that the API does not provide.
- [x] Add CSV/JSON exports carrying source, mapping, units, analysis settings and limitations; no PDF report is claimed.
- [x] Provide readable tables and charts; never fabricate actual-data values.

## 4. Existing HGB model training and prediction workspace — implemented; real multiwell validation remains user-data dependent

- [x] Add multiwell HGB training via the existing API upload route and display returned model ID, held-out-well metrics and persistence baseline.
- [x] Explain minimum data, that `horizon_steps` counts rows, one-split limitations, in-memory registry reset, and lack of sharing across workers.
- [x] Support prediction using the existing contract only; show actual response values and errors.
- [x] Display HGB training only when `/v1/capabilities` reports the trainable model. Keep HGB, Arps and persistence separate from future transition models.
- [x] Label the synthetic fixture and Volve field sample correctly. Volve is real field production history, not validation of a solution-gas-drive lift-transition model.

## 5. Reservoir engineering context and preliminary artificial-lift screening — open

- [x] Keep the current API gap explicit: no IPR, VLP, nodal operating point, pressure-drop forecast, drive classifier, lift selector, or validated natural-flow transition prediction.
- [x] Show submitted reservoir pressure, flowing BHP, and bubble-point history as measurements; label a P-res minus bubble-point arithmetic difference as an observation only when a shared pressure unit is documented.
- [x] Show the API's threshold status and historical crossing separately from any predicted transition; retain unknown lift-state status when no dated observations are supplied.
- [ ] Before showing a lift shortlist, implement an auditable Python screening module and API contract, collecting the reservoir/fluid/rate/pressure/free-gas/solids/viscosity/temperature, well trajectory/completion, facilities, power/gas/power-fluid, intervention/serviceability, reliability, lifecycle economics and priority inputs required by the method.
- [ ] Consider gas lift, ESP, sucker-rod pump, PCP and hydraulic lift; include plunger lift as an optional gas-well/liquid-loading path. Reflect method-specific suitability/adverse factors in `docs/artificial_lift_selection_methodology.md`.
- [ ] Apply documented feasibility gates before ranking. Classify methods `eligible`, `conditional`, `screened_out`, or `unknown`; a missing hard constraint stays unknown, not passed. Make weights configurable and show sensitivity; weighted scores never override hard failures.
- [ ] For every candidate expose reasons for/against, uncertainty, missing inputs, assumptions, provenance/units, ranking method and remaining checks; show “insufficient information” where appropriate.
- [ ] Label results as preliminary engineering shortlists only—not final lift selection, equipment design, installation instructions or validated optimum. Identify required IPR/VLP/nodal work, equipment envelope, facility review, service/reliability, economics and engineering sign-off.
- [ ] Treat pressure vs. bubble point as a dated unit-compatible fluid-state observation, not proof of solution-gas drive.
- [ ] Do not claim transition timing or optimal lift prediction without authorized dated lift states, validated transition labels/outcomes and censoring, and suitable simulator scenarios; operator choices are not automatically optimal labels.

## 6. Reports, monitoring, 3D and extended dashboard features — open

- [x] Include provenance, units, analysis settings, status, assumptions and limitations in JSON/CSV exports.
- [ ] Any generated monitoring series/events must be visibly labeled simulated and separated from field data; never imply an instrument connection without authorization and implementation.
- [ ] Keep 3D unavailable until geometry/trajectory data with validated source, coordinate reference, units and permissions are supplied. Label any conceptual geometry clearly.
- [ ] Do not introduce user accounts, persistent storage, dataset history or model history until ownership, retention/deletion, isolation, backup and export requirements are agreed and implemented.

## 7. Local integration, documentation and release readiness — open

- [x] Document local frontend setup and its separate connection to FastAPI in `frontend/README.md`; add an example API URL configuration and no browser secrets.
- [x] Document exact frontend/backend install, run, test and integration commands in the root and frontend READMEs.
- [x] Preserve the existing analysis/training contracts; add only the in-memory upload-preview diagnostics route required for safe interactive mapping and validation.
- [x] Keep dependency lockfiles, Node/package-manager pin, route manifest, and example environment files current.
- [x] Add tests for this increment, run the existing backend tests, and perform a read-only implementation review; fix the review's loopback-binding issue.
- [x] Do not deploy the unauthenticated API or dashboard publicly in this increment; public deployment remains gated on auth, access control, HTTPS, user isolation, protected storage, rate/resource limits, privacy-safe logging and model/file lifecycle.
- [x] Check the exact diff and push this increment to the existing authorized public repository. No deployment is claimed in this increment.

## 8. Password-protected test deployment — live on Render Free; production hardening not included

- [x] Add a same-origin Docker deployment definition that builds the React application and runs FastAPI on the host-provided port.
- [x] Add an HTTP Basic password gate for all routes, require a 20-character minimum server-side secret, fail closed when the secret is absent, and mark protected responses `no-store`.
- [x] Add authentication tests and document secret handling, the shared-credential limitation, supported prototype features, and engineering exclusions.
- [x] Run backend/frontend suites and production build; authenticate the live Render root, assets, health/capability API, and sample upload/analysis over HTTPS.
- [x] Deploy on Render Free from the public `main` branch, configure the runtime password as a Render secret, and verify anonymous and incorrect credentials are rejected.
- [x] Document the stable test URL, mobile login, free-tier sleep/usage behavior, exact live verification, data handling, and non-production security boundary.
- [ ] Complete visual/accessibility QA on representative desktop and mobile browsers and document any remaining defects.
- [ ] Do not describe the shared Basic password as per-user authorization or production-grade isolation. Do not submit private or regulated well data to the shared public test.

## 9. Preliminary artificial-lift screening — MVP implemented; engineering validation remains open

- [x] Provide a typed FastAPI screening request/response and a separate Python domain module for gas lift, ESP, sucker-rod pump, PCP, hydraulic lift, and a plunger-lift branch for gas wells with liquid-loading concerns.
- [x] Ask for explicit well type and user-stated lift-need evidence; qualitative production duty, fluid viscosity, free gas, solids, trajectory and setting; and availability of required power/injection-gas/power-fluid/rod/PCP-drive resources. Accept unknown values without silently filling them.
- [x] Apply explainable method-specific resource gates and qualitative matches/cautions. Return candidate status, supporting evidence, blockers, missing inputs, input provenance, and method-specific next engineering checks. No score is described as probability, model accuracy, a definitive winner, or evidence that lift is needed; no rank is assigned with insufficient inputs.
- [x] State explicitly that declining oil rate and Arps threshold crossing do not establish inadequate natural flow; require user-stated lift-need evidence and label it as unverified by the API. Do not present the current Arps/HGB forecasts as lift-design inputs.
- [x] Include traceable screen rules and SPE/IPIECA methodology references. Clearly say IPR/VLP/nodal analysis, PVT/flow modeling, equipment/vendor sizing, facilities/economics, uncertainty sensitivity, validated ML recommendation, and qualified engineering sign-off are still required/not implemented.
- [x] Make the mobile-responsive Lift Screening page submit to the real API and render input provenance, provisional order rationale, hard gates, unknowns, and next checks. No LLM is used to make or embellish the engineering decision.
- [x] Add backend domain/API edge-case tests and frontend request/result coverage. Keep the feature out of production claims until engineering validation is complete.
- [ ] Review rule applicability and thresholds with a qualified production/artificial-lift engineer before relying on any output for field decisions.
- [ ] Deploy this feature commit to the protected Render test site and verify authenticated API/page access.

## Current progress

- Repository assessment is in `docs/technical_assessment.md`; lift methodology is in `docs/artificial_lift_selection_methodology.md`; the approved phased plan is in `plan.md`.
- The dashboard now supports a 5-format upload workflow, source-column mapping, units, validation, rate/pressure charts and tables, per-well summaries, threshold observations, HGB training/inference, JSON/CSV exports, and a new input-driven preliminary lift-screening workflow. The bundled Volve file is real field production history with source attribution, not transition-label evidence or lift-choice labels.
- The upload-preview API reports missing fields, invalid dates/rates, duplicate well/date rows, and observed day gaps; it reads in memory, does not repair values, and enforces byte/row limits.
- Backend tests pass (21, including 7 lift-screening cases); frontend strict typecheck and 10 UI/API tests pass. The new frontend production build succeeds locally. The current live Render release still predates this lift-screening commit; deployment verification remains open.
- Permanent password-protected test website: https://group-project-ml-dashboard.onrender.com. Deployment operations, Free-tier limits, and test details are in `docs/render_free_deployment.md`. The Render service is on the Free plan; it sleeps after 15 minutes idle. It is a stable test URL, not a production guarantee or confidential-data environment.
- Hugging Face was not used: the available account could not create the selected Docker Space without a paid plan, so the user chose Render Free instead. No Hugging Face Space or paid plan was created.
- The shared HTTP Basic credential is server-side only and does not provide per-user access control. Uploaded histories and HGB models remain memory-only. Mobile/desktop visual review remains open. A qualitative preliminary lift screen now exists; final artificial-lift recommendations, IPR/VLP/nodal analysis, natural-flow transition prediction, and 3D remain future engineering work.
- Next: perform responsive/browser QA and continue data/engineering validation; do not present this research-test app as an operating recommendation system.
