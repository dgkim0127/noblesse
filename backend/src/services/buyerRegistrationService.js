import { conflict, unauthorized, validationError } from "../utils/errors.js";

const allowedFields = new Set([
  "email",
  "companyName",
  "contactName",
  "country",
  "preferredLanguage",
  "phone",
  "messengerType",
  "messengerId",
  "salesChannel",
  "businessNumber",
  "requestMemo",
  "agreements"
]);

const allowedAgreementKeys = new Set([
  "terms_of_service",
  "buyer_terms",
  "privacy_collection_use",
  "marketing_updates",
  "privacy_policy"
]);

const requiredAgreementVersions = {
  terms_of_service: "terms-v1.0",
  buyer_terms: "buyer-terms-v1.0",
  privacy_collection_use: "privacy-v1.0"
};

const requiredAgreementKeys = Object.keys(requiredAgreementVersions);

function assertNoUnknownFields(input) {
  Object.keys(input || {}).forEach((key) => {
    if (!allowedFields.has(key)) {
      throw validationError(`Unsupported registration field: ${key}`);
    }
  });
}

function cleanText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function requireText(value, fieldName, maxLength = 200) {
  const text = cleanText(value, maxLength);
  if (!text) {
    throw validationError(`${fieldName} is required`);
  }
  return text;
}

function normalizeLanguage(value) {
  const text = cleanText(value, 20).toLowerCase();
  if (["kr", "ko", "korean"].includes(text)) return "kr";
  if (["jp", "ja", "japanese"].includes(text)) return "jp";
  if (["cn", "zh", "chinese"].includes(text)) return "cn";
  return text || "en";
}

function deriveMarket({ country, preferredLanguage }) {
  const haystack = `${country || ""} ${preferredLanguage || ""}`.toLowerCase();
  if (haystack.includes("korea") || haystack.includes("kr") || haystack.includes("한국")) {
    return { assignedMarket: "KR", currency: "KRW" };
  }
  if (haystack.includes("japan") || haystack.includes("jp") || haystack.includes("日本")) {
    return { assignedMarket: "JP", currency: "JPY" };
  }
  if (haystack.includes("taiwan") || haystack.includes("tw") || haystack.includes("china") || haystack.includes("cn") || haystack.includes("zh") || haystack.includes("chinese")) {
    return { assignedMarket: "TW", currency: "TWD" };
  }
  if (haystack.includes("us") || haystack.includes("united states") || haystack.includes("america")) {
    return { assignedMarket: "US", currency: "USD" };
  }
  return { assignedMarket: "GLOBAL", currency: "USD" };
}

function normalizeAgreements(agreements) {
  if (!Array.isArray(agreements)) {
    throw validationError("Required agreement consent is missing", "AGREEMENTS_REQUIRED");
  }

  const normalized = agreements.map((agreement) => {
    const agreementKey = cleanText(agreement?.agreementKey || agreement?.key, 80);
    if (!allowedAgreementKeys.has(agreementKey)) {
      throw validationError("Unsupported agreement key");
    }
    return {
      agreementKey,
      version: cleanText(agreement.version, 80),
      required: agreement.required !== false,
      accepted: agreement.accepted === true
    };
  });

  const byKey = new Map(normalized.map((agreement) => [agreement.agreementKey, agreement]));
  for (const key of requiredAgreementKeys) {
    const agreement = byKey.get(key);
    if (!agreement || agreement.version !== requiredAgreementVersions[key]) {
      throw validationError("Required agreement consent is missing", "REQUIRED_AGREEMENT_MISSING");
    }
    if (agreement.accepted !== true) {
      throw validationError("Required agreement consent must be accepted", "REQUIRED_AGREEMENT_NOT_ACCEPTED");
    }
  }

  return normalized;
}

function normalizeInput(input = {}) {
  assertNoUnknownFields(input);

  const preferredLanguage = normalizeLanguage(input.preferredLanguage);
  const market = deriveMarket({ country: input.country, preferredLanguage });

  return {
    email: requireText(input.email, "email", 254).toLowerCase(),
    companyName: requireText(input.companyName, "companyName", 200),
    contactName: requireText(input.contactName, "contactName", 120),
    country: requireText(input.country, "country", 120),
    preferredLanguage,
    phone: cleanText(input.phone, 80) || null,
    messengerType: cleanText(input.messengerType, 80) || null,
    messengerId: cleanText(input.messengerId, 120) || null,
    salesChannel: cleanText(input.salesChannel, 160) || null,
    businessNumber: cleanText(input.businessNumber, 120) || null,
    requestMemo: cleanText(input.requestMemo, 1000) || null,
    agreements: normalizeAgreements(input.agreements),
    ...market
  };
}

export function createBuyerRegistrationService({ queries }) {
  return {
    async registerBuyer(identity, input, context = {}) {
      if (!identity?.authUid) {
        throw unauthorized();
      }

      const normalized = normalizeInput({
        ...input,
        email: input?.email || identity.email
      });

      if (identity.email && normalized.email !== String(identity.email).trim().toLowerCase()) {
        throw validationError("Registration email must match authenticated email");
      }

      const result = await queries.registerBuyer(identity, normalized, context);
      if (result.conflict === "email_in_use") {
        throw conflict("Email is already registered");
      }
      if (result.conflict) {
        throw conflict("Registration cannot be completed for this account");
      }
      return result.profile;
    }
  };
}
