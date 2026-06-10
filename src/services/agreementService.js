export const AGREEMENT_VERSIONS = {
  termsOfService: 'terms-v1.0',
  privacyCollectionUse: 'privacy-v1.0',
  marketingUpdates: 'marketing-v1.0',
}

export function getInitialAgreements() {
  return {
    termsOfService: false,
    privacyCollectionUse: false,
    marketingUpdates: false,
  }
}

export function areRequiredAgreementsAccepted(agreements) {
  return Boolean(agreements.termsOfService && agreements.privacyCollectionUse)
}

export function buildAgreementSnapshot(agreements) {
  const acceptedAt = new Date().toISOString()

  return {
    termsOfService: {
      required: true,
      accepted: agreements.termsOfService,
      version: AGREEMENT_VERSIONS.termsOfService,
      acceptedAt: agreements.termsOfService ? acceptedAt : null,
    },
    privacyCollectionUse: {
      required: true,
      accepted: agreements.privacyCollectionUse,
      version: AGREEMENT_VERSIONS.privacyCollectionUse,
      acceptedAt: agreements.privacyCollectionUse ? acceptedAt : null,
    },
    marketingUpdates: {
      required: false,
      accepted: agreements.marketingUpdates,
      version: AGREEMENT_VERSIONS.marketingUpdates,
      acceptedAt: agreements.marketingUpdates ? acceptedAt : null,
    },
  }
}
