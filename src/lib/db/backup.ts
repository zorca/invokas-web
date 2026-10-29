import { writeFile, readPickedFile } from "@/lib/browser-files";
import { DATABASE_KEY, readDatabase, validateDatabase, withDatabaseLock } from "./db";
/** Bound input before reading/parsing; enough for the browser storage budget and a data-URL logo. */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
export async function getDatabasePath(): Promise<string> { return DATABASE_KEY; }
export async function backupDatabase(dest: string): Promise<void> {
  await writeFile(dest, new TextEncoder().encode(JSON.stringify(readDatabase(), null, 2)));
}
export async function restoreDatabase(src: string): Promise<void> {
  const file = await readPickedFile(src);
  if (file.size > MAX_BACKUP_BYTES) throw new Error("Backup exceeds the 20 MiB size limit");
  const contents = await file.text();
  if (contents.length > MAX_BACKUP_BYTES) throw new Error("Backup exceeds the 20 MiB size limit");
  const validated = validateDatabase(JSON.parse(contents));
  await withDatabaseLock(() => localStorage.setItem(DATABASE_KEY, JSON.stringify(validated)));
  window.location.reload();
}
export const deleteDatabase = deleteAllData;
export async function deleteAllData(): Promise<void> {
  await withDatabaseLock(() => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("invokas:")) keys.push(key);
    }
    for (const key of keys) if (key !== DATABASE_KEY) localStorage.removeItem(key);
    localStorage.removeItem(DATABASE_KEY);
  });
  window.location.reload();
}

