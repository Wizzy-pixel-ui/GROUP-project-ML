from pathlib import Path
import pandas as pd

SUPPORTED = {".csv", ".xlsx", ".xls", ".parquet", ".json"}

def load_table(path):
    """Loading a supported tabular file while preserving its original columns."""
    path = Path(path)
    suffix = path.suffix.lower()
    if suffix not in SUPPORTED:
        raise ValueError(f"Unsupported file type {suffix}; use CSV, XLSX, XLS, Parquet, or JSON")
    if suffix == ".csv":
        return pd.read_csv(path)
    if suffix in {".xlsx", ".xls"}:
        return pd.read_excel(path)
    if suffix == ".parquet":
        return pd.read_parquet(path)
    return pd.read_json(path)
