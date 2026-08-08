// convex/lib/phone.ts
import { parsePhoneNumber, type CountryCode } from "libphonenumber-js";

export const DEFAULT_COUNTRY: CountryCode = "US";

// Normalize any human phone input to E.164 (e.g. "+15551234567") or null.
export function normalizePhone(input: string | undefined | null): string | null {
  if (!input) return null;
  try {
    const phone = parsePhoneNumber(input, DEFAULT_COUNTRY);
    if (!phone.isValid) return null;
    return phone.number; // E.164
  } catch {
    return null;
  }
}

export function isValidE164(phone: string): boolean {
  if (!phone) return false;
  try {
    const cleaned = phone.startsWith("+") ? phone : `+${phone}`;
    return parsePhoneNumber(cleaned).isValid();
  } catch {
    return false;
  }
}

// Last-4 masking for UI.
export function maskPhone(phone: string | undefined | null): string {
  const p = normalizePhone(phone);
  if (!p) return "Unknown number";
  return `...${p.slice(-4)}`;
}
