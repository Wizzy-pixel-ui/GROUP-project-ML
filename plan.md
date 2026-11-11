# GROUP Project ML Web Application — Implementation Plan

- **Repository:** `Wizzy-pixel-ui/GROUP-project-ML`
- **Starting commit:** `dfb6e97`
- **Product type:** Local-first petroleum production and lift-screening dashboard integrated with the repository’s FastAPI service; any public or multi-user deployment is gated on data, engineering validation, and security requirements.

## Product goal and boundary

We will add a responsive browser application that makes the current research prototype usable: users can connect to the API, upload and map structured production data, inspect quality warnings, review real returned histories/forecasts/metrics, optionally train the existing HGB model, and download analysis tables. The UI will distinguish observation, derived calculation, model output, demonstration content, and unavailable features. A planned production-engineering module will use documented well/reservoir conditions to produce a transparent, preliminary artificial-lift shortlist with method-by-method reasons, feasibility gates, missing data, and sensitivity to assumptions and priorities.

The app must not claim capabilities that do not exist. The current API does **not** recommend artificial lift, predict a validated natural-flow transition, solve IPR/VLP or nodal analysis, infer reservoir drive mechanism, forecast pressure, or provide measured 3D reservoir geometry. A later lift-screening feature is planned, but it may rank only preliminary candidates after explicit input and feasibility checks. It must return “insufficient information” when critical data are missing and must not claim a final equipment design or validated optimum. IPR/VLP/nodal calculations remain unavailable until implemented, tested, and reviewed. No user-uploaded reservoir data will be persisted by the initial app or sent to third parties.

The API remains the source of truth for analysis. The browser will not duplicate Arps, feature engineering, HGB training/inference, or engineering equations in JavaScript.

## Architecture

- `frontend/`: React + TypeScript + Vite application, Tailwind CSS, React Router, Axios, Lucide icons and Recharts (or Plotly if comparison needs justify it). API base URL comes from `VITE_SGD_API_BASE_URL`.
- Existing `src/sgd_api/`: continue using existing FastAPI routes and request/response schemas. Do not add redundant analysis/training endpoints.
- Existing `src/sgd_ml/`: retain model and feature implementations; new physical calculations belong in Python modules with explicit assumptions, units, validation and tests if later approved and properly scoped.
- `docs/`: technical assessment, frontend/backend setup, engineering methodology, model/data provenance and deployment/security documentation.
- Existing `tests/`: keep Python API/model tests; add frontend unit tests and explicit API-client contract tests. Do not claim end-to-end coverage until a real UI-to-API test has run.

### Deployment and data handling

Initial implementation is for local development against a separately running FastAPI server. The existing backend binds to `127.0.0.1:8000`; Vite will use the API’s existing CORS allowance at `localhost:5173`. The frontend will retain upload data in browser memory for the session only. We will not add a database until there is an agreed need for persistent data, account ownership, data-retention rules, backup/export policy, and authentication. Do not publicly deploy the unauthenticated API or send confidential well data to a hosted service.

A deployable production arrangement is a later architecture decision: it requires a secured, publicly reachable Python API, user authentication/authorization and per-user data isolation, protected file/model storage, HTTPS, request limits, and an approved data lifecycle. A static frontend by itself does not make the existing API secure or publicly reachable.

## Navigation and outcomes

Navigation items must lead to a functional page or a plainly marked “not implemented” page; never use decorative controls that imply functionality.

1. **Overview:** API connectivity, selected dataset/well counts and current observed summaries only when derived from the loaded data; no fake “live” field cards.
2. **Production analytics:** choose well/variable/date window, compare histories and API-provided Arps/persistence series, inspect underlying records, export tables.
3. **Dataset manager:** upload CSV/XLS/XLSX/Parquet/JSON, preview rows/columns and missingness, map source columns, document units, reject ambiguous/invalid input with repair guidance, submit to `/v1/analyze/upload`.
4. **Well analysis:** select returned well and inspect history, trend, Arps fit, observed threshold rule, model warnings and optional HGB point forecast.
5. **ML workspace:** optional multiwell HGB training through the existing endpoint, show holdout metrics beside persistence metrics, explain row-based horizon, process-local model lifetime, and then allow inference using the returned model ID.
6. **Reservoir/engineering:** display pressure-vs-bubble-point comparison only when compatible dated pressures and units exist; label it a fluid-state relationship, not proof of drive mechanism. Clearly identify IPR/VLP/nodal capabilities as unavailable until implemented.
7. **Artificial lift:** implement a transparent preliminary screening shortlist for gas lift, ESP, sucker-rod pump, PCP, and hydraulic lift; include plunger lift as an optional gas-well/liquid-loading branch. Display method-specific suitability, constraints, feasibility state, missing inputs, weighted criteria and sensitivity. Never convert a screening shortlist into final equipment specifications or a definitive “best” without nodal/design/economic checks and engineering review.
8. **Reports:** export the API response and selected chart data to CSV/JSON first; label provenance, source units, settings and limitations. PDF can be added after a verified implementation.
9. **3D and monitoring:** keep 3D disabled absent actual geometry. If a simulated monitoring view is built, label every generated value as simulated and visually separate it from field observations.
10. **Settings:** API base URL and session behavior; do not store secrets.

