import { ApiClientError } from "./errors.js";

export function createBuyerApi(apiClient) {
  return {
    async getCurrentBuyerProfile(token) {
      if (!token) {
        throw new ApiClientError({
          code: "UNAUTHORIZED",
          message: "Authentication token is required",
          status: 401
        });
      }

      const response = await apiClient.apiFetch("/buyer/me", { token });
      return response.data?.profile || null;
    }
  };
}
