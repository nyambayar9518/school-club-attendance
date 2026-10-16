/**
 * Normalizes phone numbers so Mongolian numbers (+976 and solo 8-digit numbers)
 * work completely interchangeably across login, signup, and search.
 */

export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";

  // Remove all whitespace, dashes, parentheses
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, "").trim();

  // If starts with +976, strip it
  if (cleaned.startsWith("+976")) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith("976") && cleaned.length >= 11) {
    // e.g. 97699112233 -> 99112233
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Returns all potential database representations of a phone number
 * so queries match regardless of how the user originally registered.
 */
export function getPhoneVariants(rawPhone: string): string[] {
  const solo = normalizePhone(rawPhone);
  const variants = new Set<string>();

  if (rawPhone.trim()) {
    variants.add(rawPhone.trim());
  }

  if (solo) {
    variants.add(solo); // e.g. 99112233
    variants.add(`+976${solo}`); // e.g. +97699112233
    variants.add(`976${solo}`); // e.g. 97699112233
    variants.add(`+976 ${solo.slice(0, 4)} ${solo.slice(4)}`); // formatted
  }

  return Array.from(variants);
}
