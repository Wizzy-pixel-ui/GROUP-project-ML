from __future__ import annotations

from dataclasses import dataclass

from sgd_api.lift_schemas import LiftCandidateResult, LiftScreeningRequest, LiftScreeningResponse

SCREEN_VERSION = "0.1.0"

GLOBAL_MISSING = [
    "Validated IPR/VLP or nodal operating point using a suitable well model and pressure/rate test.",
    "Current PVT and fluid properties (including viscosity, gas behavior, temperature, and chemical compatibility) with source, date, and units.",
    "Completion and well geometry: measured depth, true vertical depth, deviation survey, tubing/casing sizes, restrictions, and intervention access.",
    "Surface/facility capacity: wellhead and flowline pressure, gas separation/handling, water handling, and available operating envelope.",
    "Method-specific equipment/vendor operating envelope and a detailed design for the actual well.",
    "Failure/workover history, service capability, reliability requirements, and lifecycle capital/operating economics.",
    "Qualified production-engineering review before any equipment or operating decision.",
]

METHOD_CHECKS: dict[str, list[str]] = {
    "Gas lift": [
        "Confirm injection-gas composition, supply pressure/rate, compression, distribution, and operating cost.",
        "Check mandrel/valve design, injection depth, gas separation, produced-gas handling, and facility backpressure.",
    ],
    "Electric submersible pump (ESP)": [
        "Use IPR/VLP and an ESP design to check required head, pump operating range, intake pressure, and expected run life.",
        "Check free-gas handling, motor/cable/power quality, cooling, solids/scale/corrosion, temperature, and intervention consequences.",
    ],
    "Sucker-rod pump (SRP / beam lift)": [
        "Check rod loads, stroke and pump capacity, setting depth, deviation/dogleg, and rod/tubing wear.",
        "Check gas interference, solids, surface footprint/setbacks, service access, and maintenance capability.",
    ],
    "Progressing-cavity pump (PCP)": [
        "Confirm elastomer or metal-to-metal compatibility with temperature, aromatics, chemicals, and produced-fluid composition.",
        "Check torque/drive limits, gas handling, solids abrasion, depth/temperature envelope, and local service/spares.",
    ],
    "Hydraulic pump / jet lift": [
        "Select a specific hydraulic design and check power-fluid supply/pressure, circulation, separation, and efficiency at target duty.",
        "Check high-pressure equipment, fluid compatibility/contamination, solids erosion, intervention method, and lifecycle operating cost.",
    ],
    "Plunger lift": [
        "Confirm gas-well deliverability and pressure, liquid-loading volume, tubing/casing geometry, and stable cycle behavior.",
        "Check surface gas handling, safety controls, and operating/cycling constraints; this is not a generic oil-well pump.",
    ],
}


@dataclass
class CandidateWork:
    method: str
    resources: list[tuple[str, str, str]]
    support: list[str]
    cautions: list[str]
    blocks: list[str]
    missing: list[str]


def _resource(request: LiftScreeningRequest, attribute: str, label: str, work: CandidateWork) -> None:
    value = getattr(request, attribute)
    work.resources.append((attribute, value, label))
    if value == "unavailable":
        work.blocks.append(f"{label} was explicitly marked unavailable.")
    elif value == "unknown":
        work.missing.append(f"Confirm whether {label.lower()} is available for this well.")
    else:
        work.support.append(f"{label} was explicitly marked available.")


