import { useTranslation } from "react-i18next";
import { MegaphoneIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Ad } from "@/lib/ads";

/** Keep external destinations out of the invoicing app tab. */
function openExternal(href: string): void {
  window.open(href, "_blank", "noopener,noreferrer");
}

/**
 * One sidebar ad slot. Slots share this layout; a branded slot additionally carries the
 * advertiser's logo mark and accent colour instead of the generic megaphone + app primary.
 */
export function AdBanner({ ad }: { ad: Ad }) {
  const { t } = useTranslation("common");
  const branded = ad.branded === true;

  const handleClick = () => {
    if (ad.href) {
      void openExternal(ad.href);
    } else {
      toast(t("banner.toast"));
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        branded ? "border-vp/40 bg-vp/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
        {branded ? (
          <span className="vp-mark size-4 text-vp dark:text-white" aria-hidden="true" />
        ) : (
          <MegaphoneIcon className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{ad.label}</span>
      </div>
      <p className="mt-2 text-[13px] font-semibold leading-tight text-text-primary">{ad.title}</p>
      {ad.promo && (
        <p
          className={cn(
            "mt-1 text-[15px] font-semibold leading-tight",
            branded ? "text-vp dark:text-vp-soft" : "text-primary",
          )}
        >
          {ad.promo}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "mt-2.5 flex h-7 w-full items-center justify-center rounded-md text-[13px] font-medium transition-colors",
          branded
            ? "bg-vp text-white hover:bg-vp-dark"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        {ad.cta}
      </button>
    </div>
  );
}
