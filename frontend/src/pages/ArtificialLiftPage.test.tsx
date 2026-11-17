import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceProvider } from "../app/workspaceContext";
import { screenArtificialLift } from "../services/api";
import { ArtificialLiftPage } from "./ArtificialLiftPage";

vi.mock("../services/api", () => ({
  screenArtificialLift: vi.fn(),
  getApiErrorMessage: (error: unknown) => error instanceof Error ? error.message : "API error",
}));

const response = {
  screen_version: "0.1.0",
  method_input_status: "preliminary_comparison_possible" as const,
  screening_status: "need_not_established" as const,
  need_assessment: "Need for artificial lift is not established. A declining rate alone is not proof.",
  lift_need_state: "not_established" as const,
  lift_need_evidence: null,
  interpretation: "Candidates are provisional and not final recommendations.",
  ranking_method: "Rule matches and cautions; not a probability.",
  input_context: { well_type: "gas", electric_power: "unknown" },
  numeric_context: { well_id: "W-1" },
  candidates: [{
    method: "Gas lift",
    status: "conditional" as const,
    priority_rank: 1,
    tied_rank: false,
    basis: "No hard blocker is stated, but an essential resource remains unknown.",
    supporting_evidence: ["Injection gas available."],
    counter_evidence: [],
    hard_blocks: [],
    missing_inputs: ["Confirm the compressor."],
    next_checks: ["Run nodal analysis."],
  }],
  global_missing_information: ["Validated IPR/VLP or nodal operating point."],
  sources: ["SPE reference — https://example.com/spe"],
};

describe("ArtificialLiftPage", () => {
  beforeEach(() => {
    vi.mocked(screenArtificialLift).mockReset();
    vi.mocked(screenArtificialLift).mockResolvedValue(response);
  });

  it("submits explicit inputs to the API and displays the returned conditional candidate", async () => {
    render(
      <WorkspaceProvider>
        <MemoryRouter>
          <ArtificialLiftPage />
        </MemoryRouter>
      </WorkspaceProvider>,
    );

    fireEvent.change(screen.getByLabelText("Well type"), { target: { value: "gas" } });
    fireEvent.change(screen.getByLabelText("Injection-gas supply and compression"), { target: { value: "available" } });
    fireEvent.change(screen.getByLabelText(/gas-well liquid-loading concern/i), { target: { value: "yes" } });
    fireEvent.click(screen.getByRole("button", { name: "Screen lift options" }));

    await waitFor(() => expect(screenArtificialLift).toHaveBeenCalledWith(expect.objectContaining({
      well_type: "gas",
      injection_gas_system: "available",
      liquid_loading_concern: "yes",
      lift_need_state: "not_established",
    })));
    expect(await screen.findByRole("heading", { name: "Gas lift" })).toBeInTheDocument();
    expect(screen.getByText(/not final recommendations/i)).toBeInTheDocument();
    expect(screen.getByText("Confirm the compressor.")).toBeInTheDocument();
  });
});
