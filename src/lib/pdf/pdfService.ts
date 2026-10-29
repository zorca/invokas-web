import * as Comlink from "comlink";
import { save, writeFile } from "@/lib/browser-files";

import type { InvoiceDocumentData } from "./types";

interface PdfWorkerApi {
  generatePdfBlob(data: InvoiceDocumentData): Promise<Blob>;
}

let worker: Worker | null = null;
let api: Comlink.Remote<PdfWorkerApi> | null = null;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    worker?.terminate();
    worker = null;
    api = null;
  });
}

function getApi(): Comlink.Remote<PdfWorkerApi> {
  if (!api) {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    api = Comlink.wrap<PdfWorkerApi>(worker);
  }
  return api;
}

/** Generates the PDF blob off the main thread via a Comlink web worker. */
export async function generatePdfBlob(data: InvoiceDocumentData): Promise<Blob> {
  return getApi().generatePdfBlob(data);
}

/** Exports an invoice through the system save dialog. Returns `false` if the user cancelled. */
export async function exportInvoicePdf(
  data: InvoiceDocumentData,
  filename: string,
): Promise<boolean> {
  const blob = await generatePdfBlob(data);
  const safeName = filename.replace(/[<>:"/\\|?*]+/g, "-");
  const path = await save({
    defaultPath: `${safeName}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!path) return false;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await writeFile(path, bytes);
  return true;
}
