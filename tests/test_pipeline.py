from pathlib import Path
import sys
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"src"))
from sgd_ml.features import normalize_columns, engineer_history
from sgd_ml.labels import add_forward_targets, label_inadequacy

def test_schema_feature_and_label_pipeline():
    d=pd.DataFrame({"well_id":["A"]*5,"date":pd.date_range("2020-01-01",periods=5,freq="MS"),"oil_rate":[20,15,9,8,7],"gas_rate":[100]*5,"water_rate":[1]*5})
    x=engineer_history(normalize_columns(d))
    y=label_inadequacy(x,threshold=10,min_consecutive=2)
    z=add_forward_targets(y,horizons=(1,))
    assert "gor" in z and "oil_rate_mean3" in z and "oil_rate_future_1m" in z
    assert int(z.inadequate_now.sum()) == 1


def test_volve_field_dataset_ingestion():
    from sgd_ml.volve import load_volve_daily, aggregate_volve_monthly, add_monthly_forecast_targets
    file_path = ROOT / "data/raw/volve/Volve production data.xlsx"
    daily = load_volve_daily(file_path)
    assert daily.well_id.nunique() == 6
    assert len(daily) == 9143
    assert daily.lift_status.str.contains("unknown").all()
    monthly = aggregate_volve_monthly(daily)
    targets = add_monthly_forecast_targets(monthly, horizons=(1,))
    assert "oil_rate_future_1m" in targets
    assert "bhp_future_1m" in targets
    assert targets.development_context.str.contains("water-injection").all()
