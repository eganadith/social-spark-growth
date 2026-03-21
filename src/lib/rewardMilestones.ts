/** Mirrors Edge Function rewards — free likes unlocked per paid referral count. */
export const REWARD_MILESTONES = [
  { referrals: 1, code: "FREE1000", likes: 1000 },
  { referrals: 3, code: "FREE3000", likes: 3000 },
  { referrals: 5, code: "FREE5000", likes: 5000 },
  { referrals: 10, code: "FREE10000", likes: 10000 },
] as const;
