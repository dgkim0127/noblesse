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
        legacyStatus: viewer.legacyStatus || viewer.status,
        accountStatus: viewer.accountStatus || null,
        verificationStatus: viewer.verificationStatus || null,
        buyerId: viewer.buyerId || null,
        companyName: viewer.companyName || null,
        contactName: viewer.contactName || null,
        country: viewer.country || null,
        preferredLanguage: viewer.preferredLanguage || null,
        submittedAt: viewer.submittedAt || null,
        reviewedAt: viewer.reviewedAt || null,
        rejectionReason: viewer.rejectionReason || null,
        suspensionReason: viewer.suspensionReason || null,
        assignedMarket: viewer.assignedMarket || null,
        currency: viewer.currency || null,
        discountRate: Number(viewer.discountRate) || 0,
        minOrderAmount: Number(viewer.minOrderAmount) || 0
      };
    }
  };
}
