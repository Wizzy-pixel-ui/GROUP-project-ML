# Preliminary Volve field benchmark results

These figures are produced by `notebooks/02_volve_real_field_benchmark.ipynb` from the included real Volve production workbook. They report selected splits and are not stable estimates of out-of-field accuracy. All errors are in the workbook’s source units.

| Target and evaluation | Model MAE | Persistence MAE | Interpretation |
|---|---:|---:|---|
| Oil rate, one held-out producer well | 293.67 | 104.35 | Gradient boosting is substantially worse than persistence on the selected well. |
| Downhole pressure, one held-out producer well | 18.21 | 12.29 | Gradient boosting is worse than persistence. |
| Oil rate, purged later-time holdout | 140.27 | 52.99 | Gradient boosting is worse than persistence. |
| Downhole pressure, purged later-time holdout | 19.56 | 13.52 | Gradient boosting is worse than persistence. |
| Chronos-2 oil rate, 15/9-F-12 final tail, raw median | 507.10 | 388.97 | Generic pretrained model is poor on this long tail forecast. |
| Chronos-2 oil rate, median clipped at zero | 387.52 | 388.97 | Physical clipping brings MAE close to persistence but does not establish model value. |
| Chronos-Bolt-Small oil rate, 15/9-F-12 final tail, median | 275.04 | 388.97 | Better MAE than persistence on this one series, but negative R² and inadequate interval coverage remain. |

The Chronos-2 10th–90th percentile band covered only 19% of the selected holdout despite nominal 80% coverage; 90.5% of raw median predictions were negative. Chronos-Bolt-Small had no negative median values and a 275.04 MAE versus 388.97 for persistence, but its R² was -1.34 and its nominal 80% interval covered 66.7% of observations. This is one long-horizon test of one well, so it is a preliminary signal rather than proof of reliable generalization or calibration.

The group holdout uses one of six producing wellbores and is highly split-dependent. The temporal holdout uses the last portion of one historical field period, with rows purged so training labels do not cross the cutoff. Both Chronos comparisons use the same single-well long-tail test. These experiments do not establish generalization to other fields.

Most importantly, Volve does not provide verified natural-flow/lift status or a transition event label, and its field recovery strategy included water injection for pressure support. None of these scores measures natural-flow inadequacy prediction or solution-gas-drive transition timing. Current models should not be presented as accurate or operationally ready.