def _build_candidates(request: LiftScreeningRequest) -> list[CandidateWork]:
    candidates: list[CandidateWork] = []

    gas = CandidateWork("Gas lift", [], [], [], [], [])
    _resource(request, "injection_gas_system", "Injection-gas supply and compression", gas)
    _resource(request, "gas_handling_capacity", "Produced-gas handling capacity", gas)
    if request.rate_duty in {"moderate", "high"}:
        gas.support.append(f"The stated {request.rate_duty} production duty can be screened against a gas-lift design; actual rate capacity is not calculated here.")
    if request.trajectory in {"deviated", "highly_deviated"}:
        gas.support.append("The stated deviated trajectory is a factor to compare in the well-specific gas-lift design.")
    if request.free_gas_fraction == "high":
        gas.cautions.append("High free-gas/produced-gas handling must be checked against injection design, separation, and facility capacity.")
    candidates.append(gas)

    esp = CandidateWork("Electric submersible pump (ESP)", [], [], [], [], [])
    _resource(request, "electric_power", "Reliable electrical power at the required voltage and quality", esp)
    if request.rate_duty in {"moderate", "high"}:
        esp.support.append(f"The stated {request.rate_duty} production duty can be compared with an ESP pump curve; no capacity match is calculated here.")
    if request.free_gas_fraction in {"moderate", "high"}:
        esp.cautions.append("Free gas at pump intake may require an application-specific separator/gas-handling design; no generic threshold is assumed.")
    if request.solids_loading == "high":
        esp.cautions.append("High solids may increase abrasion, plugging, or run-life risk; check the selected equipment and mitigation design.")
    if request.fluid_viscosity == "high":
        esp.cautions.append("High viscosity can affect pump performance and power demand; verify with actual fluid data and vendor curves.")
    candidates.append(esp)

    srp = CandidateWork("Sucker-rod pump (SRP / beam lift)", [], [], [], [], [])
    _resource(request, "rod_pump_access", "Rod-pump completion and intervention access", srp)
    if request.rate_duty in {"low", "moderate"}:
        srp.support.append(f"The stated {request.rate_duty} production duty can be compared with an SRP design; rod loads and pump capacity are not calculated here.")
    if request.setting == "onshore":
        srp.support.append("The stated onshore setting can be assessed for surface-unit footprint and rod-service access.")
    if request.trajectory == "highly_deviated":
        srp.cautions.append("Highly deviated geometry can raise rod/tubing wear and load concerns; require a survey-based design check.")
    if request.free_gas_fraction == "high":
        srp.cautions.append("High free gas may cause gas interference or incomplete pump fill; verify intake conditions and design.")
    if request.solids_loading == "high":
        srp.cautions.append("High solids may increase wear or pump-maintenance risk; verify with the selected pump and service plan.")
    candidates.append(srp)

    pcp = CandidateWork("Progressing-cavity pump (PCP)", [], [], [], [], [])
    _resource(request, "pcp_surface_drive", "PCP-compatible surface drive and service capability", pcp)
    if request.fluid_viscosity == "high":
        pcp.support.append("The stated high-viscosity fluid is a reason to include PCP in the comparison, subject to material compatibility and design.")
    if request.solids_loading in {"moderate", "high"}:
        pcp.support.append(f"The stated {request.solids_loading} solids loading is a reason to compare a PCP design, while checking abrasion and run life.")
    if request.trajectory in {"deviated", "highly_deviated"}:
        pcp.support.append("The stated deviated geometry is relevant to comparing a PCP configuration and drive method.")
    if request.free_gas_fraction in {"moderate", "high"}:
        pcp.cautions.append("Free-gas handling and gas interference must be checked for the selected PCP arrangement; no universal cutoff is applied.")
    candidates.append(pcp)

    hydraulic = CandidateWork("Hydraulic pump / jet lift", [], [], [], [], [])
    _resource(request, "hydraulic_power_fluid", "Power-fluid supply, high-pressure circuit, and circulation facilities", hydraulic)
    if request.trajectory in {"deviated", "highly_deviated"}:
        hydraulic.support.append("The stated deviated geometry is a factor for comparing a specific hydraulic-lift installation.")
    if request.setting in {"offshore", "subsea"}:
        hydraulic.support.append("The stated offshore/subsea setting may make surface footprint and intervention approach relevant; facility compatibility is not established.")
    if request.rate_duty in {"moderate", "high"}:
        hydraulic.support.append(f"The stated {request.rate_duty} duty can be evaluated against a specific hydraulic design and power-fluid circuit.")
    candidates.append(hydraulic)

    plunger = CandidateWork("Plunger lift", [], [], [], [], [])
    if request.well_type == "oil":
        plunger.blocks.append("The well was identified as an oil well; plunger lift is screened here only for gas wells with liquid-loading concerns.")
    elif request.well_type == "unknown":
        plunger.missing.append("Confirm whether this is a gas well; plunger lift is not treated as a generic oil-well pump.")
    else:
        if request.liquid_loading_concern == "no":
            plunger.blocks.append("Liquid-loading concern was explicitly marked absent for this gas well.")
        elif request.liquid_loading_concern == "unknown":
            plunger.missing.append("Confirm a gas-well liquid-loading concern before screening plunger lift as applicable.")
        else:
            plunger.support.append("The well was identified as a gas well with a user-stated liquid-loading concern.")
        _resource(request, "gas_handling_capacity", "Produced-gas handling capacity", plunger)
        if request.trajectory == "highly_deviated":
            plunger.cautions.append("Highly deviated geometry may affect plunger travel and cycle stability; verify with the completion survey.")
    candidates.append(plunger)

    return candidates


