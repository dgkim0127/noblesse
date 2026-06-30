import { unauthorized, validationError } from "../utils/errors.js";

const maxIdentifierLength = 120;

function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

export function normalizeLoginIdentifier(identifier) {
  return String(identifier || "").trim();
}

export function isValidLoginIdentifier(identifier) {
  const value = normalizeLoginIdentifier(identifier);
  return (
    value.length > 0 &&
    value.length <= maxIdentifierLength &&
    !value.includes("@") &&
    !/\s/.test(value) &&
    !hasControlCharacter(value)
  );
}

export function createLoginIdentifierService({ queries }) {
  return {
    async resolveIdentifier(input = {}) {
      if (Object.prototype.hasOwnProperty.call(input, "password")) {
        throw validationError("Invalid login identifier request");
      }

      const identifier = normalizeLoginIdentifier(input.identifier);
      if (!isValidLoginIdentifier(identifier)) {
        throw validationError("Invalid login identifier");
      }

      const email = await queries.findActiveLoginEmailByIdentifier(identifier);
      if (!email) {
        throw unauthorized("Invalid login credentials");
      }

      return { email };
    }
  };
}
