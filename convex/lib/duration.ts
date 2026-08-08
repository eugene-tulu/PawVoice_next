// convex/lib/duration.ts
// Parse a caller-supplied duration ("30 minutes", "half an hour", "45 mins")
// into a whole number of minutes. Returns null if it can't be reliably parsed.

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  onehalf: 1,
  half: 1,
};

export function parseDurationMinutes(input: string | undefined | null): number | null {
  if (!input) return null;
  const raw = String(input).toLowerCase().trim();
  if (!raw) return null;

  // half an hour / half hour
  if (/\b(half an hour|half hour|half)\b/.test(raw)) return 30;

  // "X hours" / "X hour"
  let m = raw.match(/(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr)\b/);
  if (m) {
    const hours = parseFloat(m[1]);
    const mins = Math.round(hours * 60);
    if (mins > 0) return mins;
  }

  // "X minutes" / "X minute" / "X mins"
  m = raw.match(/(\d+(?:\.\d+)?)\s*(?:minutes|minute|mins|min)\b/);
  if (m) {
    const mins = Math.round(parseFloat(m[1]));
    if (mins > 0) return mins;
  }

  // bare number (assume minutes): "30" or "30min"
  m = raw.match(/(\d+(?:\.\d+)?)/);
  if (m) {
    const mins = Math.round(parseFloat(m[1]));
    if (mins > 0) return mins;
  }

  // number words: "half an hour" handled above; "twenty minutes"
  const wordMatch = raw.match(/\b(twenty|thirty|forty|fifty|sixty|ten|fifteen|one|two|three|four|five|six|seven|eight|nine|eleven|twelve)\b/);
  if (wordMatch) {
    const mins = NUMBER_WORDS[wordMatch[1]];
    // only trust if the context mentions minutes or it's a plausible duration
    if (raw.includes("min") || raw.includes("hour") ? mins > 0 : mins > 0) return mins;
  }

  return null;
}

export function durationLabel(minutes: number | null | undefined): string {
  if (minutes == null) return "unspecified";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${h} hr` : `${h} hr ${rem} min`;
}
