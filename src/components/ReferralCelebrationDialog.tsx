import { Link } from "react-router-dom";
import { PartyPopper, Copy, Check } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const STORAGE_PREFIX = "socioly_ref_celebration_shown";

export function markReferralPromptShown(trackingId: string) {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}_${trackingId}`, "1");
  } catch {
    /* ignore */
  }
}

export function shouldShowReferralPrompt(trackingId: string): boolean {
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}_${trackingId}`) !== "1";
  } catch {
    return true;
  }
}

export default function ReferralCelebrationDialog({ open, onOpenChange }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const path = `${window.location.origin}/dashboard`;
    await navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-white/10 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg">
            <PartyPopper className="h-7 w-7 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">Invite friends & earn FREE likes!</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            You&apos;re in. Share Socioly — when friends purchase, you unlock bonus like codes (up to 10,000 free likes
            at milestones). Open your dashboard to copy your personal referral link.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button asChild variant="hero" className="min-h-12 rounded-xl w-full">
            <Link to="/dashboard" onClick={() => onOpenChange(false)}>
              Open dashboard
            </Link>
          </Button>
          <Button type="button" variant="outline" className="min-h-12 rounded-xl gap-2" onClick={() => void copyLink()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy dashboard URL"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
