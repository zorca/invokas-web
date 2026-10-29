import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArchiveIcon, ArchiveRestoreIcon, ArrowLeftIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CLIENT_FORM_ID, ClientForm } from "@/components/clients/ClientForm";
import {
  createClient,
  deleteClient,
  getClientWithStats,
  setClientArchived,
  updateClient,
  type ClientInput,
} from "@/lib/db/clients";
import type { ClientWithStats } from "@/lib/db/types";
import type { Navigate } from "@/lib/navigation";

interface ClientEditorPageProps {
  /** `null` creates a client, an id edits that one. */
  clientId: number | null;
  navigate: Navigate;
}

/**
 * A client's requisites outgrew the side panel they used to live in, so they get the same page as
 * an invoice: the actions in a header row, the fields below it, and the list one click back.
 */
export function ClientEditorPage({ clientId, navigate }: ClientEditorPageProps) {
  const { t } = useTranslation("clients");
  const { t: tc } = useTranslation("common");

  const [client, setClient] = useState<ClientWithStats | null>(null);
  const [loading, setLoading] = useState(clientId !== null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const back = useCallback(() => navigate({ name: "clients" }), [navigate]);

  useEffect(() => {
    if (clientId === null) {
      setClient(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const row = await getClientWithStats(clientId);
        if (cancelled) return;
        if (!row) {
          // The row went away (deleted in another window, say): the list is the honest place to be.
          toast.error(tc("errors.generic"));
          back();
          return;
        }
        setClient(row);
      } catch (err) {
        console.warn("client load failed", err);
        if (!cancelled) {
          toast.error(tc("errors.database"));
          back();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, back, tc]);

  async function persist(input: ClientInput) {
    setSubmitting(true);
    try {
      if (client) {
        await updateClient(client.id, input);
        toast.success(tc("notify.saved"));
      } else {
        await createClient(input);
        toast.success(tc("notify.created"));
      }
      back();
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.save"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchiveToggle() {
    if (!client) return;
    const archived = !client.archived_at;
    try {
      await setClientArchived(client.id, archived);
      toast.success(archived ? tc("notify.archived") : tc("notify.restored"));
      back();
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.generic"));
    }
  }

  async function handleDelete() {
    if (!client || deleting) return;
    setDeleting(true);
    try {
      await deleteClient(client.id);
      toast.success(tc("notify.deleted"));
      setDeleteOpen(false);
      back();
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.generic"));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="client-editor flex h-full min-w-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 flex-wrap">
        <Button variant="ghost" size="icon-sm" aria-label={tc("actions.back")} onClick={back}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h1 className="min-w-0 truncate text-lg font-semibold tracking-[-0.02em] text-text-primary">
          {client ? t("form.titleEdit") : t("form.titleNew")}
        </h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {client && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => void handleArchiveToggle()}
                disabled={submitting}
              >
                {client.archived_at ? (
                  <>
                    <ArchiveRestoreIcon className="size-3.5" />
                    {tc("actions.restore")}
                  </>
                ) : (
                  <>
                    <ArchiveIcon className="size-3.5" />
                    {tc("actions.archive")}
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={submitting}
              >
                <Trash2Icon className="size-3.5" />
                {tc("actions.delete")}
              </Button>
              <div className="mx-1 h-4 w-px bg-border" />
            </>
          )}
          <Button size="sm" variant="ghost" className="h-7" onClick={back} disabled={submitting}>
            {tc("actions.cancel")}
          </Button>
          <Button size="sm" className="h-7" type="submit" form={CLIENT_FORM_ID} disabled={submitting}>
            {tc("actions.save")}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl p-4">
          <ClientForm client={client} onSubmit={(input) => void persist(input)} />
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("form.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("form.deleteDescription", { name: client?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          {(client?.invoice_count ?? 0) > 0 && (
            <p className="text-xs text-text-secondary">
              {t("form.deleteLinkedInvoices", { n: client?.invoice_count ?? 0 })}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {tc("actions.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
