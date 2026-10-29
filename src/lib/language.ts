import type { AppLanguage } from "@/i18n";

export interface LanguageMeta {
  code: AppLanguage;
  /** Display name in the language itself. */
  nativeName: string;
  /** Short label used in the header switch (LT / RU / EN). */
  short: string;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: "lt", nativeName: "Lietuvių", short: "LT" },
  { code: "ru", nativeName: "Русский", short: "RU" },
  { code: "uk", nativeName: "Українська", short: "UK" },
  { code: "pl", nativeName: "Polski", short: "PL" },
  { code: "en", nativeName: "English", short: "EN" },
];

export function languageMeta(code: AppLanguage): LanguageMeta {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/**
 * Maps a Tauri `locale()` value (e.g. `lt-LT`, `ru-RU`) to an app language.
 * Falls back to `lt` for anything unrecognized.
 */
export function languageFromSystemLocale(locale: string | null | undefined): AppLanguage {
  if (!locale) return "lt";
  const code = locale.split("-")[0].toLowerCase();
  if (code === "lt") return "lt";
  if (code === "uk") return "uk";
  if (code === "pl") return "pl";
  if (code === "ru") return "ru";
  if (code === "en") return "en";
  return "lt";
}

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "lt" || value === "ru" || value === "uk" || value === "pl" || value === "en";
}
