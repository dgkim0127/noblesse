import { unauthorized } from "../utils/errors.js";

export function createBuyerService() {
  return {
    async getMe(viewer) {
      if (!viewer) {
        throw unauthorized();
      }

      return {
        user: {
          id: viewer.userId,
          email: viewer.email,
          role: viewer.role,
          status: viewer.status
        },
        buyer: viewer.buyerId
          ? {
              id: viewer.buyerId,
              companyName: viewer.companyName,
              assignedMarket: viewer.assignedMarket,
              currency: viewer.currency
            }
          : null
      };
    }
  };
}
