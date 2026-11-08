import pandas as pd


def forecast_with_chronos2(values, prediction_length, context_dates=None, model_id="amazon/chronos-2", device_map="cpu"):
    """Running optional zero-shot Chronos-2 forecasting for one regular monthly sequence."""
    from chronos import Chronos2Pipeline

    values = list(values)
    if context_dates is None:
        context_dates = pd.date_range("2000-01-01", periods=len(values), freq="MS")
    context = pd.DataFrame({
        "item_id": "well-series",
        "timestamp": pd.to_datetime(context_dates),
        "target": values,
    })
    pipeline = Chronos2Pipeline.from_pretrained(model_id, device_map=device_map)
    return pipeline.predict_df(
        context,
        prediction_length=prediction_length,
        quantile_levels=[0.1, 0.5, 0.9],
        id_column="item_id",
        timestamp_column="timestamp",
        target="target",
        freq="MS",
    )


def forecast_with_chronos_bolt(values, prediction_length, model_id="amazon/chronos-bolt-small", device_map="cpu"):
    """Running optional zero-shot Chronos-Bolt inference for one univariate series."""
    import torch
    from chronos import BaseChronosPipeline

    pipeline = BaseChronosPipeline.from_pretrained(model_id, device_map=device_map)
    context = torch.as_tensor(values, dtype=torch.float32)
    forecasts = pipeline.predict(context, prediction_length=prediction_length)
    return forecasts.detach().cpu().numpy()