## Design

The requested style is a professional petroleum-engineering analytics interface, so we will reuse it rather than invent a competing brand direction.

- **Design movement:** Industrial control-room analytics, restrained and information-first.
- **Core principles:** evidence before decoration; units and provenance adjacent to values; warnings are visually distinct from measurements; controls remain predictable and keyboard-accessible.
- **Color philosophy:** deep navy/charcoal surfaces reduce glare; cool cyan/blue marks data and active navigation; neutral text preserves readability; green is reserved for positive checks, amber for caution, red for critical warnings. Color is never the only carrier of meaning.
- **Layout paradigm:** persistent compact left navigation with a broad working canvas, top-level API/data status, and context-specific analysis panels; chart/table layouts adapt to screen width rather than forcing a uniform card grid.
- **Signature elements:** restrained pressure/production linework; compact unit/provenance chips; consistent state badges (“Measured”, “Derived”, “Modelled”, “Synthetic”, “Unavailable”).
- **Interaction philosophy:** deliberate upload → preview/map → validate → analyze workflow; no silent unit conversion or inferred drive/lift state. Every generated estimate exposes its source, settings, assumptions and warnings.
- **Animation:** minimal state transitions and chart-entry motion; no ambient motion or fake real-time data. Honor reduced-motion preferences.
- **Typography:** readable technical sans-serif for interface text paired with tabular numerals for measurements; clear hierarchy for page title, section, unit labels, table/chart annotations.
- **Brand essence:** a traceable research cockpit for comparing well-history evidence and prototype forecasts; **careful, technical, candid**.
- **Brand voice:** concise, measured, explicit about unknowns. Example: “Arps curve fitted to 18 positive-rate observations.” “Lift recommendation unavailable—review the engineering inputs and evidence first.”
- **Wordmark/logo concept:** compact “SGD” mark built from a simple declining production trace meeting a pressure baseline; no stock oil-rig imagery. Use text fallback if no reviewed asset is available.
- **Signature brand color:** cool cyan used for active selections and primary series, never for warning states.

## Phased delivery

Each phase is an independently reviewable increment and must preserve the working Python baseline.

### Phase 1 — repository assessment and integration contract

Record the existing architecture, routes, algorithms, tests, data provenance, limitations, dependencies, and technical risks. Define the frontend API client from the actual OpenAPI/request-response contract, without inventing endpoints. Confirm local run commands and the private-data boundary.

### Phase 2 — frontend foundation and application shell

Create `frontend/` with pinned Node package manager/toolchain, React/TypeScript/Vite, lint/type diagnostics, routing, responsive industrial shell, API connection status, error/loading/empty states, browser route manifest, `.env.example`, and frontend run instructions. Add no backend/database capability without an explicit need.

### Phase 3 — dataset intake and production analytics

Implement upload/column mapping/unit documentation, preview and client-side data quality warnings, `/v1/analyze/upload` integration, well selection, histories/forecast charts, analysis tables and CSV/JSON export. Do not mutate units or aggregate duplicate records silently.

### Phase 4 — existing ML workflows

Implement HGB training/upload and well analysis against the existing routes. Show the returned holdout metrics, persistence comparison, row-based horizon and model-registry limits. Test API errors and missing/unknown fields.

### Phase 5 — limited reservoir/engineering displays

Add clearly scoped pressure/bubble-point comparison and descriptive context with missing-data handling. Before adding new physical calculations, agree on correlation, input definitions, units, validity range, equations, validation examples and engineering review. IPR/VLP/nodal analysis remains unavailable until that separate work is approved and implemented in Python.

