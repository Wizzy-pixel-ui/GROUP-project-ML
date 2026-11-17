from __future__ import annotations

from fastapi.testclient import TestClient

from sgd_api.main import app
from sgd_api.lift_schemas import LiftScreeningRequest
from sgd_api.lift_screening import screen_artificial_lift

client = TestClient(app)


def test_unknown_inputs_remain_unknown_and_need_for_lift_is_not_established():
    result = screen_artificial_lift(LiftScreeningRequest())

    assert result.screening_status == "need_not_established"
    assert result.method_input_status == "insufficient_for_preliminary_comparison"
    assert "not established" in result.need_assessment.lower()
    assert "no priority rank" in result.interpretation.lower()
    assert all(candidate.status in {"unknown", "conditional", "screened_out"} for candidate in result.candidates)
    assert all(not candidate.supporting_evidence for candidate in result.candidates if candidate.method != "Plunger lift")
    assert all(candidate.priority_rank is None for candidate in result.candidates)


def test_resource_gates_screen_out_only_explicitly_unavailable_methods():
    result = screen_artificial_lift(
        LiftScreeningRequest(
            well_type="oil",
            electric_power="available",
            injection_gas_system="unavailable",
            gas_handling_capacity="available",
            rod_pump_access="unavailable",
            pcp_surface_drive="available",
            hydraulic_power_fluid="unavailable",
            rate_duty="moderate",
            fluid_viscosity="high",
            solids_loading="moderate",
            trajectory="deviated",
        )
    )
    by_method = {candidate.method: candidate for candidate in result.candidates}

    assert by_method["Gas lift"].status == "screened_out"
    assert by_method["Sucker-rod pump (SRP / beam lift)"].status == "screened_out"
    assert by_method["Hydraulic pump / jet lift"].status == "screened_out"
    assert by_method["Electric submersible pump (ESP)"].status == "conditional"
    assert any("viscosity" in item.lower() for item in by_method["Electric submersible pump (ESP)"].counter_evidence)
    assert by_method["Progressing-cavity pump (PCP)"].supporting_evidence
    assert by_method["Plunger lift"].status == "screened_out"
    assert by_method["Gas lift"].priority_rank is None
    assert by_method["Sucker-rod pump (SRP / beam lift)"].priority_rank is None
    assert by_method["Hydraulic pump / jet lift"].priority_rank is None
    assert by_method["Electric submersible pump (ESP)"].priority_rank is not None
    assert by_method["Progressing-cavity pump (PCP)"].priority_rank is not None


def test_plunger_lift_requires_gas_well_and_loading_evidence():
    result = screen_artificial_lift(
        LiftScreeningRequest(
            well_type="gas",
            liquid_loading_concern="yes",
            gas_handling_capacity="available",
        )
    )
    plunger = next(candidate for candidate in result.candidates if candidate.method == "Plunger lift")

    assert plunger.status == "screening_candidate"
    assert any("gas well" in item.lower() for item in plunger.supporting_evidence)
    assert any("gas-well deliverability" in item.lower() for item in plunger.next_checks)


def test_lift_need_marked_by_user_is_not_claimed_as_api_verified():
    result = screen_artificial_lift(
        LiftScreeningRequest(lift_need_state="engineering_confirmed_by_user", lift_need_evidence="Reviewed pressure test and nodal study")
    )
    assert result.screening_status == "need_user_marked_confirmed_unverified"
    assert "not independently verified" in result.need_assessment


def test_numeric_context_requires_units_and_does_not_convert_values():
    invalid = client.post("/v1/lift-screening", json={"current_oil_rate": 100.0})
    assert invalid.status_code == 422

    response = client.post(
        "/v1/lift-screening",
        json={"current_oil_rate": 100.0, "liquid_rate_unit": "STB/day", "flowing_bhp": 1200, "pressure_unit": "psi"},
    )
    assert response.status_code == 200, response.text
    context = response.json()["numeric_context"]
    assert context["current_oil_rate"] == 100.0
    assert context["liquid_rate_unit"] == "STB/day"
    assert context["flowing_bhp"] == 1200.0
    assert response.json()["input_context"]["pressure_unit"] == "psi"


def test_capabilities_advertise_preliminary_screen_not_final_recommendation():
    capabilities = client.get("/v1/capabilities").json()
    assert capabilities["artificial_lift_screening_available"] is True
    assert capabilities["artificial_lift_recommendation_available"] is False


def test_screen_endpoint_returns_no_ai_score_or_final_recommendation_claim():
    response = client.post(
        "/v1/lift-screening",
        json={"well_type": "oil", "electric_power": "available", "rate_duty": "high", "free_gas_fraction": "high"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["screen_version"] == "0.1.0"
    assert "probability" in body["ranking_method"].lower()
    assert len(body["candidates"]) == 6
    assert all("score" not in candidate for candidate in body["candidates"])
    assert any(candidate["method"] == "Electric submersible pump (ESP)" for candidate in body["candidates"])
