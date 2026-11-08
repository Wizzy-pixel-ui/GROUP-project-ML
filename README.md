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

A real field dataset is now included: the Equinor Volve production workbook and a canonicalized producer-only daily panel. This is genuine field data, but it is **not a direct solution-gas-drive natural-flow transition dataset**. Volve was produced with water injection for pressure support, and the production workbook does not identify natural-flow/lift status or a transition event. See [Volve data provenance and suitability](docs/volve_data_and_license.md).

| Capability | Status | Notes |
|---|---|---|
| CSV, Excel, Parquet, JSON ingestion | Implemented | Requires explicit column mapping and unit checks |
| Per-well history features | Implemented | Lag, rolling mean, slope, elapsed time, pressure/bubble-point relation |
| Natural-flow inadequate event label | Synthetic example only | Configurable threshold logic is not validated against field transition records |
| Fixed-horizon oil-rate regression | Implemented | HistGradientBoostingRegressor baseline |
| Arps decline curves | Implemented | Exponential, harmonic, and hyperbolic candidates; AICc selection on training history |
| Held-out-well evaluation | Implemented | Prevents rows from the same well leaking across split |
| Dashboard-style metric/prediction tables and charts | Implemented in notebook | No GUI; exports CSV reports and renders plots inline |
| Downhole-pressure forecasts | Implemented in Volve benchmark | Single-field test only; HGB is worse than persistence in current holdouts |
| Calibrated time-to-inadequacy probability | Not yet implemented | Requires event and censoring data across wells |
| 30 real eligible solution-gas-drive wells | Not included | Source licenses/login and reservoir-drive documentation must be verified |
| Synthetic demonstration data | Included | Pipeline testing only; not evidence of predictive performance |
| Real Volve field production data | Included | Six producer wells; supports rate/pressure forecasting experiments, not natural-flow transition labels |
| Hugging Face Chronos-2 | Implemented as optional benchmark | Generic pretrained model; scores poorly on the selected Volve tail holdout |
| Hugging Face Chronos-Bolt-Small | Implemented as optional benchmark | Beats persistence on MAE in one held-out well tail, but is not field-validated |

## Repository structure

