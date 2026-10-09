/**
 * Parses fast-typed amounts:
 *   "1500000", "1.500.000", "1,500,000", "50k", "1.5tr", "1,5tr", "2m", "1ty", "1b"
 * Suffixes: k = 1e3, m/tr = 1e6, b/ty/tỷ = 1e9.
 * Returns null if not a valid positive-or-zero number.
 */
export function parseAmount(raw: string, currency = "VND"): number | null {
  let s = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;

  const suffixes: [RegExp, number][] = [
    [/(tỷ|ty|b)$/, 1e9],
    [/(tr|m)$/, 1e6],
    [/k$/, 1e3],
  ];

  let multiplier = 1;
  for (const [re, mult] of suffixes) {
    if (re.test(s)) {
      multiplier = mult;
      s = s.replace(re, "");
      break;
    }
  }

  if (multiplier > 1) {
    // With a suffix, a single "," or "." is a decimal point.
    s = s.replace(",", ".");
  } else if (currency === "VND" || currency === "JPY") {
    // Zero-decimal currencies: "." and "," are thousands separators.
    s = s.replace(/[.,]/g, "");
  } else {
    // en-style: "," thousands, "." decimal.
    s = s.replace(/,/g, "");
  }

  if (!/^\d*\.?\d+$|^\d+\.?$/.test(s)) return null;
  const n = Number(s) * multiplier;
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
