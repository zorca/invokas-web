import { getSettings, updateSettings } from "./db/settings";
export { defaultSettings } from "./db/defaults";
export const loadSettings = getSettings;
export const saveSettings = updateSettings;

