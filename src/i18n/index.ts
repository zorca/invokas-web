import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import commonEn from "./locales/en/common.json";
import invoicesEn from "./locales/en/invoices.json";
import clientsEn from "./locales/en/clients.json";
import settingsEn from "./locales/en/settings.json";
import pdfEn from "./locales/en/pdf.json";

import commonLt from "./locales/lt/common.json";
import invoicesLt from "./locales/lt/invoices.json";
import clientsLt from "./locales/lt/clients.json";
import settingsLt from "./locales/lt/settings.json";
import pdfLt from "./locales/lt/pdf.json";

import commonRu from "./locales/ru/common.json";
import invoicesRu from "./locales/ru/invoices.json";
import clientsRu from "./locales/ru/clients.json";
import settingsRu from "./locales/ru/settings.json";
import pdfRu from "./locales/ru/pdf.json";

import commonUk from "./locales/uk/common.json";
import invoicesUk from "./locales/uk/invoices.json";
import clientsUk from "./locales/uk/clients.json";
import settingsUk from "./locales/uk/settings.json";
import pdfUk from "./locales/uk/pdf.json";

import commonPl from "./locales/pl/common.json";
import invoicesPl from "./locales/pl/invoices.json";
import clientsPl from "./locales/pl/clients.json";
import settingsPl from "./locales/pl/settings.json";
import pdfPl from "./locales/pl/pdf.json";

export const SUPPORTED_LANGUAGES = ["lt", "ru", "uk", "pl", "en"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "lt";

const resources = {
  en: { common: commonEn, invoices: invoicesEn, clients: clientsEn, settings: settingsEn, pdf: pdfEn },
  lt: { common: commonLt, invoices: invoicesLt, clients: clientsLt, settings: settingsLt, pdf: pdfLt },
  ru: { common: commonRu, invoices: invoicesRu, clients: clientsRu, settings: settingsRu, pdf: pdfRu },
  uk: { common: commonUk, invoices: invoicesUk, clients: clientsUk, settings: settingsUk, pdf: pdfUk },
  pl: { common: commonPl, invoices: invoicesPl, clients: clientsPl, settings: settingsPl, pdf: pdfPl },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: "en",
  supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
  load: "currentOnly",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  returnNull: false,
});

export default i18n;
