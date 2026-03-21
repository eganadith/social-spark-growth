import type { Platform } from "@/types/database";

export const PENDING_ORDER_KEY = "socioly_pending_order";

export type PendingOrderDraft = {
  platform: Platform | "";
  profileLink: string;
  email: string;
  selectedPkg: string;
  step: 1 | 2;
  termsAgreed: boolean;
};

export function savePendingOrderDraft(draft: PendingOrderDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function loadPendingOrderDraft(): PendingOrderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_ORDER_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as PendingOrderDraft;
    if (typeof d !== "object" || d == null) return null;
    return {
      platform: (d.platform ?? "") as Platform | "",
      profileLink: typeof d.profileLink === "string" ? d.profileLink : "",
      email: typeof d.email === "string" ? d.email : "",
      selectedPkg: typeof d.selectedPkg === "string" ? d.selectedPkg : "",
      step: d.step === 2 ? 2 : 1,
      termsAgreed: Boolean(d.termsAgreed),
    };
  } catch {
    return null;
  }
}

export function clearPendingOrderDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_ORDER_KEY);
}