### Phase 6 — evidence-based artificial-lift screening

Implement an auditable, rule/constraint-based preliminary screening engine in Python, separate from the Arps/HGB models. Capture reservoir/fluid properties, rates and pressure, free gas, solids, temperature/viscosity, well trajectory/completion, production duty, surface facilities, power/injection-gas/power-fluid availability, serviceability, reliability, lifecycle economics, and user-defined priorities. Gate hard incompatibilities first; represent unknown conditions as unknown; then rank eligible/conditional candidates using visible criteria and user-visible weights. Include sensitivity to uncertain measurements and weights. Return reasons, counter-evidence, missing inputs, assumptions, candidate status and required next checks. Implement unit-aware validation and known-answer/edge-case tests. Reference the selection methodology document and cite the underlying technical sources in the UI.

The screening result is a shortlist for qualified engineer evaluation, not a final lift selection or equipment design. It must state that selection depends on IPR/VLP/nodal behavior, actual equipment/vendor limits, surface-facility capacity, intervention/reliability risk and lifecycle economics. A learned ranking model is not in scope until authorized, documented lift-choice and outcome evidence exists. Do not require historical transition labels to perform a preliminary physics-informed screen, but do require them before claiming a trained model predicts the transition or optimal method.

### Phase 7 — reports, simulated monitoring, and 3D readiness

Add reproducible exports/reports with data provenance, assumptions and limitations; simulated monitoring only with prominent simulated labels. Enable true 3D visualization only when actual geometry/surface inputs and provenance are available.

### Phase 8 — end-to-end QA, security, and deployment preparation

Run existing Python tests and new frontend/type/lint/API integration checks. Define a production API deployment only after authentication, authorization, HTTPS, user isolation, rate limits, privacy-safe logging, and model/file persistence are implemented. Then write deployment documentation and verify the built frontend against that secured API. No public deploy is part of this plan until approved.

## Project structure

```text
.
├── frontend/
│   ├── public/manus-routes.json
│   ├── src/
│   │   ├── app/                 # routing, providers and shell
│   │   ├── components/          # layout, forms, charts, tables, state badges
│   │   ├── pages/               # overview, production, datasets, wells, ML, engineering
│   │   ├── services/            # typed API client and upload helpers
│   │   ├── types/               # API response/request types
│   │   └── utils/               # formatting, data-quality checks and exports
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── vite.config.ts
├── src/sgd_api/                 # existing FastAPI API; extend only for real backend needs
├── src/sgd_ml/                  # existing modeling/calculation package
├── tests/                       # Python tests; frontend tests live under frontend/
├── docs/technical_assessment.md
├── docs/api_guide.md
├── docs/artificial_lift_selection_methodology.md  # screening factors, method trade-offs, sources and limits
├── docs/                        # model/data provenance, setup, deployment and engineering notes
├── plan.md
└── TODO.md                      # created after plan approval, before configuration/implementation
```

## Dependencies and technical risks

- Add Node/Vite/React/TypeScript, Tailwind, Router, Axios, charting, icons, and frontend test tooling; pin Node and package-manager versions and review lifecycle scripts before install.
- Preserve existing Python dependencies and API schemas. The UI must consume actual route contracts.
- Current API CORS covers common local ports including Vite’s default 5173; verify rather than widen arbitrarily.
- Local API is unauthenticated and not production-ready. Do not make it public in this phase or place private data in the public GitHub repository.
- A frontend upload preview is not a substitute for server-side validation; the current API’s accepted semantics must remain visible.
- Current pressure/production data and model validations do not support a credible lift recommendation or transition probability.
- Full IPR/VLP/nodal and artificial-lift engineering requires reliable property/geometry/facility inputs, correlation choice/limits, known-answer tests and qualified review; it cannot be inferred from the existing field history model.
- Three-dimensional geometry is not present in current assets. A conceptual visualization must be labelled conceptual and must not be represented as Volve or a user’s reservoir.
- Persistent storage and multi-user accounts require an ownership, retention and access-control design before storing uploaded histories or trained models.

## Approval gate

This plan is for the user to approve before frontend files, new dependencies, WebDev configuration, or deployment changes are made. After approval, create `TODO.md` with the required deliverable outcomes and detailed acceptance criteria, then begin implementation. The current assessment is documented in `docs/technical_assessment.md`.
