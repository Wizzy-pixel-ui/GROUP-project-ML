import axios from "axios";
import type { CapabilitiesResponse, HealthResponse } from "../types/api";

const API_BASE_KEY = "sgd.apiBaseUrl";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function normalizeApiOrigin(value: string): string {
  const parsed = new URL(value.trim());
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("Use an http or https API origin.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Do not include a username or password in the API URL.");
  }
  if (parsed.search || parsed.hash) {
    throw new Error("Do not include query parameters or fragments in the API URL.");
  }
  if (parsed.pathname !== "/") {
    throw new Error("Enter the API origin only, without a path.");
  }
  return parsed.origin;
}

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const sessionValue = window.sessionStorage.getItem(API_BASE_KEY);
    if (sessionValue) return normalizeApiOrigin(sessionValue);
  }
  const configured = import.meta.env.VITE_SGD_API_BASE_URL as string | undefined;
  return configured ? normalizeApiOrigin(configured) : DEFAULT_API_BASE_URL;
}

export function saveApiBaseUrl(value: string): void {
  const origin = normalizeApiOrigin(value);
  window.sessionStorage.setItem(API_BASE_KEY, origin);
  window.dispatchEvent(new Event("sgd-api-config-change"));
}

const client = axios.create({ timeout: 10_000 });

export async function getHealth(): Promise<HealthResponse> {
  const response = await client.get<HealthResponse>(`${getApiBaseUrl()}/health`);
  return response.data;
}

export async function getCapabilities(): Promise<CapabilitiesResponse> {
  const response = await client.get<CapabilitiesResponse>(`${getApiBaseUrl()}/v1/capabilities`);
  return response.data;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data && typeof error.response.data === "object") {
      const detail = (error.response.data as { detail?: unknown }).detail;
      if (typeof detail === "string") return detail;
    }
    if (error.code === "ECONNABORTED") return "The API request timed out.";
    return error.message || "The API could not be reached.";
  }
  return error instanceof Error ? error.message : "The API could not be reached.";
}
