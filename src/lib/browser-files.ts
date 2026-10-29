export interface DialogFilter { name: string; extensions: string[] }
interface DialogOptions { defaultPath?: string; filters?: DialogFilter[]; multiple?: boolean; directory?: boolean }
const pickedFiles = new Map<string, File>();

/** File handles stay in memory only until their consumer reads them. */
export function readPickedFile(path: string): File {
  const file = pickedFiles.get(path);
  if (!file) throw new Error("The selected file is no longer available. Select it again.");
  pickedFiles.delete(path);
  return file;
}

export function open(options: DialogOptions = {}): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = options.filters?.flatMap((filter) => filter.extensions.map((ext) => `.${ext}`)).join(",") ?? "";
    input.style.display = "none";
    const finish = (result: string | null) => { input.remove(); resolve(result); };
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return finish(null);
      const key = `picked:${crypto.randomUUID()}:${file.name}`;
      pickedFiles.set(key, file);
      finish(key);
    }, { once: true });
    input.addEventListener("cancel", () => finish(null), { once: true });
    document.body.append(input);
    input.click();
  });
}

export async function save(options: DialogOptions = {}): Promise<string | null> {
  const name = (options.defaultPath ?? "invokas-export").split(/[\\/]/).pop()!;
  return Array.from(name, (char) => char.charCodeAt(0) < 32 || '<>:"|?*'.includes(char) ? "-" : char).join("");
}

export async function writeFile(path: string, bytes: Uint8Array): Promise<void> {
  const blob = new Blob([new Uint8Array(bytes)], { type: path.endsWith(".pdf") ? "application/pdf" : path.endsWith(".json") ? "application/json" : "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = path.split(/[\\/]/).pop() ?? "invokas-export";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
