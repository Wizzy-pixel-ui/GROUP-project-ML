# Artificial-Lift Screening Methodology for the App

**Status:** Proposed engineering decision-support design. This is not a validated recommendation model and is not yet implemented in the API.

## What the app should recommend

There is no universally best artificial-lift system. The app should return a **ranked preliminary shortlist for the supplied well and operating case**, rather than a single unqualified “best” answer. A qualified production engineer must verify the shortlist with a well model, equipment/vendor design, facilities review, and economic assessment before implementation.

Lift selection is coupled to the well’s inflow and outflow: the inflow performance relationship (IPR) represents reservoir deliverability as a function of flowing bottomhole pressure, while the vertical lift performance (VLP) represents the pressure needed to move fluids through the wellbore. Their intersection is an operating point. Lift changes the pressure/energy balance; it does not create reservoir productivity. The IPR/VLP framework and the possibility that preferred lift changes as a reservoir depletes are described by SPE’s *The Way Ahead* article.[1]

## Candidate methods and screening trade-offs

These are broad screening tendencies, not hard operating limits. Actual limits depend on the specific design, completion, manufacturer, and operating environment. IPIECA explicitly warns that published operating ranges are typical, not universal technical boundaries, and must be interpreted with design-specific mitigations.[2]

| Method | Often worth screening when | Main constraints to test before ranking |
|---|---|---|
| **Gas lift** | Injection gas and compression/distribution are available; well is deviated or high-rate; avoiding a downhole rotating pump is valuable; operating rate may vary. | Confirm injection-gas supply/composition/pressure, compressor and flowline capacity, injection-valve/completion design, gas handling/separation and produced-gas constraints, and lifecycle power/compression cost. No usable injection system is a feasibility blocker, not a low score. |
| **Electric submersible pump (ESP)** | Sustained medium-to-high liquid throughput, downhole electrical power, and intervention/access arrangements fit. Compact surface footprint can matter. | Check pump operating range and required head, free-gas fraction and gas-handling design, solids/abrasion, scale/corrosion, temperature, viscosity, motor/cable limits, power quality, cooling, expected run life, and cost/consequence of pulling a failed unit. |
| **Sucker-rod pump (SRP/beam lift)** | Onshore or otherwise rod-accessible well with lower/moderate desired rates and available surface power or prime mover; local service capability is established. It can provide low flowing bottomhole pressure in suitable designs. | Check depth and rod loading, stroke/pump capacity, deviation/dogleg and rod/tubing wear, gas interference or pump-off, sand/solids, surface space/setbacks, cycle/maintenance needs, and environmental constraints. High deviation or unavailable rod-service access can be a blocker. |
| **Progressing-cavity pump (PCP)** | Viscous fluids or solids/sand make a positive-displacement option attractive; lower/moderate rates and directional geometry fit the selected design. | Verify elastomer compatibility with temperature, aromatics and produced chemicals, or the relevant metal-to-metal design envelope; check solids abrasion, gas fraction, torque/rod-string or cable limits, depth/temperature envelope, service method, and spare-parts capability. PCP variants do not share identical limits. |
| **Hydraulic pump / jet lift** | Deep or deviated wells and a power-fluid architecture may suit the asset; the operator can support the associated surface circuit and fluid handling. | Check power-fluid supply and high-pressure equipment, recirculation/separation capacity, efficiency at the target duty, fluid compatibility/contamination, solids and erosion, intervention method, surface footprint, and lifecycle operating cost. A specific hydraulic design must be evaluated rather than treated as one uniform technology. |
| **Plunger lift (optional gas-well branch)** | A gas well with liquid-loading concerns may have enough gas energy and deliverability for cyclic liquid unloading. | Check gas deliverability and pressure, liquid load, tubing/casing geometry, deviation, cycle stability, surface gas handling and safety. It is not a generic substitute for oil-well pumping. |

This comparison is qualitative. IPIECA’s method overview and operating-range table include sucker-rod, PCP, ESP, gas lift, hydraulic-pump and plunger systems, while noting that equipment-specific limits, mitigations and operating conditions vary.[2] SPE’s article gives examples of pump working mechanisms and frames the selection around the well’s IPR/VLP behavior rather than a production-rate trend alone.[1]

## Inputs the screening workflow needs

The input form should request values with units and provenance, and mark each as measured, interpreted, user-entered assumption, derived, or missing. It should not fill missing values with guessed defaults.

### Reservoir and fluid

