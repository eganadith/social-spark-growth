import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, XCircle } from "lucide-react";

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export default function PaymentCancelPage() {
  const [params] = useSearchParams();
  const orderId = params.get("order_id")?.trim() ?? "";
  const hasOrder = orderId && isUuid(orderId);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-8 text-center space-y-6">
        <XCircle className="h-12 w-12 text-muted-foreground mx-auto" />
        <div>
          <h1 className="text-2xl font-bold mb-2">Payment cancelled</h1>
          <p className="text-sm text-muted-foreground">
            No charge was made. Your order is still saved as pending — you can complete payment anytime from your
            dashboard{hasOrder ? " or by returning to checkout" : ""}.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild variant="hero" className="w-full">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/order">Back to order</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
