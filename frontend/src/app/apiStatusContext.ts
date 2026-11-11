import { createContext, useContext } from "react";
import type { ApiStatusValue } from "../types/api";

export const ApiStatusContext = createContext<ApiStatusValue | null>(null);

export function useApiStatusContext(): ApiStatusValue {
  const value = useContext(ApiStatusContext);
  if (!value) throw new Error("useApiStatusContext must be used inside ApiStatusContext.Provider");
  return value;
}
