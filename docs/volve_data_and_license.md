# Volve field data: source, license, and suitability

## Included files

- `data/raw/volve/Volve production data.xlsx` is the unmodified source workbook from the public `f0nzie/volve_eclipse_reservoir` mirror of Equinor’s released Volve files.
- `data/processed/volve_daily_producers.csv` is an adapted table from the workbook’s `Daily Production Data` sheet, retaining only `WELL_TYPE == OP` producer rows and renaming key columns to the project schema. It contains 9,143 rows from six producing wellbores, dated 2008-02-12 through 2016-09-17.
- The workbook also contains a `Monthly Production Data` sheet. The processed panel is not a second independent data source; it is a derived copy of the daily sheet.

## Attribution and license

The Volve data are made available by Equinor and former Volve license partners. Their [terms for use of the Volve data](https://www.equinor.com/content/dam/statoil/documents/what-we-do/Equinor-HRS-Terms-and-conditions-for-licence-to-data-Volve.pdf) permit use and sharing, subject to attribution, inclusion of a link to the terms, and the condition that the data may not be sold. The terms are based on CC BY 4.0 with an additional no-sale condition. This repository attributes Equinor and the former license partners and links the terms. Source mirror: [f0nzie/volve_eclipse_reservoir](https://github.com/f0nzie/volve_eclipse_reservoir), file `inst/rawdata/Volve production data.xlsx`.

**Attribution notice:** Volve field data provided by Equinor and former license partners, shared under the [Equinor terms and conditions for use of Volve data](https://www.equinor.com/content/dam/statoil/documents/what-we-do/Equinor-HRS-Terms-and-conditions-for-licence-to-data-Volve.pdf). Source workbook mirror: [f0nzie/volve_eclipse_reservoir](https://github.com/f0nzie/volve_eclipse_reservoir).

## Verified contents and caveats

The daily worksheet has six producing wellbores and one injector wellbore. The processed data excludes the injector. It includes date, oil/gas/water production volumes, on-stream hours, downhole and surface measurements, choke data, and identifiers. Source columns are preserved in the original workbook. The pressure field `AVG_DOWNHOLE_PRESSURE` is retained as `bhp`; it is not relabeled as static reservoir pressure. Source units must be confirmed against the Equinor field dictionary before cross-source unit conversion.

The Norwegian Offshore Directorate describes Volve as produced with water injection for pressure support. The workbook does not identify whether each producer was naturally flowing or artificially lifted at each time. It does not provide a verified transition date, solution-gas-drive classification, bubble-point/PVT properties, or a project-defined natural-flow inadequacy label. Therefore:

- the Volve data can support real-field oil/gas/water and measured downhole-pressure forecasting experiments;
- they cannot directly train or validate the natural-flow-inadequacy classifier/time-to-transition target;
- performance on six wells is a small single-field case study, not evidence of generalization to unrelated fields or solution-gas-drive reservoirs;
- pressure support by water injection makes Volve a different development context from the project’s stated solution-gas-drive focus.

Field regression outputs in the notebook are real-data holdout results, not a natural-flow-transition accuracy claim. The held-out wells are separated from training or the later time window as labeled in each evaluation.