def _status(work: CandidateWork) -> tuple[str, str]:
    if work.blocks:
        return "screened_out", "A stated hard gate or method-applicability condition blocks this candidate in the supplied case."
    if work.method == "Plunger lift" and not work.support:
        return "unknown", "Applicability is not established from the supplied gas-well and liquid-loading inputs."
    required_unknown = any(value == "unknown" for _, value, _ in work.resources)
    if required_unknown:
        if not work.support:
            return "unknown", "No method-specific support is established and an essential resource remains unknown."
        return "conditional", "No hard block is stated, but an essential resource remains unknown."
    if work.cautions:
        return "conditional", "No required resource is marked unavailable; the listed application risks require well-specific checks."
    if not work.support:
        return "unknown", "Inputs do not establish a method-specific fit; additional well and duty information is needed."
    return "screening_candidate", "No stated resource gate is blocked and at least one input supports comparison; this is not a design-feasibility finding."


def screen_artificial_lift(request: LiftScreeningRequest) -> LiftScreeningResponse:
    """Return a qualitative engineering screen, not an ML recommendation or equipment design."""
    work_items = _build_candidates(request)
    evaluated = []
    for work in work_items:
        status, basis = _status(work)
        method_missing = list(dict.fromkeys(work.missing))
        if not work.blocks and not work.support and not method_missing:
            method_missing.append("Add documented well/application inputs to establish whether this method is applicable.")
        evaluated.append((work, status, basis, method_missing))

    status_order = {"screening_candidate": 0, "conditional": 1, "unknown": 2, "screened_out": 3}
    ordered = sorted(
        evaluated,
        key=lambda row: (
            status_order[row[1]],
            -(len(row[0].support) - len(row[0].cautions)),
            -len(row[0].support),
            row[0].method,
        ),
    )
    evidence_present = any(work.support and not work.blocks for work, _status, _basis, _missing in ordered)
    rankable = [
        (work, status)
        for work, status, _basis, _missing in ordered
        if work.support and not work.blocks and status in {"screening_candidate", "conditional"}
    ]
    ranks: dict[str, tuple[int, bool]] = {}
    previous_key = None
    current_rank = 0
    for position, (work, status) in enumerate(rankable, start=1):
        key = (status, len(work.support) - len(work.cautions), len(work.support))
        if key != previous_key:
            current_rank = position
            previous_key = key
        tied = sum(
            1
            for other, other_status in rankable
            if (other_status, len(other.support) - len(other.cautions), len(other.support)) == key
        ) > 1
        ranks[work.method] = (current_rank, tied)

    candidates: list[LiftCandidateResult] = []
    for work, status, basis, method_missing in ordered:
        # A rank is only a deterministic ordering of observed positive evidence; blocked or unsupported methods are not ranked.
        rank, tied = ranks.get(work.method, (None, False))
        candidates.append(
            LiftCandidateResult(
                method=work.method,
                status=status,
                priority_rank=rank,
                tied_rank=tied,
                basis=basis,
                supporting_evidence=work.support,
                counter_evidence=work.cautions,
                hard_blocks=work.blocks,
                missing_inputs=method_missing,
                next_checks=METHOD_CHECKS[work.method],
            )
        )

    if request.lift_need_state == "engineering_confirmed_by_user":
        screening_status = "need_user_marked_confirmed_unverified"
        need_assessment = "The user marked lift need as engineering-confirmed. The API has not independently verified that conclusion and does not solve IPR/VLP or nodal analysis."
    elif request.lift_need_state == "suspected_by_user":
        screening_status = "need_user_marked_suspected"
        need_assessment = "The user marked lift need as suspected. This screen does not establish that natural flow is inadequate."
    else:
        screening_status = "need_not_established"
        need_assessment = "Need for artificial lift is not established. A declining rate or Arps threshold crossing alone is not proof that natural flow is inadequate."

    non_excluded = [candidate for candidate in candidates if candidate.status != "screened_out"]
    if not non_excluded:
        interpretation = "No candidate remains in this qualitative screen based on the stated inputs. Review the explicit blockers and confirm the data; this does not prove that no lift method can work after redesign or added facilities."
    elif not evidence_present:
        interpretation = "Method-specific inputs are too limited to order the options. Unknown resources remain unknown; provide documented well, duty, and facility information before comparing candidates. No priority rank is assigned."
    else:
        interpretation = "The ordering is a provisional evidence order: candidates with no stated resource gate blocked are listed before conditional or unknown options, then ordered by observed rule matches minus cautions. It is not a probability, validated ranking, final recommendation, or equipment design. Tied candidates have no defensible ordering from the supplied evidence."

    numeric_context = {
        "well_id": request.well_id,
        "current_oil_rate": request.current_oil_rate,
        "current_liquid_rate": request.current_liquid_rate,
        "target_liquid_rate": request.target_liquid_rate,
        "current_gas_rate": request.current_gas_rate,
        "liquid_rate_unit": request.liquid_rate_unit,
        "gas_rate_unit": request.gas_rate_unit,
        "reservoir_pressure": request.reservoir_pressure,
        "flowing_bhp": request.flowing_bhp,
        "bubble_point_pressure": request.bubble_point_pressure,
        "pressure_unit": request.pressure_unit,
        "pressure_measurement_date": request.pressure_measurement_date,
    }

    return LiftScreeningResponse(
        screen_version=SCREEN_VERSION,
        method_input_status="preliminary_comparison_possible" if evidence_present else "insufficient_for_preliminary_comparison",
        screening_status=screening_status,
        need_assessment=need_assessment,
        lift_need_state=request.lift_need_state,
        lift_need_evidence=request.lift_need_evidence,
        interpretation=interpretation,
        ranking_method="Explicit method-specific hard gates, qualitative rule matches and caution counts. No trained AI model, learned weights, physical IPR/VLP calculation, probability, or accuracy score is used.",
        input_context=request.model_dump(),
        numeric_context=numeric_context,
        candidates=candidates,
        global_missing_information=GLOBAL_MISSING,
        sources=[
            "SPE/JPT, Brownfield IOR: Selecting the Appropriate Artificial Lift Method — https://jpt.spe.org/twa/brownfield-ior-selecting-the-appropriate-artificial-lift-method",
            "IPIECA, Artificial lift (2023) — https://www.ipieca.org/resources/energy-efficiency-compendium/artificial-lift-2023",
        ],
    )
