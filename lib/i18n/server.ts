import "server-only";
import { cookies } from "next/headers";
import {
  LOCALE_COOKIE,
  defaultLocale,
  dictionaries,
  isLocale,
  translate,
  type Locale,
  type MessageKey,
} from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getTranslator() {
  const locale = await getLocale();
  const dict = dictionaries[locale];
  return {
    locale,
    t: (key: MessageKey, vars?: Record<string, string | number>) => translate(dict, key, vars),
  };
}
