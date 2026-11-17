import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "./App";
import { WorkspaceProvider } from "./workspaceContext";

vi.mock("../hooks/useApiStatus", () => ({
  useApiStatus: () => ({
    connection: "offline",
    health: null,
    capabilities: null,
    error: "API not running in this test.",
    refresh: vi.fn(),
  }),
}));

function renderRoute(path = "/") {
  return render(
    <WorkspaceProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </WorkspaceProvider>,
  );
}

describe("application shell", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("shows an honest no-analysis state on the overview", async () => {
    renderRoute();
    expect(await screen.findByRole("heading", { name: "Well analytics workspace" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "No analysis loaded", level: 3 })).toBeInTheDocument();
    expect(screen.getByText(/does not confirm reservoir drive mechanism/i)).toBeInTheDocument();
  });

  it("opens the upload workflow and states the API's actual required schema", async () => {
    renderRoute("/datasets");
    expect(await screen.findByRole("heading", { name: "Dataset manager" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose file/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /load volve sample/i })).toBeInTheDocument();
    expect(screen.getByText(/well identifier, observation date and oil rate/i)).toBeInTheDocument();
  });

  it("provides live-workflow pages with useful empty states until data is analyzed", async () => {
    renderRoute("/production");
    expect(await screen.findByRole("heading", { name: "No analyzed history yet" })).toBeInTheDocument();
    renderRoute("/wells");
    expect(await screen.findByRole("heading", { name: "No well analysis available" })).toBeInTheDocument();
    renderRoute("/models");
    expect(await screen.findByRole("heading", { name: "Machine-learning workspace" })).toBeInTheDocument();
    renderRoute("/reservoir");
    expect(await screen.findByRole("heading", { name: "No analyzed pressure data" })).toBeInTheDocument();
    renderRoute("/natural-flow");
    expect(await screen.findByRole("heading", { name: "No natural-flow check available" })).toBeInTheDocument();
  });

  it("opens the preliminary artificial-lift screen and keeps the final-design boundary visible", async () => {
    renderRoute();
    fireEvent.click(screen.getByRole("link", { name: "Lift screening" }));
    expect(await screen.findByRole("heading", { name: "Artificial-lift screening" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Screen lift options" })).toBeInTheDocument();
    expect(screen.getByText(/cannot independently confirm the need for lift/i)).toBeInTheDocument();
    expect(screen.getByText(/deterministic rule matches, not AI-generated advice/i)).toBeInTheDocument();
  });

  it("provides a usable session API URL setting without an auth secret field", () => {
    renderRoute("/settings");
    expect(screen.getByRole("heading", { name: "Settings", level: 2 })).toBeInTheDocument();
    expect(screen.getByLabelText("API origin")).toHaveValue("http://127.0.0.1:8000");
    expect(screen.queryByLabelText(/token|secret|password/i)).not.toBeInTheDocument();
  });
});
