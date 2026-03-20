export interface Package {
  id: string;
  platform: "instagram" | "tiktok" | "youtube";
  name: string;
  quantity: string;
  type: string;
  price: number;
  deliveryTime: string;
  features: string[];
  popular?: boolean;
}

export interface Order {
  id: string;
  trackingId: string;
  email: string;
  platform: string;
  profileLink: string;
  packageName: string;
  price: number;
  status: "pending" | "processing" | "completed";
  progress: number;
  createdAt: string;
  paymentStatus: "paid" | "pending";
}

export const packages: Package[] = [
  {
    id: "ig-500",
    platform: "instagram",
    name: "Starter",
    quantity: "500",
    type: "Followers",
    price: 4.99,
    deliveryTime: "1-2 days",
    features: ["Real accounts", "No password needed", "Safe & secure", "Gradual delivery"],
  },
  {
    id: "ig-1000",
    platform: "instagram",
    name: "Growth",
    quantity: "1,000",
    type: "Followers",
    price: 8.99,
    deliveryTime: "2-3 days",
    features: ["Real accounts", "No password needed", "Safe & secure", "24/7 support"],
    popular: true,
  },
  {
    id: "ig-5000",
    platform: "instagram",
    name: "Pro",
    quantity: "5,000",
    type: "Followers",
    price: 34.99,
    deliveryTime: "3-5 days",
    features: ["Premium accounts", "No password needed", "Safe & secure", "Priority delivery"],
  },
  {
    id: "tt-1000",
    platform: "tiktok",
    name: "Starter",
    quantity: "1,000",
    type: "Views",
    price: 2.99,
    deliveryTime: "1-2 days",
    features: ["Real views", "No password needed", "Safe & secure", "Fast delivery"],
  },
  {
    id: "tt-5000",
    platform: "tiktok",
    name: "Viral",
    quantity: "5,000",
    type: "Views",
    price: 9.99,
    deliveryTime: "2-3 days",
    features: ["Real views", "No password needed", "Safe & secure", "24/7 support"],
    popular: true,
  },
  {
    id: "yt-1000",
    platform: "youtube",
    name: "Starter",
    quantity: "1,000",
    type: "Views",
    price: 5.99,
    deliveryTime: "2-3 days",
    features: ["Real views", "No password needed", "Safe & secure", "Gradual delivery"],
  },
  {
    id: "yt-5000",
    platform: "youtube",
    name: "Boost",
    quantity: "5,000",
    type: "Views",
    price: 19.99,
    deliveryTime: "3-5 days",
    features: ["Real views", "No password needed", "Safe & secure", "Priority delivery"],
    popular: true,
  },
];

const ORDERS_KEY = "sociallanka_orders";

export function getOrders(): Order[] {
  const raw = localStorage.getItem(ORDERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveOrder(order: Order) {
  const orders = getOrders();
  orders.push(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function updateOrderStatus(trackingId: string, status: Order["status"], progress: number) {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.trackingId === trackingId);
  if (idx !== -1) {
    orders[idx].status = status;
    orders[idx].progress = progress;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }
}

export function findOrder(trackingId: string): Order | undefined {
  return getOrders().find((o) => o.trackingId === trackingId);
}

export function generateTrackingId(): string {
  return "SL-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function validateSocialUrl(url: string): { valid: boolean; platform?: string; username?: string } {
  const patterns: { platform: string; regex: RegExp }[] = [
    { platform: "instagram", regex: /(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/ },
    { platform: "tiktok", regex: /tiktok\.com\/@?([a-zA-Z0-9_.]+)/ },
    { platform: "youtube", regex: /(?:youtube\.com|youtu\.be)\/(?:@|channel\/|c\/)?([a-zA-Z0-9_-]+)/ },
  ];
  for (const p of patterns) {
    const match = url.match(p.regex);
    if (match) return { valid: true, platform: p.platform, username: match[1] };
  }
  return { valid: false };
}
