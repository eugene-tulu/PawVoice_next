// Shared string coercion for anything that gets rendered as a React child.
//
// Rendering a non-string (e.g. a Vapi/Daily error object) as JSX children
// throws React error #31 and crashes the page, so every user-facing message
// funnels through this helper. Kept in one place so the toast provider and the
// call page cannot drift on how they handle null/undefined/unserializable
// values.
export function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  try {
    // JSON.stringify returns undefined for values like functions and symbols,
    // so fall back to String() to guarantee a string result.
    return JSON.stringify(value) ?? String(value);
  } catch {
    // Circular structures (and anything else stringify rejects) land here.
    return String(value);
  }
}
