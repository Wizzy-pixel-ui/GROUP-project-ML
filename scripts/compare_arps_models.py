#!/usr/bin/env python3
"""Comparing Arps decline, recursive HGB, persistence, and optional Chronos forecasts."""
import argparse
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from sgd_ml.arps_comparison import run_arps_comparison


def main():
    """Running the same-horizon Volve comparison and writing readable output files."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=PROJECT_ROOT / "data/raw/volve/Volve production data.xlsx")
    parser.add_argument("--well", default="15/9-F-12", help="Producing well used for the temporal holdout")
    parser.add_argument("--train-fraction", type=float, default=0.8)
    parser.add_argument("--include-hugging-face", action="store_true", help="Loading Chronos-2 and Chronos-Bolt-Small weights from Hugging Face")
    parser.add_argument("--output-dir", type=Path, default=PROJECT_ROOT / "reports/arps_comparison")
    args = parser.parse_args()

    result = run_arps_comparison(
        workbook_path=args.workbook,
        forecast_well=args.well,
        train_fraction=args.train_fraction,
        include_huggingface=args.include_hugging_face,
        output_dir=args.output_dir,
    )
    fit = result["arps_fit"]
    print("Arps decline type:", fit.decline_type)
    print(f"Arps parameters: qi={fit.qi:.6g}, Di={fit.di:.6g} per month, b={fit.b:.6g}")
    print("Arps training observations:", fit.observations_used)
    print("Split metadata:", result["metadata"])
    print("\nSame-horizon holdout metrics:")
    print(result["metrics"].to_string(index=False))
    print("\nFiles written to:", args.output_dir)
    print("Natural-flow/lift status is unknown in the Volve source; this is not transition validation.")


if __name__ == "__main__":
    main()
