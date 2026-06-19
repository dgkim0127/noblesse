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
        contactName: viewer.contactName || null,
        country: viewer.country || null,
        preferredLanguage: viewer.preferredLanguage || null,
        assignedMarket: viewer.assignedMarket || null,
        currency: viewer.currency || null,
        discountRate: Number(viewer.discountRate) || 0,
        minOrderAmount: Number(viewer.minOrderAmount) || 0
      };
    }
  };
}
