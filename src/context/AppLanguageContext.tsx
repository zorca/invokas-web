import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import i18n, { type AppLanguage } from "@/i18n";
import { isAppLanguage } from "@/lib/language";
import { useSettings } from "@/context/SettingsContext";

/* eslint-disable react-refresh/only-export-components -- provider + hook share one context */

const STORAGE_KEY = "invokas:language";

interface AppLanguageContextValue {
  language: AppLanguage;
  /** Set the active language. `persist: false` only updates the UI (used by the onboarding wizard, which must not create the settings row). */
  setLanguage: (language: AppLanguage, options?: { persist?: boolean }) => void;
  ready: boolean;
}

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const { settings, loading, save } = useSettings();
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isAppLanguage(saved) ? saved : "lt";
  });
  const [ready, setReady] = useState(false);

  // On the first load only: prefer the stored interface language, otherwise (first run)
  // default to Lithuanian. Afterwards the context is authoritative — a later settings refresh
  // must not snap the UI back to an older stored value.
  useEffect(() => {
    if (loading || ready) return;
    if (settings && isAppLanguage(settings.interface_language)) {
      setLanguageState(settings.interface_language);
    } else {
      setLanguageState("lt");
    }
    setReady(true);
  }, [loading, settings, ready]);

  useEffect(() => {
    void i18n.changeLanguage(language);
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(
    (next: AppLanguage, options?: { persist?: boolean }) => {
      setLanguageState(next);
      if (options?.persist !== false) {
        void save({ interface_language: next });
      }
    },
    [save],
  );

  return (
    <AppLanguageContext.Provider value={{ language, setLanguage, ready }}>
      {children}
    </AppLanguageContext.Provider>
  );
}

export function useAppLanguage(): AppLanguageContextValue {
  const ctx = useContext(AppLanguageContext);
  if (!ctx) throw new Error("useAppLanguage must be used within AppLanguageProvider");
  return ctx;
}
