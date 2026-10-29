import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Settings } from "@/lib/db/types";
import { loadSettings, saveSettings } from "@/lib/settingsStore";

/* eslint-disable react-refresh/only-export-components -- provider + hook share one context */

interface SettingsContextValue {
  settings: Settings | null;
  loading: boolean;
  save: (patch: Partial<Omit<Settings, "id">>) => Promise<Settings>;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await loadSettings();
      setSettings(s);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (patch: Partial<Omit<Settings, "id">>) => {
    const s = await saveSettings(patch);
    setSettings(s);
    return s;
  }, []);

  if (error) return (
    <section role="alert" className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Invokas — ошибка хранилища</h1>
      <p>Не удалось прочитать данные. Сохранённые записи не изменены. Не очищайте данные сайта без резервной копии.</p>
      <p className="break-words text-sm">{error}</p>
      <button type="button" onClick={() => void refresh()} className="rounded border p-3">Повторить</button>
    </section>
  );

  return (
    <SettingsContext.Provider value={{ settings, loading, save, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
