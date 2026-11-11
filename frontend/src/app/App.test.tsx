import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "./App";

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
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("application shell", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("shows an honest no-dataset state on the overview", () => {
    renderRoute();
    expect(screen.getByRole("heading", { name: "Well analytics workspace" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No dataset loaded", level: 3 })).toBeInTheDocument();
    expect(screen.getByText(/does not confirm reservoir drive mechanism/i)).toBeInTheDocument();
  });

  it("opens the artificial-lift route and clearly labels its implementation status", () => {
    renderRoute();
    fireEvent.click(screen.getByRole("link", { name: "Artificial lift" }));
    expect(screen.getByRole("heading", { name: "Artificial-lift screening" })).toBeInTheDocument();
    expect(screen.getByText("Screening engine planned · not available yet")).toBeInTheDocument();
    expect(screen.getByText(/will not replace IPR\/VLP\/nodal analysis/i)).toBeInTheDocument();
  });

  it("provides a usable session API URL setting without an auth secret field", () => {
    renderRoute("/settings");
    expect(screen.getByRole("heading", { name: "Settings", level: 2 })).toBeInTheDocument();
    expect(screen.getByLabelText("API origin")).toHaveValue("http://127.0.0.1:8000");
    expect(screen.queryByLabelText(/token|secret|password/i)).not.toBeInTheDocument();
  });
});
