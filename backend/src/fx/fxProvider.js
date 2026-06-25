import { parseManualFxPayload } from "./manualFxProvider.js";
import { EXCHANGE_RATE_API_PROVIDER_ID, fetchOfficialFxRates } from "./officialFxProvider.js";

export async function getFxProviderSnapshot({ provider = "manual", payload, env, fetchImpl, now } = {}) {
  if (provider === "manual") {
    return parseManualFxPayload(payload);
  }
  if (provider === EXCHANGE_RATE_API_PROVIDER_ID) {
    return fetchOfficialFxRates({ env, fetchImpl, now });
  }
  throw new Error("Unsupported FX provider");
}