- Current and forecast reservoir pressure, reservoir temperature, and pressure history with dates.
- Well productivity or test data sufficient to characterize inflow; flowing bottomhole pressure and any pressure survey quality/measurement date.
- Oil, gas and water rates; producing GOR/water cut; free-gas fraction at pump intake where known.
- PVT properties appropriate to the pressure/temperature range: bubble point, formation volume factors, viscosity, solution GOR, density/specific gravity, gas composition, emulsion/foaming tendencies and chemical compatibility.
- Solids/sand rate and grain/abrasion characteristics, scale/corrosion risks, and fluid chemistry where relevant.

### Well and completion

- True vertical depth and measured depth; trajectory/deviation, dogleg severity and survey; tubing/casing/completion dimensions and restrictions.
- Pump setting/landing depth and available completion/access, gas-lift mandrel/valve configuration if present, and prior workovers/failure history.
- Wellhead, flowline and separator pressures; backpressure, gathering-system constraints and allowable liquid/gas/water capacity.
- Current lift state, dated prior systems/changes and failure or workover records.

### Asset and economics

- Available electricity (voltage/quality/reliability), gas supply and injection pressure, compressors, power-fluid facilities, and water/produced-fluid handling.
- Onshore/offshore/subsea setting, footprint, environmental/safety constraints, access to rig/service unit/wireline/coiled tubing, local personnel and standard equipment.
- Target liquid/oil rate and drawdown, expected production profile over time, capital/operating/intervention costs, downtime consequences, reliability target, emissions/energy goals, and project evaluation period.
- Existing field standards and the operator’s configurable priorities/weights. These are asset choices, not universal model constants.

## Recommended decision logic

1. **Validate and contextualize inputs.** Check units, date, source, missingness, rate consistency and operating status. Reject incompatible units or unresolved identity/cadence issues rather than quietly converting or combining them. Do not infer the reservoir drive mechanism from a pressure/bubble-point comparison.
2. **Check whether natural flow is actually constrained.** Use pressure/rate tests and a validated inflow/outflow model when adequate inputs exist. A falling historical oil rate alone is not proof that artificial lift is required. If IPR/VLP inputs or pressure data are inadequate, return “insufficient information to determine need for lift.”
3. **Apply feasibility gates.** Exclude a method only for an explicitly documented hard incompatibility or unavailable essential resource. Keep unknown constraints as **unknown**, not “passed.” Explain mitigations (e.g., gas separators or material variants) as requiring a design check rather than assuming they solve the problem.
4. **Score only feasible/conditional candidates.** Use a transparent, configurable multi-criteria decision analysis. Criteria can include rate/duty fit, pressure/head capability, gas and solids tolerance, viscosity/temperature/chemistry compatibility, deviation/completion fit, power/gas availability, serviceability/reliability, facilities, lifecycle cost, and energy/emissions. Users/asset team set weights; show them. A high weighted score cannot override a failed hard gate.
5. **Run sensitivity analysis.** Show whether the rank changes when uncertain inputs or user weights vary. If the first-ranked method changes across plausible cases, report a tied/unstable shortlist rather than a false winner.
6. **Return traceable evidence.** For each method, return `eligible`, `conditional`, `screened_out`, or `unknown`; criterion-level reasons; data sources and units; assumptions; missing inputs; ranking method and weights; sensitivity; and the next checks needed. Phrase results as “screening candidate(s) for engineering evaluation,” not “install this lift system.”
7. **Refer to detailed design.** A final selection requires a nodal/well-system analysis, detailed equipment sizing, manufacturer/application limits, facility capacity, intervention/reliability review, economics and qualified engineering sign-off. The best system may change as pressure, rate, water cut, GOR, and facility constraints change over the well life.[2]

A learned preference/ranking model should be a later, separate option trained and evaluated on authorized, documented field choices and outcomes. Operator selection history by itself can encode local habit or facility availability; it is not ground-truth proof that the chosen system was technically optimal.

## Integration boundary with the current code

The present API accepts some production, pressure, PVT and lift-state values, but does not implement the physical calculations above. In particular, it has no IPR, VLP, nodal operating point, lift design, or selection endpoint. Before the dashboard displays results as an engineering screen, add a separate Python domain module and typed request/response schema, unit-aware validation, calculation provenance, known-answer tests, API tests, and methodology documentation. Do not implement the ranking in JavaScript or reuse the current Arps forecast as an input claiming to calculate feasibility.

The current Arps and HGB outputs may be shown as descriptive research forecasts with their existing caveats. They are not inputs sufficient to rank a lift system. The current Volve benchmark must remain identified as a general field-forecasting example, not as validated solution-gas-drive transition or lift-selection evidence.

## References

[1]: https://jpt.spe.org/twa/brownfield-ior-selecting-the-appropriate-artificial-lift-method "Brownfield IOR: Selecting the Appropriate Artificial Lift Method"
[2]: https://www.ipieca.org/resources/energy-efficiency-compendium/artificial-lift-2023 "Artificial lift, 2023"
