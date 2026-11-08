# GROUP project ML — Natural-Flow Adequacy Prediction

## Table of contents
1. [Project overview](#project-overview)
2. [Research question and scope](#research-question-and-scope)
3. [Current capability](#current-capability)
4. [Repository structure](#repository-structure)
5. [Data requirements and formats](#data-requirements-and-formats)
6. [Feature engineering](#feature-engineering)
7. [Algorithms and rationale](#algorithms-and-rationale)
8. [Validation and metrics](#validation-and-metrics)
9. [Run the project](#run-the-project)
10. [Understanding the demonstration results](#understanding-the-demonstration-results)
11. [Data sources and provenance](#data-sources-and-provenance)
12. [Limitations and responsible use](#limitations-and-responsible-use)
13. [Roadmap](#roadmap)
14. [Contributors and citation](#contributors-and-citation)

## Project overview
This repository contains the first research prototype for predicting when a well's natural flow may become inadequate. The intended model will consider documented reservoir type, generalized region, production history, current pressure/operating state, and well/reservoir properties. The current version establishes a transparent data and validation workflow. It is not yet a field-validated predictor, automated lift selector, or operating tool.

The main deliverable is a Jupyter notebook designed to be run cell by cell. It ingests tabular well histories, applies a canonical schema, creates history features, defines a configurable threshold event, evaluates a fixed-horizon oil-rate model on held-out wells, and produces tables and diagnostic charts. No graphical user interface is created.

## Research question and scope
**Question:** Given a well's observed history and current documented conditions, how accurately can we forecast future natural-flow oil rate and estimate the time until a project-defined inadequate-flow condition?

For this first stage, the executable baseline models future oil rate. The notebook also makes an explicit inadequacy label using an example threshold. The threshold is a project decision, not a universal reservoir-engineering constant. A proper time-to-event model and pressure prediction are subsequent validation tasks once representative field observations, intervention records, and well-level event/censoring definitions are assembled.

## Current capability

| Capability | Status | Notes |
|---|---|---|
| CSV, Excel, Parquet, JSON ingestion | Implemented | Requires explicit column mapping and unit checks |
| Per-well history features | Implemented | Lag, rolling mean, slope, elapsed time, pressure/bubble-point relation |
| Natural-flow inadequate event label | Implemented | Configurable rate threshold and consecutive-period rule |
| Fixed-horizon oil-rate regression | Implemented | HistGradientBoostingRegressor baseline |
| Held-out-well evaluation | Implemented | Prevents rows from the same well leaking across split |
| Dashboard-style metric/prediction tables and charts | Implemented in notebook | No GUI; exports CSV reports and renders plots inline |
| Pressure forecasts | Not field-trained | Need measured, consistent pressure targets and separate validation |
| Calibrated time-to-inadequacy probability | Not yet implemented | Requires event and censoring data across wells |
| 30 real eligible solution-gas-drive wells | Not included | Source licenses/login and reservoir-drive documentation must be verified |
| Synthetic demonstration data | Included | Pipeline testing only; not evidence of predictive performance |

## Repository structure

```text
.
├── README.md
├── requirements.txt
├── environment.yml
├── configs/project.yaml
├── data/
│   ├── README.md
│   ├── raw/                 # Authorized, immutable source data only
│   ├── processed/           # Derived data with transformation notes
│   └── synthetic/demo_well_monthly.csv
├── docs/
│   ├── canonical_schema.csv
│   ├── data_provenance.csv
│   ├── model_card.md
│   └── workflow.mmd
├── notebooks/01_natural_flow_adequacy_baseline.ipynb
├── reports/                 # Generated demo outputs
├── src/sgd_ml/              # Reusable Python functions
└── tests/
```

## Data requirements and formats
A canonical record is one well at one date. Required columns are `well_id`, `date`, and `oil_rate`. Recommended columns include `gas_rate`, `water_rate`, `reservoir_pressure`, `bhp`, `bubble_point_pressure`, `initial_reservoir_pressure`, `gor`, `water_cut`, `choke`, `cumulative_oil`, `cumulative_gas`, `reservoir_type`, `region`, `lift_active`, and intervention/shut-in flags.

Supported file formats are CSV, XLSX/XLS, Parquet, and JSON. “Any format” cannot be safely interpreted automatically. For each source, configure a column map, establish measurement units and time cadence, and resolve duplicate well-date records. Convert compatible data to common units before combining. Keep a source/license/access-date record. Never commit confidential or restricted field data to a public repository.

## Feature engineering
History features are constructed independently within each well. The initial feature set includes lagged rates and pressures, trailing rolling means, short-window trend slopes, elapsed producing time, calendar context, GOR, water cut, cumulative production, and reservoir pressure relative to bubble point where fields exist. Feature values are shifted to use only history available at the forecast origin. Operating mode, lift status, shut-ins and interventions must be tracked so changes in operating policy are not mistaken for reservoir depletion.

Geographical features should start with generalized basin/region or geological setting. Fine location can reveal sensitive information and can create misleading shortcuts. Reservoir drive mechanism should be sourced or engineering-reviewed, not inferred from a dataset title alone.

## Algorithms and rationale
The first model is a scikit-learn `HistGradientBoostingRegressor` with imputation and categorical encoding. It is selected as a practical nonlinear tabular baseline for mixed well descriptors and history features. It is not asserted to be the best model for every dataset.

The evaluation plan includes persistence (future rate equals current/recent rate), decline-curve analysis, regularized regression or GAMs, and alternative tree ensembles. A survival model or discrete-time event hazard model is suitable for time-to-inadequacy once events and censored histories are consistently defined. Sequential neural networks are not a default: they need enough long, consistent histories and must outperform simpler baselines on well-held-out and forward-time tests.

## Validation and metrics
The primary split holds out entire wells to test generalization to new wells. A separate forward-time split is needed to evaluate forecasts for previously observed wells. Hyperparameter selection happens inside training data only. Report MAE and RMSE in target units, R-squared as secondary context, sample/well counts, baselines, and uncertainty. Regression does not have a universal meaningful “accuracy percentage.” For event prediction, use time-to-event error, discrimination, calibration, and prediction-window coverage. Review errors by reservoir type, region, operating regime, and data completeness.

Avoid random row splits: adjacent months from the same well are highly related and can leak information between test and training. Never include future data, post-lift data, or future cumulative production in forecast-origin features.

## Run the project

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
jupyter lab
```

Open `notebooks/01_natural_flow_adequacy_baseline.ipynb` and run cells in order. The default uses the synthetic fixture. For field data, place an authorized file under `data/raw/`, edit `DATA_PATH`, map its columns to the canonical names, document units, verify sampling cadence, and replace the example threshold with a project-approved definition. The project can also be installed in editable mode after adding packaging metadata in a later iteration.

## Understanding the demonstration results
The synthetic CSV has 36 simulated well histories and exists to verify the pipeline and plotting cells. Any notebook metrics produced from it describe only this artificial dataset. They must not be reported as field accuracy, evidence of generalization, or validation of solution-gas-drive physics. Do not claim “accurate predictions” until evaluation on suitable independent field wells has been completed.

## Data sources and provenance
The [SPE Data Repository](https://www.spe.org/en/industry/data-repository/) provides rate-transient data intended for research and training; a site login is required and its use stipulates proper citation. Check individual files for documented reservoir drive, variable definitions, units, and lift status. [Equinor Volve](https://www.equinor.com/energy/volve-data-sharing) is a substantial field dataset with production and subsurface data; verify well/reservoir suitability rather than assuming every well is solution-gas drive. The [Mendeley tight/unconventional production collection](https://data.mendeley.com/datasets/5pzzgngw72) includes seven history files but is not a direct solution-gas-drive oil dataset. See `docs/data_provenance.csv`; update it when actual assets are downloaded.

## Limitations and responsible use
Current data are synthetic. No field accuracy is established. Public datasets may have incomplete pressure, PVT, drive mechanism, intervention, and economic context. Different sources may use incompatible units, sampling frequencies, allocation methods, and definitions. Observational prediction does not establish that an artificial-lift intervention caused a production change. Model recommendations require engineering and economic review, uncertainty communication, out-of-distribution checks, and local operating approval.

## Roadmap
1. Select an operational and economic inadequacy definition with the supervisor.
2. Obtain and document 30 or more eligible well histories if feasible; prioritize documented solution-gas-drive cases and preserve source citations.
3. Build a unit-aware import/mapping layer and data-quality report.
4. Add persistence and decline-curve baselines, grouped nested validation, and temporal holdout.
5. Add separately validated pressure targets, probabilistic time-to-event forecasts, and prediction intervals.
6. Compare performance across new and existing wells and reservoir/region strata.
7. Add scenario/decision analysis only after forecast validation; this repository does not yet choose an artificial-lift method.

## Contributors and citation
Add team names, supervisor, institution, and project citation format before distribution. Cite every third-party dataset according to its own terms. This scaffold is a student research prototype; no operational guarantee is provided.
