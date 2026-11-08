# Arps Decline-Curve Implementation and Volve Comparison

## Purpose and scope

We have added an Arps decline-curve baseline to complement the project’s machine-learning forecasts. The implementation forecasts the future **producing oil-rate trend** from a well’s own historical positive rates. It does not estimate when natural flow becomes inadequate, infer solution-gas-drive behavior, or recommend an artificial-lift method. The included Volve workbook does not supply natural-flow/lift status or a transition-event label, and Volve used water injection for pressure support.

The reusable implementation is in `src/sgd_ml/arps.py`; the end-to-end comparison is in `scripts/compare_arps_models.py`; and executed notebook outputs are in `notebooks/02_volve_real_field_benchmark.ipynb`.

## Arps equations implemented

The exponential decline form is

\[
q(t)=q_i\exp(-D_i t),
\]

whereas the hyperbolic family is

\[
q(t)=\frac{q_i}{(1+bD_i t)^{1/b}}.
\]

The harmonic case is the hyperbolic special case with \(b=1\):

\[
q(t)=\frac{q_i}{1+D_i t}.
\]

Here, \(q_i\) is the fitted rate at the start of the positive-rate fitting interval, \(D_i\) is nominal decline per month, \(b\) is dimensionless, and \(t\) is elapsed time in months. The hyperbolic search constrains \(0.001\leq b\leq1\); exponential and harmonic curves fix \(b=0\) and \(b=1\), respectively.

## Parameter fitting and selection

For each candidate family, the code uses bounded nonlinear least squares on log-rate residuals with a soft-L1 loss. Only finite, strictly positive rates enter curve fitting: a classical decline curve represents the producing trend and is not a shut-in or downtime model. Time is kept in calendar months, including gaps, and predictions are aligned to the first positive-rate observation. The candidate with the lowest small-sample-corrected Akaike information criterion (AICc) is selected using the training context alone. The held-out target months are not used to select the curve.

The script also trains a one-step `HistGradientBoostingRegressor` on history features from other Volve wells whose one-month-ahead training targets were available by the forecast origin. It recursively rolls those predictions forward using only oil-rate history, with no future pressure or operating measurements. Persistence (holding the last context-month rate constant) is scored on the same target months. When enabled, Chronos-2 and Chronos-Bolt-Small are run zero-shot on the same context and horizon.

## Same-horizon field results

All models below are scored on the same 21 monthly oil-rate observations for well 15/9-F-12, January 2015 through September 2016. The context runs from February 2008 through December 2014 (83 months). The training contains 82 positive-rate observations for Arps; December 2014 is zero and is excluded from curve fitting but remains part of the observed history for other approaches. The HGB recursion is trained on 118 eligible one-step examples from four other wells. Errors are in the source workbook’s oil-volume-per-day units.

| Forecast model | MAE | RMSE | R² | 80% interval coverage |
|---|---:|---:|---:|---:|
| Arps exponential, selected by AICc | 301.68 | 355.72 | -1.51 | Not produced |
| Recursive HistGradientBoosting | 207.11 | 261.55 | -0.35 | Not produced |
| Chronos-Bolt-Small median | 275.04 | 343.65 | -1.34 | 66.7% |
| Chronos-2 raw median | 507.10 | 526.06 | -4.48 | 19.0% |
| Chronos-2 median clipped to zero | 387.52 | 446.67 | -2.95 | 19.0% |
| Persistence | 388.97 | 449.20 | -3.00 | Not produced |

Chronos intervals use the model’s 10th–90th percentile output as a nominal 80% interval. The values above come from a single well and one split, so they are exploratory—not stable estimates of expected future performance. Negative R² for every approach indicates all errors are worse than predicting the holdout mean on this selected horizon. HGB has the lowest MAE here, but the benchmark does not establish it as the best algorithm for other wells or fields.

A volatile restart is visible in the held-out history after a zero-rate December 2014, followed by later shut-in/low-production observations. Arps deliberately ignores zero-rate months when estimating the decline parameters and therefore cannot represent that operational pattern. The selected exponential curve’s estimated \(q_i\) is about 7,713 source units/day and \(D_i\) about 0.0479 per month; the extrapolated intercept is not a measured initial reservoir rate and should be engineering-reviewed rather than treated as a physical property.

## Running the comparison

After installing the base project requirements, run:

```bash
python scripts/compare_arps_models.py
```

To additionally run the pretrained models (requiring `requirements-models.txt`, internet access, and first-time weight downloads):

```bash
python scripts/compare_arps_models.py --include-hugging-face
```

The script writes `arps_model_comparison_metrics.csv`, `arps_model_comparison_predictions.csv`, `arps_model_comparison_metadata.json`, and `arps_model_comparison.png` to `reports/arps_comparison/`. Use `--well`, `--train-fraction`, or `--output-dir` to change the selected field well, temporal split, or output location.

## Engineering and validation limitations

Arps decline curves are most interpretable when the well is operating under a stable flow regime and the decline reflects depletion. Volve’s pressure-support and operational history do not establish those conditions for this benchmark. The script does not handle lift changes, interventions, changing constraints, allocation shifts, water injection effects, multiphase transitions, economic limits, or censored end-of-history events. It does not use pressure or PVT to infer a solution-gas-drive state. The comparison is a rate-forecast benchmark only; field-specific histories, operating events, pressure/PVT data, segmented decline periods, and reservoir-engineering review are required before applying it to the project’s natural-flow inadequacy question.
