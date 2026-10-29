import * as Comlink from "comlink";
import * as React from "react";
import { pdf } from "@react-pdf/renderer";
import { InvoiceDocument } from "./document";
import type { InvoiceDocumentData } from "./types";

type PdfElement = NonNullable<Parameters<typeof pdf>[0]>;

const api = {
  async generatePdfBlob(data: InvoiceDocumentData): Promise<Blob> {
    const element = React.createElement(InvoiceDocument, { data }) as unknown as PdfElement;
    const instance = pdf(element);
    return instance.toBlob();
  },
};

Comlink.expose(api);
