# Hugging Face deployment option (superseded)

> **This is a historical alternative, not the current deployment.** The group selected Render Free instead. The live password-protected test app is [group-project-ml-dashboard.onrender.com](https://group-project-ml-dashboard.onrender.com); see [`render_free_deployment.md`](render_free_deployment.md) for current login, status, and platform limits. No Hugging Face Space was created.

This deployment arrangement packages the React dashboard and FastAPI API into one Docker Space. The browser and API share the same HTTPS origin; uploaded production tables are processed in request memory, and model objects remain in the API process memory. No database or durable upload store is configured.

## Authentication

The image sets `APP_REQUIRE_AUTH=true` by default. Before the app serves any route, it checks HTTP Basic credentials against the server-side `APP_USERNAME` and `APP_PASSWORD` environment variables. The default username is `group`. The password must contain at least 20 characters; without it, requests receive HTTP 503 rather than opening the app. Invalid or missing credentials receive HTTP 401. The FastAPI API, documentation routes, frontend files, and health endpoint all pass through the gate. HTTPS is provided by the hosting platform.

Set `APP_PASSWORD` as a **Space Secret** in the Space's Settings; do not commit it, add it to a public variable, or put it in a URL. Use a unique random passphrase with at least 20 characters. Anyone sharing this credential has the same access. This is a single shared test password, not individual user authentication, authorization, audit logging, or per-user data isolation. It does not make the prototype suitable for confidential or regulated well data.

Basic authentication is handled by the browser. When prompted, enter username `group` and the password configured as the Space Secret. A browser may retain these credentials until its session ends; use a private browser profile or clear saved site credentials on shared devices.

## Space creation and deployment

The repository root contains `Dockerfile` and Hugging Face Docker Space metadata in the README. The Docker image uses Node 22 to build `frontend/`, installs the Python project from `pyproject.toml`, and serves the SPA and API on port 7860. Deployment artifacts exclude local datasets and notebooks from the image build context.

As checked on 2026-11-15, Hugging Face reported that this Docker Space required a paid plan on the connected account. The user selected Render Free as the alternative, so this Space remains undeployed. The repository is public, so any future Space built from it would expose its source code and committed files regardless of the runtime password.

To deploy once eligible:

1. Create a new **Docker** Space under the desired Hugging Face account and use this repository as its source, or mirror the repository to the Space's Git remote.
2. In Space **Settings → Variables and secrets**, add a secret named `APP_PASSWORD` with a unique random value of at least 20 characters. Keep the username `group`, or set the ordinary variable `APP_USERNAME` if the group wants a different one.
3. Select CPU Basic hardware for this research test if available under the account plan. The Space may sleep after 48 hours without activity; its first visit after sleep can take longer while it wakes up.
4. Wait for the Docker build and Space status to become Running. Verify the browser prompts for a password, then check `/health` and `/v1/capabilities` after authenticating.

## Engineering scope presented to testers

The app is a research prototype for well-history analysis. Its dashboard supports upload, preview/mapping, data validation, API-backed charts/tables, Arps and persistence scenarios, the existing HistGradientBoosting workflow, and CSV/JSON exports. The API does not calculate IPR/VLP or nodal operating points, forecast pressure, predict a validated natural-flow transition, or recommend artificial lift. Three-dimensional reservoir geometry is not available. Forecasts are not calibrated transition probabilities or operating advice. Do not use the test app to make production or equipment decisions.

## Sources

- [Hugging Face Docker Spaces](https://huggingface.co/docs/hub/spaces-sdks-docker): Docker SDK configuration and the `app_port` setting.
- [Hugging Face Spaces overview](https://huggingface.co/docs/hub/spaces-overview): compute plan requirements, visibility, and secrets management.
- [Hugging Face Spaces hardware](https://huggingface.co/docs/hub/spaces-gpus): CPU Basic resources and idle sleep behavior.
