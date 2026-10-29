import { readDatabase, updateDatabase } from "./db";
import { defaultSettings } from "./defaults";
import type { Settings } from "./types";
export async function getSettings(): Promise<Settings | null> { return readDatabase().settings; }
export async function updateSettings(patch: Partial<Omit<Settings, "id">>): Promise<Settings> {
  return updateDatabase(state => {
    const settings = state.settings ?? defaultSettings();
    for (const key of Object.keys(defaultSettings()) as (keyof Settings)[]) {
      if (key !== "id" && Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== undefined) Object.assign(settings, { [key]: patch[key] });
    }
    state.settings = settings;
    return settings;
  });
}

