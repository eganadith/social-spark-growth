import type { DbPackage, Platform } from "@/types/database";

/** Validate social profile URLs for Instagram, Facebook, and TikTok. */
export function validateSocialUrl(url: string): { valid: boolean; platform?: Platform; username?: string } {
  const patterns: { platform: Platform; regex: RegExp }[] = [
    { platform: "instagram", regex: /(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/ },
    { platform: "facebook", regex: /(?:facebook\.com|fb\.com)\/(?:profile\.php\?id=)?(?:people\/)?([a-zA-Z0-9._-]+)/ },
    { platform: "tiktok", regex: /tiktok\.com\/@?([a-zA-Z0-9_.]+)/ },
  ];
  for (const p of patterns) {
    const match = url.match(p.regex);
    if (match) return { valid: true, platform: p.platform, username: match[1] };
  }
  return { valid: false };
}

/** Package hero line: 2000 → "2K", 100000 → "100K" */
export function formatFollowersShort(count: number): string {
  if (!Number.isFinite(count) || count < 0) return "—";
  if (count < 1000) return count.toLocaleString();
  const k = count / 1000;
  const rounded = Number.isInteger(k) ? k : Math.round(k * 10) / 10;
  const base = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, "");
  return `${base}K`;
}

/** Canonical catalog item (marketing + checkout routing via `id` in /order?pkg=). */
export type StorePackage = {
  id: string;
  platform: Platform;
  name: string;
  followers: number;
  price: number;
  popular: boolean;
  premium: boolean;
};

/**
 * Full Socioly package catalog — same AED tiers per platform, unique names.
 * `id` is stable for URLs; OrderPage resolves to the DB row by platform + followers.
 */
export const PACKAGES: StorePackage[] = [
  // Instagram
  {
    id: "instagram-starter-boost",
    platform: "instagram",
    name: "Starter Boost",
    followers: 2000,
    price: 10,
    popular: false,
    premium: false,
  },
  {
    id: "instagram-growth-pack",
    platform: "instagram",
    name: "Growth Pack",
    followers: 5000,
    price: 199,
    popular: false,
    premium: false,
  },
  {
    id: "instagram-influencer-pack",
    platform: "instagram",
    name: "Influencer Pack",
    followers: 10000,
    price: 499,
    popular: true,
    premium: false,
  },
  {
    id: "instagram-viral-boost",
    platform: "instagram",
    name: "Viral Boost",
    followers: 50000,
    price: 2399,
    popular: false,
    premium: false,
  },
  {
    id: "instagram-celebrity-pack",
    platform: "instagram",
    name: "Celebrity Pack",
    followers: 100000,
    price: 4699,
    popular: false,
    premium: true,
  },
  // Facebook
  {
    id: "facebook-starter-boost",
    platform: "facebook",
    name: "Starter Boost",
    followers: 2000,
    price: 99,
    popular: false,
    premium: false,
  },
  {
    id: "facebook-growth-pack",
    platform: "facebook",
    name: "Growth Pack",
    followers: 5000,
    price: 199,
    popular: false,
    premium: false,
  },
  {
    id: "facebook-page-growth-pro",
    platform: "facebook",
    name: "Page Growth Pro",
    followers: 10000,
    price: 499,
    popular: true,
    premium: false,
  },
  {
    id: "facebook-viral-reach",
    platform: "facebook",
    name: "Viral Reach",
    followers: 50000,
    price: 2399,
    popular: false,
    premium: false,
  },
  {
    id: "facebook-authority-page",
    platform: "facebook",
    name: "Authority Page",
    followers: 100000,
    price: 4699,
    popular: false,
    premium: true,
  },
  // TikTok
  {
    id: "tiktok-starter-boost",
    platform: "tiktok",
    name: "Starter Boost",
    followers: 2000,
    price: 99,
    popular: false,
    premium: false,
  },
  {
    id: "tiktok-growth-pack",
    platform: "tiktok",
    name: "Growth Pack",
    followers: 5000,
    price: 199,
    popular: false,
    premium: false,
  },
  {
    id: "tiktok-creator-pack",
    platform: "tiktok",
    name: "Creator Pack",
    followers: 10000,
    price: 499,
    popular: true,
    premium: false,
  },
  {
    id: "tiktok-viral-push",
    platform: "tiktok",
    name: "Viral Push",
    followers: 50000,
    price: 2399,
    popular: false,
    premium: false,
  },
  {
    id: "tiktok-trending-star",
    platform: "tiktok",
    name: "Trending Star",
    followers: 100000,
    price: 4699,
    popular: false,
    premium: true,
  },
];

export function getPackagesByPlatform(platform: Platform): StorePackage[] {
  return PACKAGES.filter((p) => p.platform === platform);
}

export function findStorePackageById(id: string): StorePackage | undefined {
  return PACKAGES.find((p) => p.id === id);
}

/** Match DB row to catalog (platform + follower tier). */
export function findStorePackageForRow(row: Pick<DbPackage, "platform" | "followers">): StorePackage | undefined {
  return PACKAGES.find((p) => p.platform === row.platform && p.followers === row.followers);
}

/** UI + checkout: DB uuid when linked to Supabase; catalog fields for display & fallback. */
export type DisplayPackage = {
  orderParam: string;
  id: string;
  platform: Platform;
  name: string;
  followers: number;
  price: number;
  popular: boolean;
  premium: boolean;
};

export function toDisplayPackagesFromDb(rows: DbPackage[]): DisplayPackage[] {
  return rows.map((row) => {
    const cat = findStorePackageForRow(row);
    return {
      /** Stable catalog slug in URLs when known; falls back to DB uuid. */
      orderParam: cat?.id ?? row.id,
      id: row.id,
      platform: row.platform,
      name: cat?.name ?? row.name ?? "Package",
      followers: row.followers ?? cat?.followers ?? 0,
      price: Number(row.price),
      popular: cat?.popular ?? row.popular,
      premium: cat?.premium ?? row.premium,
    };
  });
}

export function toDisplayPackagesFromStore(platform: Platform): DisplayPackage[] {
  return getPackagesByPlatform(platform).map((p) => ({
    orderParam: p.id,
    id: p.id,
    platform: p.platform,
    name: p.name,
    followers: p.followers,
    price: p.price,
    popular: p.popular,
    premium: p.premium,
  }));
}
