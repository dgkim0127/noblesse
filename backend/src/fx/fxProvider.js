import { parseManualFxPayload } from "./manualFxProvider.js";
import { fetchOfficialFxRates } from "./officialFxProvider.js";

export async function getFxProviderSnapshot({ provider = "manual", payload } = {}) {
  if (provider === "manual") {
    return parseManualFxPayload(payload);
  }
  if (provider === "official") {
    return fetchOfficialFxRates();
  }
  throw new Error("Unsupported FX provider");
}
