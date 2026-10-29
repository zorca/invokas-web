export type Page =
  | { name: "invoices" }
  | { name: "clients" }
  | { name: "settings" }
  | { name: "onboarding" }
  | { name: "invoice"; invoiceId: number | null }
  | { name: "client"; clientId: number | null };

export type Navigate = (page: Page) => void;
