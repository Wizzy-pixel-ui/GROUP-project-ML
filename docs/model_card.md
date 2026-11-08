# Model card: natural-flow adequacy research prototype

## Intended use
Research and coursework: organizing well history, forecasting fixed-horizon rates, and testing a configurable inadequacy event definition. It is not an operating recommendation or substitute for reservoir/production engineering review.

## Target definition
The example threshold is 10 oil-rate units per day with two consecutive observed periods below threshold. It is illustrative and must be replaced by a project-approved threshold informed by well economics, facility constraints, stable operating limits, and measurement cadence. The model must use a single consistent unit system or normalize units explicitly.

## Candidate model
The starter uses scikit-learn HistGradientBoostingRegressor inside preprocessing pipelines for fixed-horizon regression. It accepts numeric and categorical predictors, imputes missing values, and ignores unseen category levels safely. Tree boosting is a practical tabular baseline, not proven best for this application. Baselines should include persistence, decline-curve analysis, regularized regression, and well-grouped tree models.

## Validation
The primary split holds out entire wells to test generalization to unseen wells. A separate chronological validation is required for forecasting existing wells. Hyperparameter tuning must occur only within training data. Compare metrics to naive baselines and report error by reservoir type, region, well age, and operating regime.

## Limitations
Synthetic examples demonstrate pipeline behavior only. Public datasets may not document drive mechanism, economic limits, operating changes, or common units. Location and reservoir-type labels can be missing or confounded. Observational data do not establish causal lift effects. Extrapolation outside training coverage is unsafe. The first notebook does not yet provide calibrated survival probabilities or a validated pressure model.

## Reporting
Report MAE and RMSE in target units, R-squared as secondary context, calibration for event probabilities when available, sample counts, train/test well IDs, and prediction intervals. Never use a single generic “accuracy percentage” for regression.
