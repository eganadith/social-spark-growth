export type Platform = "instagram" | "facebook" | "tiktok";

export type DbPackage = {
  id: string;
  platform: Platform;
  name: string | null;
  followers: number | null;
  price: number;
  popular: boolean;
  premium: boolean;
};

export type OrderStatus = "pending" | "paid" | "failed" | "processing" | "completed";

export type DbOrderRow = {
  id: string;
  user_id: string;
  package_id: string;
  amount: number;
  status: OrderStatus;
  progress: number;
  payment_id: string | null;
  tracking_id: string;
  profile_link: string;
  email: string | null;
  created_at: string;
  idempotency_key?: string | null;
  checkout_redirect_url?: string | null;
  /** Package platform snapshot (instagram | facebook | tiktok). */
  service_type?: string | null;
  paid_at?: string | null;
  payment_verified_at?: string | null;
  /** When set, UI shows 72h fulfillment countdown until this instant. */
  fulfillment_deadline_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

/** Public track RPC returns only non-sensitive fields (see migration `get_order_by_tracking`). */
export type TrackOrderPayload = {
  tracking_id: string;
  status: OrderStatus;
  progress: number;
  created_at: string;
};

/** Stored on `profiles.role`; customers are `user`. */
export type ProfileStaffRole = "user" | "admin" | "super_admin";

export type DbProfile = {
  id: string;
  email: string;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  role: ProfileStaffRole;
};

export type DbReward = {
  id: string;
  user_id: string;
  type: string;
  amount: number | null;
  code: string;
  is_used: boolean;
  created_at: string;
};
