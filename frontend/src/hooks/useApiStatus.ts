import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, getCapabilities, getHealth } from "../services/api";
import type { ApiConnection, ApiStatusValue, CapabilitiesResponse, HealthResponse } from "../types/api";

export function useApiStatus(): ApiStatusValue {
  const [connection, setConnection] = useState<ApiConnection>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilitiesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setConnection("checking");
    setError(null);
    try {
      const healthResult = await getHealth();
      setHealth(healthResult);
      try {
        setCapabilities(await getCapabilities());
      } catch (capabilityError) {
        setCapabilities(null);
        setError(getApiErrorMessage(capabilityError));
      }
      setConnection("connected");
    } catch (healthError) {
      setHealth(null);
      setCapabilities(null);
      setError(getApiErrorMessage(healthError));
      setConnection("offline");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    window.addEventListener("sgd-api-config-change", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("sgd-api-config-change", refresh);
    };
  }, [refresh]);

  return { connection, health, capabilities, error, refresh };
}
