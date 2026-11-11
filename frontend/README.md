# Well Analytics Frontend

This React/TypeScript/Vite application is being added to the existing `GROUP-project-ML` repository. It is a browser client for the existing FastAPI research service; it does not duplicate Python model or engineering calculations.

## Run locally

Use two terminals from a trusted development machine. The current API has no authentication or user-data isolation, so do not expose it publicly or upload confidential well data to an unauthenticated network endpoint.

**Terminal 1 — FastAPI backend, from the repository root:**

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
sgd-api
```

The API listens on `http://127.0.0.1:8000` by default. Its health route is `/health`, capabilities are at `/v1/capabilities`, and interactive API documentation is at `/docs`.

**Terminal 2 — frontend:**

```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`. Local development origins on port 5173 are already included in the API's CORS defaults. If the API runs elsewhere, set `VITE_SGD_API_BASE_URL` in `frontend/.env.local`, or change the API origin in the app's Settings page for the current browser session. Never place credentials or secrets in a `VITE_*` variable.

For a phone or another computer on a network, `127.0.0.1` refers to that device, not the development host. Use a trusted network interface address only after reviewing firewall, CORS and API-access controls. This prototype has no authentication; do not open it to the public internet.

## Checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Current implementation status

The initial increment provides the responsive routed shell, API health/capability checks, session-only API URL settings, and honest feature-status pages. Dataset preview/upload, model training forms, live analysis charts and exports are staged for later increments. Artificial-lift screening, IPR/VLP/nodal calculations, natural-flow transition prediction, 3D asset rendering and persistent user storage are not implemented in this frontend build yet. Read `../docs/artificial_lift_selection_methodology.md` for the planned, source-backed lift-screening design; it is explicitly a preliminary shortlist, not an equipment design.
