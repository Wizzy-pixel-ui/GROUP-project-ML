# Data directory

`raw/` contains source files with redistribution rights, with source, license, access date, units, and well IDs recorded in `docs/data_provenance.csv`. The Volve source workbook is retained as received under the Equinor Volve terms; see `docs/volve_data_and_license.md`.

`processed/volve_daily_producers.csv` is a reproducible canonicalized copy of the Volve daily producer rows. It keeps source units and does not fill missing observations. Zero-coded pressure/sensor values are treated as missing by the Volve loader; actual zero production remains meaningful.

`synthetic/demo_well_monthly.csv` is generated artificial data for pipeline testing only. It is not a reservoir simulator or field evidence and must not be used to claim model accuracy, solution-gas-drive behavior, or field readiness. It contains 36 toy well histories generated from simplified formulas.

The Volve dataset is real field data, but its production workbook does not document natural-flow or artificial-lift status. Volve used field-level water-injection pressure support; it is not a verified solution-gas-drive natural-flow transition dataset.

`processed/` holds derived, documented data. Do not commit confidential or unlicensed data to a public repository.
