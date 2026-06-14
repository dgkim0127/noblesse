import { unauthorized } from "../utils/errors.js";

export function createBuyerService() {
  return {
    async getMe(viewer) {
      if (!viewer) {
        throw unauthorized();
      }

      return {
        userId: viewer.userId,
        email: viewer.email,
        role: viewer.role,
        status: viewer.status,
        buyerId: viewer.buyerId || null,
        companyName: viewer.companyName || null,
        assignedMarket: viewer.assignedMarket || null,
        currency: viewer.currency || null
      };
    }
  };
}
