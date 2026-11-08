import pandas as pd

SOURCE_RENAME = {
    "DATEPRD": "date", "NPD_WELL_BORE_NAME": "well_id", "BORE_OIL_VOL": "oil_rate",
    "BORE_GAS_VOL": "gas_rate", "BORE_WAT_VOL": "water_rate",
    "AVG_DOWNHOLE_PRESSURE": "bhp", "AVG_DOWNHOLE_TEMPERATURE": "downhole_temperature",
    "AVG_DP_TUBING": "tubing_pressure", "AVG_ANNULUS_PRESS": "annulus_pressure",
    "AVG_CHOKE_SIZE_P": "choke", "ON_STREAM_HRS": "on_stream_hours",
    "AVG_WHP_P": "wellhead_pressure", "AVG_WHT_P": "wellhead_temperature",
    "DP_CHOKE_SIZE": "choke_pressure_drop", "NPD_FIELD_NAME": "field",
    "FLOW_KIND": "flow_kind", "WELL_TYPE": "well_type",
}

def load_volve_daily(path, sheet_name="Daily Production Data"):
    """Loading and canonicalizing Volve daily data while retaining producer well rows."""
    df = pd.read_excel(path, sheet_name=sheet_name)
    df = df.loc[df["WELL_TYPE"].eq("OP")].copy()
    df = df.rename(columns=SOURCE_RENAME)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["region"] = "North Sea"
    df["development_context"] = "Volve; water-injection pressure support at field level"
    df["lift_status"] = "unknown in source production workbook"
    df = df.sort_values(["well_id", "date"]).reset_index(drop=True)
    for col in ["oil_rate", "gas_rate", "water_rate", "bhp", "downhole_temperature", "tubing_pressure", "annulus_pressure", "choke", "on_stream_hours", "wellhead_pressure", "wellhead_temperature", "choke_pressure_drop"]:
        if col in df:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    for col in ["bhp", "downhole_temperature", "tubing_pressure", "annulus_pressure", "wellhead_pressure", "wellhead_temperature"]:
        if col in df:
            df[col] = df[col].replace(0, pd.NA)
    return df

def aggregate_volve_monthly(daily):
    """Aggregating source daily measurements by well and month without filling unobserved periods."""
    data = daily.copy()
    data["date"] = pd.to_datetime(data["date"])
    numeric = [c for c in ["oil_rate", "gas_rate", "water_rate", "bhp", "downhole_temperature", "tubing_pressure", "annulus_pressure", "choke", "on_stream_hours", "wellhead_pressure", "wellhead_temperature", "choke_pressure_drop"] if c in data]
    records=[]
    for well_id, group in data.groupby("well_id", sort=False):
        group = group.set_index("date").sort_index()
        monthly = group[numeric].resample("MS").mean()
        monthly["well_id"] = str(well_id)
        monthly["date"] = monthly.index
        monthly["region"] = "North Sea"
        monthly["development_context"] = "Volve; water-injection pressure support at field level"
        monthly["lift_status"] = "unknown in source production workbook"
        records.append(monthly.reset_index(drop=True))
    out = pd.concat(records, ignore_index=True)
    return out.sort_values(["well_id", "date"]).reset_index(drop=True)

def add_monthly_forecast_targets(monthly, horizons=(1, 3)):
    """Joining future monthly oil and downhole-pressure targets by calendar month."""
    out = monthly.copy()
    out["date"] = pd.to_datetime(out["date"])
    available_targets = [column for column in ["oil_rate", "bhp"] if column in out]
    for horizon in horizons:
        future = out[["well_id", "date", *available_targets]].copy()
        future["date"] = future["date"] - pd.DateOffset(months=horizon)
        future = future.rename(columns={column: f"{column}_future_{horizon}m" for column in available_targets})
        out = out.merge(future, on=["well_id", "date"], how="left", validate="one_to_one")
    return out
