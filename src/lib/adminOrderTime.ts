import type { OrderStatus } from "@/types/database";

const SLA_MS = 72 * 60 * 60 * 1000;

/** 72h SLA from order `created_at`; "Completed" if status is completed or SLA elapsed. */
export function getAdminOrderTimeRemaining(createdAt: string, status: OrderStatus, nowMs: number): string {
  if (status === "completed") return "Completed";

  const orderedTime = new Date(createdAt).getTime();
  if (Number.isNaN(orderedTime)) return "—";

  const completionTime = orderedTime + SLA_MS;
  const remainingMs = completionTime - nowMs;

  if (remainingMs <= 0) return "Completed";

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  return `${hours}h ${minutes}m ${seconds}s`;
}
