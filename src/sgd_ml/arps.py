from dataclasses import dataclass
import numpy as np
from scipy.optimize import least_squares


_ARPS_TYPES = ("exponential", "harmonic", "hyperbolic")


def _arps_rate(time_months, qi, di, b, decline_type):
    """Evaluating the Arps nominal decline-rate equation over elapsed months."""
    time_months = np.asarray(time_months, dtype=float)
    if decline_type == "exponential":
        return qi * np.exp(-di * time_months)
    if decline_type == "harmonic":
        return qi / (1.0 + di * time_months)
    if decline_type == "hyperbolic":
        return qi / np.power(1.0 + b * di * time_months, 1.0 / b)
    raise ValueError(f"Unsupported Arps decline type: {decline_type}")


@dataclass(frozen=True)
class ArpsFit:
    """Recording fitted Arps parameters and model-selection diagnostics."""
    qi: float
    di: float
    b: float
    decline_type: str
    aicc: float
    observations_used: int
    time_origin_months: float

    def predict(self, time_months):
        """Predicting positive producing rates from elapsed time in months."""
        aligned_time = np.maximum(np.asarray(time_months, dtype=float) - self.time_origin_months, 0.0)
        return _arps_rate(aligned_time, self.qi, self.di, self.b, self.decline_type)


def _fit_candidate(time_months, rates, decline_type):
    """Fitting one Arps family using robust least squares in log-rate space."""
    t = np.asarray(time_months, dtype=float)
    q = np.asarray(rates, dtype=float)
    valid = np.isfinite(t) & np.isfinite(q) & (q > 0)
    t, q = t[valid], q[valid]
    if t.size < 6:
        raise ValueError("At least six positive-rate observations are required to fit an Arps curve")
    order = np.argsort(t)
    t, q = t[order], q[order]
    time_origin_months = float(t[0])
    t = t - t[0]
    q_low = max(float(np.min(q)) / 100.0, 1e-8)
    q_high = max(float(np.max(q)) * 100.0, q_low * 10.0)
    init_qi = float(np.max(q))
    init_di = 0.02

    def log_prediction(parameters):
        if decline_type == "hyperbolic":
            qi, di, b = np.exp(parameters[0]), np.exp(parameters[1]), parameters[2]
        else:
            qi, di = np.exp(parameters[0]), np.exp(parameters[1])
            b = 0.0 if decline_type == "exponential" else 1.0
        return np.log(np.maximum(_arps_rate(t, qi, di, b, decline_type), 1e-12))

    if decline_type == "hyperbolic":
        initial = [np.log(init_qi), np.log(init_di), 0.5]
        lower = [np.log(q_low), np.log(1e-6), 1e-3]
        upper = [np.log(q_high), np.log(5.0), 1.0]
        parameter_count = 3
    elif decline_type in _ARPS_TYPES:
        initial = [np.log(init_qi), np.log(init_di)]
        lower = [np.log(q_low), np.log(1e-6)]
        upper = [np.log(q_high), np.log(5.0)]
        parameter_count = 2
    else:
        raise ValueError(f"Unsupported Arps decline type: {decline_type}")

    result = least_squares(
        lambda parameters: log_prediction(parameters) - np.log(q),
        x0=initial,
        bounds=(lower, upper),
        loss="soft_l1",
        f_scale=0.1,
        max_nfev=5000,
    )
    qi = float(np.exp(result.x[0]))
    di = float(np.exp(result.x[1]))
    b = float(result.x[2]) if decline_type == "hyperbolic" else (0.0 if decline_type == "exponential" else 1.0)
    residual = log_prediction(result.x) - np.log(q)
    sse = max(float(np.sum(residual ** 2)), 1e-15)
    n = int(q.size)
    aic = n * np.log(sse / n) + 2 * parameter_count
    aicc = aic + (2 * parameter_count * (parameter_count + 1)) / max(n - parameter_count - 1, 1)
    return ArpsFit(qi=qi, di=di, b=b, decline_type=decline_type, aicc=float(aicc), observations_used=n, time_origin_months=time_origin_months)


def fit_arps(time_months, rates, decline_type="auto"):
    """Selecting exponential, harmonic, or bounded hyperbolic decline by training-only AICc."""
    if decline_type == "auto":
        candidates = [_fit_candidate(time_months, rates, kind) for kind in _ARPS_TYPES]
        return min(candidates, key=lambda model: model.aicc)
    if decline_type not in _ARPS_TYPES:
        raise ValueError(f"decline_type must be 'auto' or one of {_ARPS_TYPES}")
    return _fit_candidate(time_months, rates, decline_type)
