import axios from "axios";
import type { CapabilitiesResponse, HealthResponse } from "../types/api";
import type { AnalysisResponse, TrainingResponse, UploadPreview } from "../types/analysis";

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
    if (import.meta.env.PROD) return window.location.origin;
  }
  const configured = import.meta.env.VITE_SGD_API_BASE_URL as string | undefined;
  return configured ? normalizeApiOrigin(configured) : DEFAULT_API_BASE_URL;
}

export function saveApiBaseUrl(value: string): void {
  const origin = normalizeApiOrigin(value);
  window.sessionStorage.setItem(API_BASE_KEY, origin);
  window.dispatchEvent(new Event("sgd-api-config-change"));
}

const client = axios.create({ timeout: 120_000 });

export interface AnalysisSettings {
  units: Record<string, string>;
  thresholdRate: string;
  minConsecutivePeriods: number;
  forecastHorizonMonths: number;
}

export async function previewUpload(file: File, columnMap: Record<string, string> = {}): Promise<UploadPreview> {
  const form = new FormData();
  form.append("file", file);
  form.append("column_map", JSON.stringify(columnMap));
  const response = await client.post<UploadPreview>(`${getApiBaseUrl()}/v1/preview/upload`, form);
  return response.data;
}

export async function analyzeUpload(
  file: File,
  columnMap: Record<string, string>,
  settings: AnalysisSettings,
  modelId?: string,
): Promise<AnalysisResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("column_map", JSON.stringify(columnMap));
  form.append("units", JSON.stringify(settings.units));
  if (settings.thresholdRate) form.append("threshold_rate", settings.thresholdRate);
  form.append("min_consecutive_periods", String(settings.minConsecutivePeriods));
  form.append("forecast_horizon_months", String(settings.forecastHorizonMonths));
  if (modelId) form.append("model_id", modelId);
  const response = await client.post<AnalysisResponse>(`${getApiBaseUrl()}/v1/analyze/upload`, form);
  return response.data;
}

export async function trainModelUpload(
  file: File,
  columnMap: Record<string, string>,
  horizonSteps: number,
  excludeWellIds: string[],
): Promise<TrainingResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("column_map", JSON.stringify(columnMap));
  form.append("horizon_steps", String(horizonSteps));
  form.append("exclude_well_ids", JSON.stringify(excludeWellIds));
  const response = await client.post<TrainingResponse>(`${getApiBaseUrl()}/v1/models/train/upload`, form);
  return response.data;
}

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
