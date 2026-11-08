from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from .arps import fit_arps
from .features import engineer_history
from .modeling import make_regressor
from .volve import load_volve_daily, aggregate_volve_monthly, add_monthly_forecast_targets

OIL_FEATURES = [
    "oil_rate", "oil_rate_lag1", "oil_rate_mean3", "oil_rate_mean6",
    "oil_rate_mean12", "oil_rate_slope3", "elapsed_months", "calendar_year",
    "calendar_month",
]


def _score_row(model_name, observed, predicted, lower=None, upper=None, arps_fit=None):
    observed = np.asarray(observed, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    row = {
        "model": model_name,
        "MAE": float(mean_absolute_error(observed, predicted)),
        "RMSE": float(np.sqrt(mean_squared_error(observed, predicted))),
        "R2": float(r2_score(observed, predicted)),
        "negative_prediction_fraction": float(np.mean(predicted < 0)),
        "interval_80_coverage": np.nan,
    }
    if lower is not None and upper is not None:
        row["interval_80_coverage"] = float(np.mean((observed >= lower) & (observed <= upper)))
    if arps_fit is not None:
        row.update({
            "arps_decline_type": arps_fit.decline_type,
            "arps_qi": arps_fit.qi,
            "arps_di_per_month": arps_fit.di,
            "arps_b": arps_fit.b,
            "arps_training_points": arps_fit.observations_used,
            "arps_training_aicc": arps_fit.aicc,
        })
    return row


def _recursive_hgb(monthly, forecast_well, context, test_dates):
    """Training one-step HGB on other wells and recursively forecasting the held-out well."""
    base = monthly[["well_id", "date", "oil_rate"]].copy()
    feature_frame = engineer_history(base, windows=(3, 6, 12))
    labeled = add_monthly_forecast_targets(base, horizons=(1,))
    modeling = feature_frame.merge(
        labeled[["well_id", "date", "oil_rate_future_1m"]],
        on=["well_id", "date"], how="left", validate="one_to_one",
    )
    last_context_date = pd.Timestamp(context.date.iloc[-1])
    target_available_by_origin = modeling["date"] + pd.DateOffset(months=1) <= last_context_date
    train = modeling.loc[
        modeling.well_id.ne(forecast_well)
        & target_available_by_origin
        & modeling.oil_rate_future_1m.notna()
    ].copy()
    if len(train) < 20:
        raise ValueError(f"Only {len(train)} training rows are available for recursive HGB; at least 20 are required")
    model = make_regressor(train[OIL_FEATURES])
    model.fit(train[OIL_FEATURES], train.oil_rate_future_1m)

    history = context[["date", "oil_rate"]].copy()
    history["well_id"] = forecast_well
    prediction = []
    for target_date in pd.to_datetime(test_dates):
        engineered = engineer_history(history[["well_id", "date", "oil_rate"]], windows=(3, 6, 12))
        current_features = engineered.iloc[[-1]][OIL_FEATURES]
        next_rate = max(float(model.predict(current_features)[0]), 0.0)
        prediction.append(next_rate)
        history = pd.concat([
            history,
            pd.DataFrame({"date": [target_date], "oil_rate": [next_rate], "well_id": [forecast_well]}),
        ], ignore_index=True)
    return np.asarray(prediction), int(len(train)), int(train.well_id.nunique())


def run_arps_comparison(
    workbook_path,
    forecast_well="15/9-F-12",
    train_fraction=0.8,
    include_huggingface=False,
    output_dir=None,
):
    """Comparing Arps, field-only recursive HGB, persistence, and optional pretrained forecasts."""
    if not 0.5 <= train_fraction < 1:
        raise ValueError("train_fraction must be at least 0.5 and less than 1")
    daily = load_volve_daily(workbook_path)
    monthly = aggregate_volve_monthly(daily)
    series = monthly.loc[monthly.well_id.eq(forecast_well), ["well_id", "date", "oil_rate"]]
    series = series.dropna(subset=["oil_rate"]).sort_values("date").reset_index(drop=True)
    if len(series) < 18:
        raise ValueError(f"Insufficient monthly history for {forecast_well}: {len(series)} rows")
    split = max(12, int(len(series) * train_fraction))
    if split >= len(series):
        split = len(series) - 1
    context = series.iloc[:split].copy()
    test = series.iloc[split:].copy().reset_index(drop=True)
    first_date = pd.Timestamp(series.date.iloc[0])
    train_time = (context.date - first_date).dt.total_seconds().to_numpy() / (30.4375 * 24 * 60 * 60)
    all_test_time = (test.date - first_date).dt.total_seconds().to_numpy() / (30.4375 * 24 * 60 * 60)

    arps_fit = fit_arps(train_time, context.oil_rate.to_numpy(dtype=float), decline_type="auto")
    arps_prediction = arps_fit.predict(all_test_time)
    persistence_prediction = np.repeat(float(context.oil_rate.iloc[-1]), len(test))
    hgb_prediction, hgb_train_rows, hgb_train_wells = _recursive_hgb(monthly, forecast_well, context, test.date)

    predictions = test.rename(columns={"oil_rate": "observed_oil_rate"})[["well_id", "date", "observed_oil_rate"]].copy()
    predictions["arps_prediction"] = arps_prediction
    predictions["hgb_recursive_prediction"] = hgb_prediction
    predictions["persistence_prediction"] = persistence_prediction
    metric_rows = [
        _score_row(f"Arps {arps_fit.decline_type.title()}", predictions.observed_oil_rate, arps_prediction, arps_fit=arps_fit),
        _score_row("HistGradientBoosting recursive", predictions.observed_oil_rate, hgb_prediction),
        _score_row("Persistence", predictions.observed_oil_rate, persistence_prediction),
    ]
    model_metadata = {
        "forecast_well": forecast_well,
        "context_months": len(context),
        "test_months": len(test),
        "context_start": context.date.min().date().isoformat(),
        "context_end": context.date.max().date().isoformat(),
        "test_start": test.date.min().date().isoformat(),
        "test_end": test.date.max().date().isoformat(),
        "hgb_training_rows": hgb_train_rows,
        "hgb_training_wells": hgb_train_wells,
        "natural_flow_status": "unknown in Volve workbook",
        "field_context": "water injection pressure support; not solution-gas-drive transition validation",
    }

    if include_huggingface:
        from .huggingface_forecasting import forecast_with_chronos2, forecast_with_chronos_bolt
        chronos2_frame = forecast_with_chronos2(
            context.oil_rate.to_numpy(dtype=np.float32),
            prediction_length=len(test),
            context_dates=context.date,
        )
        chronos2_raw = chronos2_frame["predictions"].to_numpy(dtype=float)
        chronos2_clipped = np.clip(chronos2_raw, 0, None)
        chronos2_low = chronos2_frame["0.1"].to_numpy(dtype=float)
        chronos2_high = chronos2_frame["0.9"].to_numpy(dtype=float)
        bolt_array = forecast_with_chronos_bolt(
            context.oil_rate.to_numpy(dtype=np.float32), prediction_length=len(test)
        )[0]
        bolt_low, bolt_median, bolt_high = bolt_array[0], bolt_array[4], bolt_array[8]
        predictions["chronos2_raw_prediction"] = chronos2_raw
        predictions["chronos2_nonnegative_prediction"] = chronos2_clipped
        predictions["chronos2_q10"] = chronos2_low
        predictions["chronos2_q90"] = chronos2_high
        predictions["chronos_bolt_prediction"] = bolt_median
        predictions["chronos_bolt_q10"] = bolt_low
        predictions["chronos_bolt_q90"] = bolt_high
        metric_rows.extend([
            _score_row("Chronos-2 raw median", predictions.observed_oil_rate, chronos2_raw, chronos2_low, chronos2_high),
            _score_row("Chronos-2 nonnegative median", predictions.observed_oil_rate, chronos2_clipped, chronos2_low, chronos2_high),
            _score_row("Chronos-Bolt-Small median", predictions.observed_oil_rate, bolt_median, bolt_low, bolt_high),
        ])
        model_metadata["huggingface_models"] = ["amazon/chronos-2", "amazon/chronos-bolt-small"]

    metrics = pd.DataFrame(metric_rows)
    if output_dir is not None:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        metrics.to_csv(output_dir / "arps_model_comparison_metrics.csv", index=False)
        predictions.to_csv(output_dir / "arps_model_comparison_predictions.csv", index=False)
        fig, ax = plt.subplots(figsize=(12, 5))
        ax.plot(context.date, context.oil_rate, color="gray", label="Observed context")
        ax.plot(test.date, test.oil_rate, color="black", linewidth=2, label="Observed holdout")
        for column, label in [
            ("arps_prediction", f"Arps {arps_fit.decline_type.title()}"),
            ("hgb_recursive_prediction", "HistGradientBoosting recursive"),
            ("persistence_prediction", "Persistence"),
        ]:
            ax.plot(predictions.date, predictions[column], label=label)
        if include_huggingface:
            ax.plot(predictions.date, predictions.chronos2_raw_prediction, label="Chronos-2 raw median")
            ax.plot(predictions.date, predictions.chronos_bolt_prediction, label="Chronos-Bolt-Small median")
            ax.fill_between(predictions.date, predictions.chronos2_q10, predictions.chronos2_q90, alpha=0.12, label="Chronos-2 10–90%")
            ax.fill_between(predictions.date, predictions.chronos_bolt_q10, predictions.chronos_bolt_q90, alpha=0.12, label="Chronos-Bolt 10–90%")
        ax.set(title=f"Same-horizon forecast comparison: {forecast_well}", xlabel="Month", ylabel="Volve source oil-volume units per day")
        ax.grid(alpha=0.25)
        ax.legend(ncol=2)
        fig.tight_layout()
        fig.savefig(output_dir / "arps_model_comparison.png", dpi=160, bbox_inches="tight")
        plt.close(fig)
        pd.DataFrame([model_metadata]).to_json(output_dir / "arps_model_comparison_metadata.json", orient="records", indent=2)
    return {"metrics": metrics, "predictions": predictions, "arps_fit": arps_fit, "metadata": model_metadata}
