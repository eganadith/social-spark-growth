import { Copy, Check } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DbReward } from "@/types/database";

type Props = {
  reward: DbReward | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function RewardModal({ reward, open, onOpenChange }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!reward?.code) return;
    await navigator.clipboard.writeText(reward.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reward unlocked</DialogTitle>
          <DialogDescription>
            Redeem your free likes with our team — share this code with support when you&apos;re ready.
          </DialogDescription>
        </DialogHeader>
        {reward && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Code</div>
              <div className="font-mono text-lg font-bold tracking-wide">{reward.code}</div>
              {reward.amount != null && (
                <div className="text-sm text-muted-foreground mt-2">{reward.amount} bonus {reward.type}</div>
              )}
            </div>
            <Button type="button" variant="secondary" className="w-full gap-2" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy code"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
