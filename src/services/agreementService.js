import { agreementDocuments } from '../content/agreements'

export const AGREEMENT_VERSIONS = {
  terms_of_service: 'terms-v1.0',
  buyer_terms: 'buyer-terms-v1.0',
  privacy_collection_use: 'privacy-v1.0',
  marketing_updates: 'marketing-v1.0',
  privacy_policy: 'privacy-policy-v1.0',
}

export const REQUIRED_AGREEMENT_KEYS = [
  'terms_of_service',
  'buyer_terms',
  'privacy_collection_use',
]

export const OPTIONAL_AGREEMENT_KEYS = ['marketing_updates']

const CHECKBOX_AGREEMENT_KEYS = [
  ...REQUIRED_AGREEMENT_KEYS,
  ...OPTIONAL_AGREEMENT_KEYS,
]

export function getInitialAgreements() {
  return {
    terms_of_service: false,
    buyer_terms: false,
    privacy_collection_use: false,
    marketing_updates: false,
  }
}

export function areRequiredAgreementsAccepted(agreements) {
  return REQUIRED_AGREEMENT_KEYS.every((key) => agreements[key] === true)
}

export function buildAgreementSnapshot(agreements) {
  const acceptedAt = new Date().toISOString()

  return CHECKBOX_AGREEMENT_KEYS.map((key) => {
    const accepted = agreements[key] === true

    return {
      key,
      version: AGREEMENT_VERSIONS[key],
      required: REQUIRED_AGREEMENT_KEYS.includes(key),
      accepted,
      acceptedAt: accepted ? acceptedAt : null,
    }
  })
}

export function getAgreementDocuments() {
  return agreementDocuments
}

export function getAgreementDocument(key) {
  return agreementDocuments.find((document) => document.key === key) ?? null
}

export function getAgreementSummaryForRegister() {
  return CHECKBOX_AGREEMENT_KEYS.map((key) => {
    const document = getAgreementDocument(key)

    return {
      key,
      version: AGREEMENT_VERSIONS[key],
      required: REQUIRED_AGREEMENT_KEYS.includes(key),
      titleKo: document?.titleKo ?? key,
      titleEn: document?.titleEn ?? key,
      sections: document?.sections ?? [],
    }
  })
}
