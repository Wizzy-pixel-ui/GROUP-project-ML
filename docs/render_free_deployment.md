# Password-protected Render Free test deployment

**Status:** Live for group testing

**Dashboard:** [https://group-project-ml-dashboard.onrender.com](https://group-project-ml-dashboard.onrender.com)

**Render service:** `group-project-ml-dashboard`

**Source:** `Wizzy-pixel-ui/GROUP-project-ML`, `main` branch

**Plan:** Render Free, Frankfurt region

## Open and sign in

Open the dashboard URL in a browser on desktop or mobile. The browser will request HTTP Basic credentials. The username is `group`; use the group password shared separately with the project owner. The password is stored as a Render environment secret and is intentionally not included in this repository or in the URL.

The login is one shared test credential, not named user accounts. A browser may cache Basic Auth credentials; on shared devices, use a private browser profile and close it after testing. The repository itself is public, so the password gate protects runtime access but does not make the source code private.

## Try the real-data workflow

1. Open **Dataset Management**.
2. Choose **Load Volve sample** to use the attributed sample, or select a CSV, XLS, XLSX, Parquet, or JSON table.
3. Review the source columns and confirm the suggested mapping to `well_id`, `date`, and `oil_rate`. Document units; values are not converted.
4. Inspect row counts, missing fields, invalid values, duplicate well/date rows, and observed date gaps before submitting analysis.
5. Review returned production charts, Arps and persistence scenarios, measured pressure context, per-well tables, and warnings. The existing HGB workflow can be tested with suitable multiwell input.

The public Volve sample is field-production history, not a solution-gas-drive transition dataset. It does not validate lift recommendations.

## Deployment and verification

The Render web service builds the repository's multi-stage Dockerfile. Node builds the React/Vite frontend; the runtime image installs the FastAPI package and serves the frontend and API on the same HTTPS origin. Render's `PORT` is set to `10000`. The service is configured for the Free plan and the `main` branch. The shared-auth environment variables are set on Render, not in Git.

The live service was verified on 2026-11-16:

- Anonymous dashboard request: HTTP 401; valid shared credentials: HTTP 200.
- Incorrect password: HTTP 401.
- Authenticated dashboard HTML and both primary CSS/JavaScript assets: HTTP 200.
- Authenticated `/health` and `/v1/capabilities`: HTTP 200. The capability response explicitly reports that artificial-lift recommendation and 3D visualization are unavailable.
- Authenticated Volve sample download: HTTP 200.
- The live upload preview accepted 9,143 rows without missing required columns; the live analysis endpoint returned six wells, 9,143 source rows, and 18 forecast points for a three-month horizon.

The service is configured with auto-deploy on commits, but repository pushes did not start builds during initial setup. If a later push does not appear under **Render Dashboard → Deploys**, use **Manual Deploy** for the latest `main` commit and verify the resulting deploy before announcing an update.

## Free-tier behavior and data handling

Render Free web services sleep after 15 minutes without inbound traffic. The URL remains stable, but a first visit after idle can take about a minute while the service wakes. Render grants 750 free instance-hours per workspace per calendar month; free services can be suspended if included usage is exhausted. Free instances have limited CPU/memory and may restart. Local filesystem changes do not persist across restarts or deploys. The workspace's bandwidth and build-pipeline limits also apply; if a payment method is attached, some overages may be billed. Review Render's current usage and billing page before sharing widely.

This is a test deployment, not a production service. Uploads are processed in request memory and are not written to an app database. Browser state and the HGB model registry are in memory; refreshing the browser clears the current workspace, while a server restart clears trained models. Uploads are limited to 25 MB and 100,000 parsed rows per request. Do not submit confidential, regulated, or otherwise sensitive well data to this shared public test instance.

## Engineering and security boundaries

The app provides production-history analysis, Arps exponential/harmonic/hyperbolic decline fits, persistence comparison, a current HistGradientBoosting oil-rate workflow, transparent observed-threshold checks, measured pressure context, and CSV/JSON exports. It is a research prototype, not operating guidance.

It does **not** currently calculate IPR/VLP or nodal operating points; forecast pressure; classify solution-gas-drive behavior; predict a validated future natural-flow transition; select or recommend artificial lift; or display true 3D well/reservoir geometry. The observed threshold rule is not a learned transition model. Volve field history does not establish solution-gas-drive lift-transition labels. Do not use the app to make production, workover, or equipment decisions.

The HTTP Basic gate is one shared password and does not provide individual identity, authorization scopes, audit logging, per-user isolation, or production-grade security. Use a separate, unique password for the group test, keep it in Render Secrets, and rotate it if it is shared beyond the intended group.

## References

- [Render Free web services](https://render.com/docs/free): sleep, included hours, ephemeral filesystem, and usage limits.
- [Render web services](https://render.com/docs/web-services): public service ports and Docker web-service behavior.
- [Dashboard/API guide](api_guide.md)
- [Volve data and license notes](volve_data_and_license.md)
- [Artificial-lift selection methodology and limits](artificial_lift_selection_methodology.md)
