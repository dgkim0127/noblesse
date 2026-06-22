export function normalizeAccountStatus(accountStatus, legacyStatus = null) {
  if (accountStatus === "blocked") return "blocked";
  if (accountStatus === "active") return "active";
  return legacyStatus === "blocked" ? "blocked" : "active";
}

export function normalizeVerificationStatus(verificationStatus, legacyStatus = null) {
  if (["draft", "pending", "approved", "rejected", "suspended"].includes(verificationStatus)) {
    return verificationStatus;
  }
  if (legacyStatus === "blocked") return "suspended";
  if (legacyStatus === "approved") return "approved";
  if (legacyStatus === "pending") return "pending";
  return "draft";
}

export function deriveLegacyBuyerStatus({ accountStatus, verificationStatus } = {}) {
  if (accountStatus === "blocked") return "blocked";
  if (verificationStatus === "suspended") return "blocked";
  if (verificationStatus === "approved") return "approved";
  return "pending";
}

export function isApprovedBuyerLifecycle(viewer = {}) {
  return (
    viewer.role === "buyer" &&
    viewer.accountStatus === "active" &&
    viewer.verificationStatus === "approved" &&
    Boolean(viewer.buyerId)
  );
}
