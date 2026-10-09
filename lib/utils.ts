import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale } from "@/lib/i18n/dictionaries";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const intlLocale = (locale: Locale) => (locale === "vi" ? "vi-VN" : "en-US");

export function formatMoney(value: number, locale: Locale, currency?: string | null, compact = false) {
  const fractionDigits = !currency || currency === "VND" ? 0 : 2;
  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      style: currency ? "currency" : "decimal",
      currency: currency ?? undefined,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : fractionDigits,
    }).format(value);
  } catch {
    return formatNumber(value, locale);
  }
}

export function formatNumber(value: number, locale: Locale, maxFractionDigits = 2) {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: maxFractionDigits }).format(value);
}

export function formatPercent(value: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 1 }).format(value);
}

export function formatMonth(isoMonth: string, locale: Locale) {
  const [y, m] = isoMonth.split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "short", year: "2-digit" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

export function formatDate(iso: string, locale: Locale) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}
