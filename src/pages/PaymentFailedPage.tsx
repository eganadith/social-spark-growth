import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const REASON_COPY: Record<string, string> = {
  cancel: "Checkout was cancelled before payment completed.",
  failed: "The payment did not go through. You can try again with the same or a different method.",
};

export default function PaymentFailedPage() {
  const [params] = useSearchParams();
  const reason = (params.get("reason") ?? "failed").toLowerCase();
  const copy = REASON_COPY[reason] ?? REASON_COPY.failed;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 pt-24 pb-16">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-card/80 backdrop-blur-xl p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-2">Payment not completed</h1>
        <p className="text-sm text-muted-foreground mb-6">{copy}</p>
        <div className="flex flex-col gap-2">
          <Button asChild variant="hero" className="rounded-xl w-full">
            <Link to="/order">Back to checkout</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl w-full">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
