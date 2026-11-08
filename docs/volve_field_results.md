# Preliminary Volve field benchmark results

These figures are produced by `notebooks/02_volve_real_field_benchmark.ipynb` and `scripts/compare_arps_models.py` from the included real Volve production workbook. They are selected split results, not stable estimates of out-of-field accuracy. Errors use source oil-volume-per-day units (oil targets) or source pressure units (pressure targets).

## Earlier one-step held-out-well and temporal comparisons

| Target and evaluation | Model MAE | Persistence MAE | Interpretation |
|---|---:|---:|---|
| Oil rate, one held-out producer well | 293.67 | 104.35 | Gradient boosting is substantially worse than persistence on this selected well. |
| Downhole pressure, one held-out producer well | 18.21 | 12.29 | Gradient boosting is worse than persistence. |
| Oil rate, purged later-time holdout | 140.27 | 52.99 | Gradient boosting is worse than persistence. |
| Downhole pressure, purged later-time holdout | 19.56 | 13.52 | Gradient boosting is worse than persistence. |

These earlier scores use single-step models and their original holdout definitions; do not merge them with the fixed-horizon results below.

## Identical 21-month oil-rate holdout

The following forecasts are compared on the same final 21 months of well 15/9-F-12 (January 2015–September 2016), using a fixed origin after 83 context months (February 2008–December 2014). Arps uses 82 positive context rates; its December 2014 zero-rate month is excluded from curve fitting. Recursive HGB uses 118 eligible one-step training examples from four other Volve wells, with training targets available by the forecast origin. Chronos models are zero-shot.

| Model | MAE | RMSE | R² | Negative median fraction | Nominal 80% interval coverage |
|---|---:|---:|---:|---:|---:|
| Arps exponential (selected using training-only AICc) | 301.68 | 355.72 | -1.51 | 0% | Not produced |
| HistGradientBoosting, recursively rolled | 207.11 | 261.55 | -0.35 | 0% after physical nonnegative constraint | Not produced |
| Chronos-Bolt-Small median | 275.04 | 343.65 | -1.34 | 0% | 66.7% |
| Chronos-2 raw median | 507.10 | 526.06 | -4.48 | 90.5% | 19.0% |
| Chronos-2 median clipped at zero | 387.52 | 446.67 | -2.95 | 0% after clipping | 19.0% |
| Persistence | 388.97 | 449.20 | -3.00 | 0% | Not produced |

The lowest MAE in this particular split is recursive HistGradientBoosting, followed by Chronos-Bolt-Small and Arps. However, **every R² is negative**, meaning none beats the holdout-mean reference by squared-error criterion. The intervals are not well calibrated: Chronos-2’s nominal 80% band covers 19% of observations, and Chronos-Bolt-Small’s covers 66.7%.

Arps selected the exponential curve from the positive-rate training context. It fitted an estimated `qi` of about 7,712.95 source units/day and nominal `Di` of about 0.04789 per month (`b=0`). The fitted `qi` is an extrapolated curve intercept, not a measured initial reservoir rate. Review it as a warning about fitting one decline trend to a variable operating history, not as a physical reservoir parameter.

The holdout contains a zero-rate December 2014 followed by a substantial January 2015 restart and later low/zero production. That is an operational discontinuity. The Arps fit excludes zero-rate months and continues a smooth decline curve; it does not model shut-ins, restarts, interventions, lift changes, water injection, or downtime. This test is a long-horizon forecast for one known historical well—not a new-well prediction study.

## Interpretation and limits

The group holdout uses one of six producing wellbores and is highly split-dependent. The temporal holdout uses later periods with training labels purged across the cutoff. The fixed-horizon comparison is one selected well and one long test horizon. No result establishes out-of-field generalization, calibration, or decision value.

Most importantly, Volve does not provide verified natural-flow/lift status or a transition event label, and its field recovery strategy included water injection for pressure support. None of these scores measures natural-flow inadequacy prediction or solution-gas-drive transition timing. The models are experimental baselines and must not be presented as accurate or operationally ready.