```text
.
├── README.md
├── requirements.txt
├── requirements-models.txt   # Optional Hugging Face Chronos inference
├── environment.yml
├── configs/project.yaml
├── data/
│   ├── README.md
│   ├── raw/                 # Authorized, immutable source data only
│   ├── processed/           # Derived data with transformation notes
│   ├── synthetic/demo_well_monthly.csv
│   ├── raw/volve/Volve production data.xlsx
│   └── processed/volve_daily_producers.csv
├── docs/
│   ├── volve_data_and_license.md
│   ├── huggingface_models.md
│   ├── volve_field_results.md
│   ├── arps_method.md
│   ├── canonical_schema.csv
│   ├── data_provenance.csv
│   ├── model_card.md
│   └── workflow.mmd
├── notebooks/01_natural_flow_adequacy_baseline.ipynb
├── notebooks/02_volve_real_field_benchmark.ipynb
├── scripts/compare_arps_models.py
├── reports/arps_comparison/ # Reproducible reference metrics, forecasts, metadata, and chart
├── src/sgd_ml/              # Reusable Python functions, including arps.py and comparison utilities
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

The evaluation compares persistence (future rate equals the latest observed rate), a recursive HistGradientBoosting model, Arps decline curves, and optional Chronos time-series models. The Arps fitter evaluates exponential, harmonic, and hyperbolic forms and selects using AICc on training-only positive-rate history. A survival model or discrete-time event hazard model is suitable for time-to-inadequacy once events and censored histories are consistently defined. Sequential neural networks are not a default: they need enough long, consistent histories and must outperform simpler baselines on well-held-out and forward-time tests.

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

Open `notebooks/01_natural_flow_adequacy_baseline.ipynb` for the synthetic software demonstration. Open `notebooks/02_volve_real_field_benchmark.ipynb` for the included real field-data evaluation. For optional Hugging Face models, install `requirements-models.txt` separately; this installs PyTorch/Chronos dependencies and downloads model weights at first inference. For other field data, map source columns, document units, verify cadence, and define the target before fitting.

To run the new decline-curve comparison from the project root:

```bash
python scripts/compare_arps_models.py
python scripts/compare_arps_models.py --include-hugging-face
```

The second command downloads/runs Chronos-2 and Chronos-Bolt-Small if their optional dependencies are installed. The script saves comparison metrics, forecast rows, metadata, and a chart under `reports/arps_comparison/`.

## Understanding the results
The synthetic CSV has 36 artificial well histories and exists only to verify pipeline behavior. In its original single-step held-out-well and purged time-split evaluations, the tabular model does **not** beat persistence: oil-rate MAE is about 294 versus persistence MAE about 104 in source units for the held-out well; downhole-pressure MAE is about 18.2 versus persistence about 12.3. In the purged future-time split, oil-rate MAE is about 140 versus persistence about 53.0, and pressure MAE about 19.6 versus about 13.5. A separate same-horizon 21-month comparison—including recursive HGB and Arps—is described below. These are preliminary results from one field and selected splits, not general performance estimates.

On a fixed 21-month forecast of 15/9-F-12, Arps selected the exponential form (MAE about 302); recursive HistGradientBoosting was about 207; Chronos-Bolt-Small about 275; and persistence about 389. Chronos-2 was poor (raw MAE about 507; nonnegative-clipped MAE about 388). Despite lower MAE for the first three than persistence in this particular holdout, every model has negative R², and the forecast period includes a shut-in/restart pattern. Arps excludes zero-rate months, so it is not modeling downtime. These preliminary results do not establish useful generalization. See [Arps method and results](docs/arps_method.md), [the executed Volve notebook](notebooks/02_volve_real_field_benchmark.ipynb), and [field results note](docs/volve_field_results.md).

## Data sources and provenance

The repository now includes a small Volve production workbook rather than the approximately multi-terabyte full-field archive. It covers daily production history and operating measurements for six producing wellbores. The source license permits sharing with attribution and a link to the terms, subject to a no-sale condition; see [the attribution and license note](docs/volve_data_and_license.md). The Norwegian Offshore Directorate describes the field as produced with water injection for pressure support, so this source is useful field data but does not establish a solution-gas-drive transition label.

Optional pretrained model benchmarks are documented in [Hugging Face model notes](docs/huggingface_models.md). Chronos-2 and Chronos-Bolt-Small are general time-series models; model weights download separately and are not stored in the repository.
The [SPE Data Repository](https://www.spe.org/en/industry/data-repository/) provides rate-transient data intended for research and training; a site login is required and its use stipulates proper citation. Check individual files for documented reservoir drive, variable definitions, units, and lift status. [Equinor Volve](https://www.equinor.com/energy/volve-data-sharing) is a substantial field dataset with production and subsurface data; verify well/reservoir suitability rather than assuming every well is solution-gas drive. The [Mendeley tight/unconventional production collection](https://data.mendeley.com/datasets/5pzzgngw72) includes seven history files but is not a direct solution-gas-drive oil dataset. See `docs/data_provenance.csv`; update it when actual assets are downloaded.

## Limitations and responsible use
The repository now includes one real-field dataset, but no field validation exists for natural-flow inadequacy or solution-gas-drive transitions. The current regressors underperform persistence in the selected Volve holdouts. Public datasets may have incomplete pressure, PVT, drive mechanism, intervention, and economic context. Different sources may use incompatible units, sampling frequencies, allocation methods, and definitions. Observational prediction does not establish that an artificial-lift intervention caused a production change. Model recommendations require engineering and economic review, uncertainty communication, out-of-distribution checks, and local operating approval.

## Roadmap
1. Select an operational and economic inadequacy definition with the supervisor.
2. Obtain and document eligible natural-flow solution-gas-drive well histories, including lift-transition and censoring information; Volve provides a real-field benchmark but not this target.
3. Obtain and document additional eligible solution-gas-drive well histories if feasible; preserve source citations and operational status.
4. Calibrate a reservoir simulator to those field wells before using synthetic samples for augmentation.
5. Add repeated grouped and purged temporal validation with persistence, decline-curve, and Chronos baselines.
6. Add a censored time-to-event model only after transition/event labels and natural-flow status are verified.
7. Add scenario/decision analysis only after forecast validation; this repository does not yet choose an artificial-lift method.

## Contributors and citation
Add team names, supervisor, institution, and project citation format before distribution. Cite every third-party dataset according to its own terms. This scaffold is a student research prototype; no operational guarantee is provided.
