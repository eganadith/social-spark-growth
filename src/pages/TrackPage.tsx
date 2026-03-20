import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { findOrder, type Order } from "@/lib/store";
import { Search, Package, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const statusConfig = {
  pending: { label: "Pending", color: "text-amber-500", icon: Clock, progress: 15 },
  processing: { label: "Processing", color: "text-primary", icon: Package, progress: 55 },
  completed: { label: "Completed", color: "text-accent", icon: CheckCircle2, progress: 100 },
};

export default function TrackPage() {
  const [params] = useSearchParams();
  const [trackingId, setTrackingId] = useState(params.get("id") || "");
  const [order, setOrder] = useState<Order | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (params.get("id")) handleSearch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch() {
    const found = findOrder(trackingId.trim());
    setOrder(found || null);
    setSearched(true);
  }

  const config = order ? statusConfig[order.status] : null;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-lg">
        <div className="text-center mb-8 opacity-0 animate-fade-in-up">
          <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
          <p className="text-muted-foreground text-sm">Enter your tracking ID to check order status</p>
        </div>

        <div
          className="rounded-2xl bg-card border border-border p-6 shadow-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex gap-2 mb-6">
            <div className="flex-1 flex items-center rounded-lg border border-input bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="SL-XXXXXX"
                className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none"
              />
            </div>
            <Button variant="hero" onClick={handleSearch}>
              Track
            </Button>
          </div>

          {searched && !order && (
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No order found for this tracking ID. Please check and try again.
              </p>
            </div>
          )}

          {order && config && (
            <div className="space-y-5">
              {/* Status */}
              <div className="text-center py-4">
                <config.icon className={`h-12 w-12 mx-auto mb-3 ${config.color}`} />
                <div className={`text-lg font-bold ${config.color}`}>{config.label}</div>
                <div className="text-xs text-muted-foreground mt-1">Tracking ID: {order.trackingId}</div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full gradient-bg rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${config.progress}%` }}
                />
              </div>

              {/* Details */}
              <div className="rounded-lg bg-muted p-4 space-y-3">
                {[
                  { label: "Platform", value: order.platform },
                  { label: "Package", value: order.packageName },
                  { label: "Price", value: `$${order.price}` },
                  { label: "Profile", value: order.profileLink },
                  { label: "Ordered", value: new Date(order.createdAt).toLocaleDateString() },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium text-right truncate ml-4 max-w-[200px] capitalize">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
