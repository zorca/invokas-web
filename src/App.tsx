import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SettingsProvider, useSettings } from "@/context/SettingsContext";
import { AppLanguageProvider } from "@/context/AppLanguageContext";
import { AppShell } from "@/components/layout/AppShell";
import { InvoicesPage } from "@/pages/InvoicesPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { InvoiceEditorPage } from "@/pages/InvoiceEditorPage";
import { ClientEditorPage } from "@/pages/ClientEditorPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import type { Page } from "@/lib/navigation";

function AppRoot() {
  const { settings, loading } = useSettings();
  const [page, setPage] = useState<Page>({ name: "invoices" });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
          invokas
        </span>
      </div>
    );
  }

  if (!settings) {
    return <OnboardingPage />;
  }

  const renderPage = () => {
    switch (page.name) {
      case "invoices":
        return (
          <InvoicesPage
            onNewInvoice={() => setPage({ name: "invoice", invoiceId: null })}
            onOpenInvoice={(id) => setPage({ name: "invoice", invoiceId: id })}
          />
        );
      case "clients":
        return <ClientsPage navigate={setPage} />;
      case "settings":
        return <SettingsPage />;
      case "invoice":
        return <InvoiceEditorPage invoiceId={page.invoiceId} navigate={setPage} />;
      case "client":
        return <ClientEditorPage clientId={page.clientId} navigate={setPage} />;
      default:
        return null;
    }
  };

  return (
    <AppShell page={page} navigate={setPage}>
      {renderPage()}
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      storageKey="invokas:theme"
      enableSystem={true}
      disableTransitionOnChange
      scriptProps={{ type: "application/json" }}
    >
      <SettingsProvider>
        <AppLanguageProvider>
          <TooltipProvider>
            <AppRoot />
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </AppLanguageProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
