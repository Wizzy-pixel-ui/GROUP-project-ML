# GROUP Project ML Web Application — Implementation Plan

- **Repository:** `Wizzy-pixel-ui/GROUP-project-ML`
- **Starting commit:** `dfb6e97`
- **Product type:** Petroleum production research dashboard integrated with the repository’s FastAPI service; local development remains supported, and a password-protected Render Free instance is live for non-confidential group testing. Production or multi-user use remains gated on data, engineering validation, and stronger security.

## Product goal and boundary

We will add a responsive browser application that makes the current research prototype usable: users can connect to the API, upload and map structured production data, inspect quality warnings, review real returned histories/forecasts/metrics, optionally train the existing HGB model, and download analysis tables. The UI will distinguish observation, derived calculation, model output, demonstration content, and unavailable features. A planned production-engineering module will use documented well/reservoir conditions to produce a transparent, preliminary artificial-lift shortlist with method-by-method reasons, feasibility gates, missing data, and sensitivity to assumptions and priorities.

The app must not claim capabilities that do not exist. The current API does **not** predict a validated natural-flow transition, solve IPR/VLP or nodal analysis, infer reservoir drive mechanism, forecast pressure, or provide measured 3D reservoir geometry. This increment adds an input-driven, rule-based **preliminary artificial-lift screening** endpoint and dashboard. It compares stated qualitative constraints, exposes every gate and rationale, and returns “insufficient information” or conditional candidates when key inputs are unknown. It must never claim a final equipment design, validated optimum, or verified need for lift. IPR/VLP/nodal calculations remain unavailable until implemented, tested, and reviewed. A generic/free LLM is not used to make the engineering choice; deterministic visible rules are safer and auditable. No user-uploaded reservoir data will be persisted by the initial app or sent to third parties.

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

#### Approved constrained test deployment (2026-11-15–16)

