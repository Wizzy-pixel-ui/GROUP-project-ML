import { beforeEach, describe, expect, it } from "vitest";
import { getApiBaseUrl, saveApiBaseUrl } from "./api";

describe("API origin settings", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("stores only a valid HTTP origin for the current browser session", () => {
    saveApiBaseUrl("http://localhost:8010/");
    expect(getApiBaseUrl()).toBe("http://localhost:8010");
    expect(window.sessionStorage.getItem("sgd.apiBaseUrl")).toBe("http://localhost:8010");
  });

  it("rejects credentials embedded in an API URL", () => {
    expect(() => saveApiBaseUrl("https://user:password@example.test")).toThrow(/do not include a username or password/i);
    expect(window.sessionStorage.getItem("sgd.apiBaseUrl")).toBeNull();
  });

  it("rejects paths because this setting accepts an API origin, not an endpoint URL", () => {
    expect(() => saveApiBaseUrl("http://localhost:8000/v1")).toThrow(/without a path/i);
  });
});
