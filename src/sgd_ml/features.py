import numpy as np
import pandas as pd

BASE_NUMERIC = ["oil_rate", "gas_rate", "water_rate", "reservoir_pressure", "bhp", "water_cut", "gor", "choke", "cumulative_oil", "cumulative_gas"]

def normalize_columns(df, mapping=None):
    """Renaming user columns to canonical names using an explicit alias map."""
    out = df.copy()
    if mapping:
        out = out.rename(columns=mapping)
    required = {"well_id", "date", "oil_rate"}
    missing = required.difference(out.columns)
    if missing:
        raise ValueError(f"Required canonical columns missing: {sorted(missing)}")
    out["date"] = pd.to_datetime(out["date"], errors="coerce")
    out = out.dropna(subset=["date", "oil_rate"])
    out["well_id"] = out["well_id"].astype(str)
    out = out.sort_values(["well_id", "date"]).reset_index(drop=True)
    if "gas_rate" in out and "gor" not in out:
        out["gor"] = out["gas_rate"] / out["oil_rate"].replace(0, np.nan)
    if "water_rate" in out and "water_cut" not in out:
        total = out["oil_rate"].fillna(0) + out["water_rate"].fillna(0)
        out["water_cut"] = np.where(total > 0, out["water_rate"].fillna(0) / total, np.nan)
    return out

def engineer_history(df, windows=(3, 6, 12)):
    """Creating lagged, rolling, calendar and within-well production features."""
    chunks=[]
    for _, g in df.groupby("well_id", sort=False):
        g=g.sort_values("date").copy()
        g["elapsed_days"]=(g["date"]-g["date"].min()).dt.days
        g["elapsed_months"]=g["elapsed_days"]/30.4375
        g["calendar_year"]=g["date"].dt.year
        g["calendar_month"]=g["date"].dt.month
        for col in BASE_NUMERIC:
            if col not in g: continue
            g[col]=pd.to_numeric(g[col],errors="coerce")
            g[f"{col}_lag1"]=g[col].shift(1)
            for w in windows:
                g[f"{col}_mean{w}"]=g[col].shift(1).rolling(w,min_periods=1).mean()
            g[f"{col}_slope3"]=g[col].shift(1).rolling(3,min_periods=2).apply(lambda x: np.polyfit(np.arange(len(x)),x,1)[0] if len(x)>1 else np.nan,raw=True)
        if "reservoir_pressure" in g and "bubble_point_pressure" in g:
            g["pressure_minus_bubble_point"]=g["reservoir_pressure"]-g["bubble_point_pressure"]
            g["pressure_depletion_fraction"]=(g["initial_reservoir_pressure"]-g["reservoir_pressure"])/g["initial_reservoir_pressure"] if "initial_reservoir_pressure" in g else np.nan
        chunks.append(g)
    return pd.concat(chunks,ignore_index=True)