The user initially selected Hugging Face, then chose Render Free after the available Hugging Face account could not create a Docker Space without a paid plan. The full-stack Render service is live at [group-project-ml-dashboard.onrender.com](https://group-project-ml-dashboard.onrender.com), on the Free plan, with HTTPS and one shared HTTP Basic password held only in Render environment secrets. It gates the frontend and API and fails closed if the secret is missing or shorter than 20 characters; uploaded request data is handled in memory. The live URL, login behavior, Free-tier sleep/resource limits, and verification results are recorded in `docs/render_free_deployment.md`. This is not individual authentication, account authorization, per-user isolation, durable storage, or a production-security review. Do not submit confidential well data. The app must continue to state that IPR/VLP/nodal analysis, validated natural-flow transition prediction, artificial-lift recommendations, and true 3D are not implemented.

## Navigation and outcomes

Navigation items must lead to a functional page or a plainly marked “not implemented” page; never use decorative controls that imply functionality.

1. **Overview:** API connectivity, selected dataset/well counts and current observed summaries only when derived from the loaded data; no fake “live” field cards.
2. **Production analytics:** choose well/variable/date window, compare histories and API-provided Arps/persistence series, inspect underlying records, export tables.
3. **Dataset manager:** upload CSV/XLS/XLSX/Parquet/JSON, preview rows/columns and missingness, map source columns, document units, reject ambiguous/invalid input with repair guidance, submit to `/v1/analyze/upload`.
4. **Well analysis:** select returned well and inspect history, trend, Arps fit, observed threshold rule, model warnings and optional HGB point forecast.
5. **ML workspace:** optional multiwell HGB training through the existing endpoint, show holdout metrics beside persistence metrics, explain row-based horizon, process-local model lifetime, and then allow inference using the returned model ID.
6. **Reservoir/engineering:** display pressure-vs-bubble-point comparison only when compatible dated pressures and units exist; label it a fluid-state relationship, not proof of drive mechanism. Clearly identify IPR/VLP/nodal capabilities as unavailable until implemented.
7. **Artificial lift:** the first working screen compares gas lift, ESP, sucker-rod pump, PCP, and hydraulic lift; plunger lift is a gas-well/liquid-loading branch. It asks for explicit, unit-labeled/qualitative engineering inputs, accepts yes/no/unknown resource availability, and shows method-specific blockers, conditional factors, missing inputs, evidence and next checks. It uses transparent rules and a provisional evidence order, not an AI decision, probability, or learned “best” score. It must say when need for lift is unverified and must not diagnose from declining oil rate alone. Never convert the shortlist into final equipment specifications or a definitive “best” without nodal/design/economic checks and qualified engineering review.
8. **Reports:** export the API response and selected chart data to CSV/JSON first; label provenance, source units, settings and limitations. PDF can be added after a verified implementation.
9. **3D and monitoring:** keep 3D disabled absent actual geometry. If a simulated monitoring view is built, label every generated value as simulated and visually separate it from field observations.
10. **Settings:** API base URL and session behavior; do not store secrets.

## Design

The requested style is a professional petroleum-engineering analytics interface, so we will reuse it rather than invent a competing brand direction.

- **Design movement:** Light neumorphic analytics dashboard based on the user's supplied reference: tactile pale blue-gray surfaces, soft raised/inset shadows, and restrained saturated blue.
- **Core principles:** legibility before softness; white-on-pale contrast with strong dark text; units and provenance adjacent to values; warnings distinct from measurements; keyboard-accessible, responsive controls.
- **Color philosophy:** pale cool blue-gray canvas and slightly brighter card surfaces create gentle depth; blue indicates primary action and measured series; dark slate provides clear typography; green/amber/red are reserved for status/caution/blocking. Color is never the only carrier of meaning.
- **Layout paradigm:** persistent compact light sidebar with a broad working canvas, top-level API/data status, soft-card analytic panels, and chart/table layouts that adapt to screen width.
- **Signature elements:** softly raised white panels and inset wells; animated cobalt primary buttons; bold date/rate charts with readable axes, soft grids and shadowed tooltips; consistent state badges (“Measured”, “Derived”, “Modelled”, “Synthetic”, “Unavailable”).
- **Interaction philosophy:** deliberate upload → preview/map → validate → analyze workflow; no silent unit conversion or inferred drive/lift state. Every generated estimate exposes its source, settings, assumptions and warnings.
- **Animation:** brief button lift/press feedback, subtle page-entry and chart draw-in; no ambient motion or fake real-time data. Honor reduced-motion preferences.
- **Typography:** readable technical sans-serif for interface text paired with tabular numerals for measurements; clear hierarchy for page title, section, unit labels, table/chart annotations.
- **Brand essence:** a traceable research cockpit for comparing well-history evidence and prototype forecasts; **careful, technical, candid**.
- **Brand voice:** concise, measured, explicit about evidence and next steps. Example: “Arps curve fitted to 18 positive-rate observations.” “Review the preliminary lift shortlist against well-specific design and facility data.”
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

Implement an auditable, rule/constraint-based preliminary screening engine in Python, separate from the Arps/HGB models. This MVP captures well type, user-stated lift-need evidence, qualitative duty/fluid/solids/free-gas/trajectory/setting, selected measured pressure/rate context, and availability of electricity, injection gas, power fluid, rod access, and PCP surface drive. Gate explicit hard incompatibilities first; represent unknown conditions as unknown; order remaining candidates by transparent rule matches and cautions, not a probability. Return reasons, counter-evidence, missing inputs, assumptions, candidate status and required next checks. Validate units/ranges for numeric context and test edge cases. Higher-fidelity PVT, IPR/VLP, nodal, equipment/vendor, facilities, reliability, lifecycle-economic, user-weighted and sensitivity analyses remain future work. Reference the selection methodology document and cite the underlying technical sources in the UI.

**MVP delivered 2026-11-16:** a typed `/v1/lift-screening` endpoint and responsive page now implement explicit qualitative resource gates, fit/caution rules, unknown preservation, input provenance, and method-specific next checks. Python and frontend suites pass. This is an input-driven rule screen, not a physics-informed calculation, trained AI, final lift selection, or equipment design. Any remaining order is based on the observed count of explicit rules/cautions, not calibrated weights or a probability.

The screening result is a shortlist for qualified engineer evaluation, not a final lift selection or equipment design. It must state that selection depends on IPR/VLP/nodal behavior, actual equipment/vendor limits, surface-facility capacity, intervention/reliability risk and lifecycle economics. A learned ranking model is not in scope until authorized, documented lift-choice and outcome evidence exists. Do not require historical transition labels to perform a preliminary rule-based screen, but do require them before claiming a trained model predicts the transition or optimal method.

### Phase 7 — reports, simulated monitoring, and 3D readiness

Add reproducible exports/reports with data provenance, assumptions and limitations; simulated monitoring only with prominent simulated labels. Enable true 3D visualization only when actual geometry/surface inputs and provenance are available.

### Phase 8 — end-to-end QA, security, and deployment preparation

Run existing Python tests and new frontend/type/lint/API integration checks. The approved Render Free deployment is a constrained group test, not a production deployment. Before production or multi-user hosting, implement and review stronger identity/access control, per-user isolation, privacy-safe logging, durable model/file lifecycle, and operational limits. Keep the deployment documentation current and verify each released build against the live API.

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
