from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

import numpy as np
import pandas as pd

from sgd_api.data import frame_from_records
from sgd_api.schemas import ProductionRecord
from sgd_ml.features import engineer_history
from sgd_ml.modeling import evaluate_regression, make_regressor, split_by_well


@dataclass
class ModelBundle:
    model: object
    feature_columns: list[str]
    horizon_steps: int
    validation_metrics: dict[str, float | int]
    training_rows: int
    training_wells: int
    validation_wells: int


_MODEL_REGISTRY: dict[str, ModelBundle] = {}
_MAX_MODELS = 20


def train_hgb_model(
    records: list[ProductionRecord],
    horizon_steps: int = 1,
    exclude_well_ids: list[str] | None = None,
) -> tuple[str, ModelBundle, float]:
    """Training and registering HGB after grouped-well validation."""
    frame = frame_from_records(records)
    excluded_ids = {str(value) for value in (exclude_well_ids or [])}
    if excluded_ids:
        frame = frame.loc[~frame["well_id"].isin(excluded_ids)].copy()
    wells = sorted(frame["well_id"].unique())
    if len(wells) < 4:
        raise ValueError("HGB training needs at least four non-excluded wells for a minimally useful held-out-well split")

    target = f"oil_rate_future_{horizon_steps}steps"
    frame[target] = frame.groupby("well_id", sort=False)["oil_rate"].shift(-horizon_steps)
    featured = engineer_history(frame, windows=(3, 6, 12))
    excluded_columns = {"well_id", "date", target, "inadequate_now"}
    feature_columns = [
        column
        for column in featured.select_dtypes(include=["number", "object", "category", "bool"]).columns
        if column not in excluded_columns
        and featured[column].notna().any()
        and not column.startswith(("oil_rate_future_", "reservoir_pressure_future_", "months_to_inadequate"))
    ]
    eligible = featured.dropna(subset=[target]).copy()
    if len(eligible) < 20:
        raise ValueError("The training file needs at least 20 usable forecast rows after history and horizon processing")

    train_rows, test_rows = split_by_well(eligible, test_size=0.25, seed=42)
    if train_rows.empty or test_rows.empty:
        raise ValueError("The well-grouped validation split produced an empty training or test set")

    validation_model = make_regressor(train_rows[feature_columns])
    validation_model.fit(train_rows[feature_columns], train_rows[target])
    validation_prediction = validation_model.predict(test_rows[feature_columns])
    scores = evaluate_regression(test_rows[target], validation_prediction)
    persistence_mae = float(np.mean(np.abs(test_rows[target].to_numpy(dtype=float) - test_rows["oil_rate"].to_numpy(dtype=float))))
    scores.update({
        "validation_rows": int(len(test_rows)),
        "training_wells_in_split": int(train_rows["well_id"].nunique()),
        "validation_wells": int(test_rows["well_id"].nunique()),
    })

    final_model = make_regressor(eligible[feature_columns])
    final_model.fit(eligible[feature_columns], eligible[target])
    bundle = ModelBundle(
        model=final_model,
        feature_columns=feature_columns,
        horizon_steps=horizon_steps,
        validation_metrics=scores,
        training_rows=int(len(eligible)),
        training_wells=int(eligible["well_id"].nunique()),
        validation_wells=int(test_rows["well_id"].nunique()),
    )
    model_id = str(uuid4())
    if len(_MODEL_REGISTRY) >= _MAX_MODELS:
        _MODEL_REGISTRY.pop(next(iter(_MODEL_REGISTRY)))
    _MODEL_REGISTRY[model_id] = bundle
    return model_id, bundle, persistence_mae


def get_model(model_id: str) -> ModelBundle:
    try:
        return _MODEL_REGISTRY[model_id]
    except KeyError as exc:
        raise ValueError("Unknown or expired model_id; train the model again in this API process") from exc


def predict_hgb(model_id: str, well_history: pd.DataFrame) -> float:
    """Predicting one fixed horizon from the most recent available well row."""
    bundle = get_model(model_id)
    featured = engineer_history(well_history.copy(), windows=(3, 6, 12))
    latest = featured.sort_values("date").iloc[[-1]].copy()
    for column in bundle.feature_columns:
        if column not in latest:
            latest[column] = np.nan
    prediction = bundle.model.predict(latest[bundle.feature_columns])[0]
    return float(max(0.0, prediction))


def clear_registry_for_tests() -> None:
    _MODEL_REGISTRY.clear()
