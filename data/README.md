# Data directory

`raw/` is reserved for source files obtained with permission. Keep raw data immutable and record source, license, access date, units, and well identifiers in `docs/data_provenance.csv`.

`synthetic/demo_well_monthly.csv` is generated synthetic data for testing notebook execution only. It must not be described as field evidence and must not be used to claim model accuracy or field readiness. It contains 36 artificial well histories with monthly oil, gas, water, pressure, GOR, water-cut, geography labels, reservoir-type labels, choke settings, cumulative production and lift status.

`processed/` is reserved for derived, documented data. Do not commit confidential, licensed-restricted, personally identifying, or otherwise unauthorized data to a public repository.
