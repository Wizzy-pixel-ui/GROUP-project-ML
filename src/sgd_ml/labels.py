import pandas as pd

def label_inadequacy(df, threshold, min_consecutive=2):
    """Marking first sustained natural-flow threshold crossing as an event.

    The threshold is an explicit project assumption, not a universal engineering limit.
    Rows where lift is already active are excluded from natural-flow event labeling.
    """
    if threshold is None or threshold <= 0:
        raise ValueError("A positive natural-flow oil-rate threshold is required")
    out=df.copy()
    natural=out.get("lift_active",pd.Series(False,index=out.index)).fillna(False).astype(bool).eq(False)
    below=out["oil_rate"].le(threshold) & natural
    out["inadequate_now"]=False
    for _, idx in out.groupby("well_id").groups.items():
        ids=list(idx)
        vals=below.loc[ids].to_numpy()
        for k in range(len(vals)-min_consecutive+1):
            if vals[k:k+min_consecutive].all():
                out.loc[ids[k],"inadequate_now"]=True
                break
    return out

def add_forward_targets(df, horizons=(3,6,12)):
    """Adding future rate and pressure labels without crossing well boundaries."""
    out=df.copy()
    for h in horizons:
        out[f"oil_rate_future_{h}m"]=out.groupby("well_id")["oil_rate"].shift(-h)
        if "reservoir_pressure" in out:
            out[f"reservoir_pressure_future_{h}m"]=out.groupby("well_id")["reservoir_pressure"].shift(-h)
    return out
