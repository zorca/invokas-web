import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Locale parity gate. Both directions are checked, because both were real drift when this test was
 * written: `settings.onboarding.step4.*` existed only in `en`/`lt`/`ru` although the wizard draws
 * three steps (`STEPS = 3`, OnboardingPage.tsx), and `common.language.names.*` existed only in
 * `pl`/`uk` although the language switcher reads display names from `src/lib/language.ts`. Both
 * turned out to be dead keys and were removed; a one-sided key must not come back unnoticed.
 *
 * Plural-category suffixes are stripped before comparing: each language carries the categories its
 * own rules need (`en` one/other, `lt` one/few/other, `ru` one/few/many/other), so a raw key-set
 * comparison would report healthy translations as incomplete — `statusbar.invoices_few` exists in
 * `ru` and `lt` but has no business existing in `en`.
 */
const BASE = "en";
const LOCALES_DIR = fileURLToPath(new URL("./locales", import.meta.url));
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other|plural)$/;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function flatten(value: Json, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
}

function keySet(language: string, namespace: string): Set<string> {
  const path = `${LOCALES_DIR}/${language}/${namespace}`;
  const json = JSON.parse(readFileSync(path, "utf8")) as Json;
  return new Set(flatten(json).map((key) => key.replace(PLURAL_SUFFIX, "")));
}

const languages = readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const namespaces = readdirSync(`${LOCALES_DIR}/${BASE}`)
  .filter((name) => name.endsWith(".json"))
  .sort();

describe("i18n locale files", () => {
  it("found the locale files to compare", () => {
    expect(languages).toContain(BASE);
    expect(languages.length).toBeGreaterThan(1);
    expect(namespaces.length).toBeGreaterThan(0);
  });

  it("every language ships every namespace of the base language", () => {
    const missing: string[] = [];
    for (const language of languages) {
      const present = readdirSync(`${LOCALES_DIR}/${language}`);
      for (const namespace of namespaces) {
        if (!present.includes(namespace)) missing.push(`${language}/${namespace}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every key of the base language exists in every other language", () => {
    const missing: string[] = [];
    for (const namespace of namespaces) {
      const reference = keySet(BASE, namespace);
      for (const language of languages) {
        if (language === BASE) continue;
        const translated = keySet(language, namespace);
        for (const key of reference) {
          if (!translated.has(key)) missing.push(`${language}/${namespace}: ${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("no language carries a key the base language lacks", () => {
    const extra: string[] = [];
    for (const namespace of namespaces) {
      const reference = keySet(BASE, namespace);
      for (const language of languages) {
        if (language === BASE) continue;
        for (const key of keySet(language, namespace)) {
          if (!reference.has(key)) extra.push(`${language}/${namespace}: ${key}`);
        }
      }
    }
    expect(extra).toEqual([]);
  });
});
