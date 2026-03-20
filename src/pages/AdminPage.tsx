import { useState, useEffect } from "react";
import { getOrders, updateOrderStatus, type Order } from "@/lib/store";
import { BarChart3, DollarSign, Package, Clock } from "lucide-react";

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(getOrders());
  }, []);

  const totalRevenue = orders.reduce((s, o) => s + o.price, 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  function handleStatusChange(trackingId: string, status: Order["status"]) {
    const progress = status === "pending" ? 15 : status === "processing" ? 55 : 100;
    updateOrderStatus(trackingId, status, progress);
    setOrders(getOrders());
  }

  const stats = [
    { icon: Package, label: "Total Orders", value: orders.length.toString() },
    { icon: DollarSign, label: "Revenue", value: `$${totalRevenue.toFixed(2)}` },
    { icon: Clock, label: "Pending", value: pendingCount.toString() },
    { icon: BarChart3, label: "Completed", value: orders.filter((o) => o.status === "completed").length.toString() },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 opacity-0 animate-fade-in-up">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="rounded-xl bg-card border border-border p-5 shadow-card opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-xl font-bold">{s.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Orders table */}
        <div
          className="rounded-xl bg-card border border-border shadow-card overflow-hidden opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Orders</h2>
          </div>
          {orders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No orders yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    {["Tracking ID", "Email", "Platform", "Package", "Price", "Payment", "Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.trackingId} className="border-t border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{o.trackingId}</td>
                      <td className="px-4 py-3 truncate max-w-[160px]">{o.email}</td>
                      <td className="px-4 py-3 capitalize">{o.platform}</td>
                      <td className="px-4 py-3">{o.packageName}</td>
                      <td className="px-4 py-3 font-medium">${o.price}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status}
                          onChange={(e) => handleStatusChange(o.trackingId, e.target.value as Order["status"])}
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
