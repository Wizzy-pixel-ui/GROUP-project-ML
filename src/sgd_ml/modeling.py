import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestClassifier
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, roc_auc_score, brier_score_loss
from sklearn.model_selection import GroupShuffleSplit

def split_by_well(df, test_size=0.25, seed=42):
    """Splitting complete wells between training and test sets."""
    splitter=GroupShuffleSplit(n_splits=1,test_size=test_size,random_state=seed)
    a,b=next(splitter.split(df,groups=df["well_id"]))
    return df.iloc[a].copy(),df.iloc[b].copy()

def split_by_time(df, test_fraction=0.2):
    """Splitting later observations from earlier observations for known-well forecasting."""
    if not 0 < test_fraction < 1:
        raise ValueError("test_fraction must be between zero and one")
    dates=pd.to_datetime(df["date"])
    cutoff=dates.quantile(1-test_fraction)
    train=df.loc[dates < cutoff].copy()
    test=df.loc[dates >= cutoff].copy()
    if train.empty or test.empty:
        raise ValueError("Time split produced an empty partition")
    return train,test

def make_regressor(X):
    """Building a robust gradient-boosting pipeline for mixed numeric and category features."""
    cats=X.select_dtypes(include=["object","category","bool"]).columns.tolist()
    nums=[c for c in X.columns if c not in cats]
    prep=ColumnTransformer([("num",Pipeline([("impute",SimpleImputer(strategy="median",add_indicator=True)),("scale",StandardScaler())]),nums),
                            ("cat",Pipeline([("impute",SimpleImputer(strategy="most_frequent")),("encode",OneHotEncoder(handle_unknown="ignore"))]),cats)])
    return Pipeline([("preprocess",prep),("model",HistGradientBoostingRegressor(max_iter=250,learning_rate=0.06,l2_regularization=1.0,random_state=42))])

def evaluate_regression(y_true,y_pred):
    """Returning scale-aware regression metrics."""
    return {"MAE":float(mean_absolute_error(y_true,y_pred)),"RMSE":float(np.sqrt(mean_squared_error(y_true,y_pred))),"R2":float(r2_score(y_true,y_pred))}

def time_to_threshold(df, threshold):
    """Estimating observed months from each row until first subsequent threshold crossing."""
    out=df.copy(); out["months_to_inadequate"]=np.nan
    for _,g in out.groupby("well_id"):
        ids=list(g.index); rates=g["oil_rate"].to_numpy()
        months=np.arange(len(g),dtype=float)
        hit=np.flatnonzero(rates<=threshold)
        for pos,ix in enumerate(ids):
            later=hit[hit>=pos]
            if len(later): out.loc[ix,"months_to_inadequate"]=months[later[0]]-months[pos]
    return out

def future_feature_columns(df):
    excluded={"date","well_id","oil_rate","gas_rate","water_rate","reservoir_pressure","bhp","cumulative_oil","cumulative_gas","inadequate_now"}
    return [c for c in df.select_dtypes(include=["number","object","bool"]).columns if c not in excluded and not c.startswith(("oil_rate_future","reservoir_pressure_future","months_to_inadequate"))]
