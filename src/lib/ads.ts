/** A single sidebar ad slot. */
export interface Ad {
  id: string;
  /** Small uppercase caption above the ad. */
  label: string;
  title: string;
  /** Optional prominent line (price or promo hook). */
  promo?: string;
  cta: string;
  /** External link opened by the CTA. When absent the CTA shows the "get in touch" toast. */
  href?: string;
  /** Branded slot: shows the advertiser's logo mark and accent colour instead of the generic look. */
  branded?: boolean;
}

/** Paid slot #1 — Virtuvės Pasaulis (kitchenware shop) with a referral tail. */
export const VIRTUVESPASAULIS_AD: Ad = {
  id: "virtuvespasaulis",
  label: "Reklama",
  title: "Virtuvės Pasaulis",
  promo: "Virtuvės reikmenys internetu",
  cta: "Pirkti",
  href: "https://virtuvespasaulis.lt/?utm_source=invokas&utm_medium=app",
  branded: true,
};

/** How many ad slots the sidebar renders (slot 1 is paid, the rest are placeholders). */
export const AD_SLOT_COUNT = 3;
