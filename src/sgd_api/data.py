from __future__ import annotations

import math
from typing import Iterable

import pandas as pd

from sgd_api.schemas import ProductionRecord
from sgd_ml.features import normalize_columns


REQUIRED_COLUMNS = {"well_id", "date", "oil_rate"}


def frame_from_records(records: Iterable[ProductionRecord]) -> pd.DataFrame:
    """Converting validated API rows into a sorted canonical table."""
    rows = [record.model_dump(mode="python", exclude_none=False) for record in records]
    if not rows:
        raise ValueError("At least one production record is required")

    frame = pd.DataFrame(rows)
    missing = REQUIRED_COLUMNS.difference(frame.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame["oil_rate"] = pd.to_numeric(frame["oil_rate"], errors="coerce")
    if frame["date"].isna().any():
        raise ValueError("Every record must have a valid date")
    if frame["oil_rate"].isna().any():
        raise ValueError("Every record must have a numeric oil_rate; use null only for optional measurements")
    if not frame["oil_rate"].map(lambda value: math.isfinite(float(value))).all():
        raise ValueError("oil_rate values must be finite numbers")

    frame["well_id"] = frame["well_id"].astype(str).str.strip()
    if frame["well_id"].eq("").any():
        raise ValueError("well_id cannot be empty")

    for derived_column in ("gor", "water_cut"):
        if derived_column in frame and frame[derived_column].isna().all():
            frame = frame.drop(columns=[derived_column])

    frame = normalize_columns(frame)
    duplicates = frame.duplicated(["well_id", "date"], keep=False)
    if duplicates.any():
        sample = frame.loc[duplicates, ["well_id", "date"]].head(10).to_dict("records")
        raise ValueError(f"Duplicate well_id/date observations must be resolved before analysis; examples: {sample}")

    return frame.sort_values(["well_id", "date"]).reset_index(drop=True)
