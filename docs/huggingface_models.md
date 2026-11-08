# Hugging Face time-series models considered

These are general pretrained time-series forecasting models, not petroleum-engineering models. They are integrated as optional oil-rate forecast benchmarks. They do not identify reservoir-drive mechanisms or learn a valid natural-flow inadequacy definition by themselves.

| Model | Hugging Face repository | License | Project role | Material limit |
|---|---|---|---|---|
| Chronos-2 | [amazon/chronos-2](https://huggingface.co/amazon/chronos-2) | Apache-2.0 | Zero-shot multi-step forecast; its model card documents univariate, multivariate, and covariate-informed forecasts | Generic time-series pretraining; must be tested on untouched wells and periods, and is not assumed to transfer to oil wells |
| Chronos-Bolt-Small | [amazon/chronos-bolt-small](https://huggingface.co/amazon/chronos-bolt-small) | Apache-2.0 | Smaller zero-shot univariate forecast | Does not natively use reservoir covariates; a forecast threshold crossing is not a validated transition recommendation |

## Installation and running

The model weights are not committed to this repository. For a CPU-only environment, one option is:

```bash
python -m pip install --index-url https://download.pytorch.org/whl/cpu 'torch>=2.2'
python -m pip install -r requirements-models.txt
```

Open `notebooks/02_volve_real_field_benchmark.ipynb` and run the final model cell. It downloads the selected model weights on first use. The tested Chronos-2 weights occupied about 459 MB and Chronos-Bolt-Small about 191 MB; the exact artifact version and disk size may change. Run the cell only after keeping the data split fixed. Model IDs are `amazon/chronos-2` and `amazon/chronos-bolt-small`.

## Preliminary Volve results

On one 15/9-F-12 long-horizon tail holdout, Chronos-Bolt-Small achieved a median MAE of 275.04 versus persistence at 388.97, while Chronos-2 achieved 507.10 raw MAE and 387.52 after clipping negative forecasts to zero. These figures come from one series and one forecast horizon. Chronos-Bolt's R² remained negative (-1.34) and nominal 80% interval coverage was 66.7%. Chronos-2 had 19% interval coverage and 90.5% negative raw median forecasts. Therefore, neither model is accepted as a reliable predictor; the single-benchmark result for Chronos-Bolt is a candidate worth retesting on more untouched wells, not a generalized accuracy claim.

The project compares them with persistence and a field-trained `HistGradientBoostingRegressor`. It reports field-only held-out values. No fine-tuning is performed. Record model ID, package version, hardware, context length, horizon, and data-split dates when replicating.

These models do not remedy the missing Volve natural-flow/lift labels, unverified solution-gas-drive status, missing static reservoir pressure/PVT labels, or absence of a transition event definition. See [the Volve source and license note](volve_data_and_license.md) and [the benchmark results](volve_field_results.md).
